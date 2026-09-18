const MARKETS = ["BE", "NL", "FR"];
const CURRENT_YEAR = new Date().getUTCFullYear();
const CACHE_SECONDS = 1800;

function normalize(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function daysOld(date) {
  const time = Date.parse(date || "");
  if (!Number.isFinite(time)) return 9999;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify credentials ontbreken");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify token ${response.status}: ${body.slice(0, 160)}`);
  }
  return (await response.json()).access_token;
}

async function spotifySearch(token, market, query, limit = 20) {
  const params = new URLSearchParams({ q: query, type: "track", market, limit: String(limit) });
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const body = await response.text();
    return { items: [], error: `${market} ${query}: ${response.status} ${body.slice(0, 120)}` };
  }

  const data = await response.json();
  return { items: data.tracks?.items || [], error: null };
}

function spotifyTrack(item, market) {
  return {
    id: item.id,
    title: item.name,
    artist: (item.artists || []).map(a => a.name).join(", "),
    country: market,
    spotifyUrl: item.external_urls?.spotify || null,
    image: item.album?.images?.[0]?.url || null,
    releaseDate: item.album?.release_date || null
  };
}

async function searchMarket(token, market) {
  const result = await spotifySearch(token, market, `year:${CURRENT_YEAR}`, 20);
  return {
    found: result.items.filter(item => item?.id).map(item => spotifyTrack(item, market)),
    errors: result.error ? [result.error] : []
  };
}

async function getFranceChart(origin) {
  try {
    const response = await fetch(`${origin}/.netlify/functions/france-chart`);
    const data = await response.json();
    return {
      tracks: response.ok && data.success && Array.isArray(data.tracks) ? data.tracks : [],
      error: response.ok ? (data.error || null) : `France chart HTTP ${response.status}`
    };
  } catch (error) {
    return { tracks: [], error: error.message };
  }
}

async function addFranceSpotifyMatches(token, chart, combined, errors) {
  for (const item of chart.slice(0, 8)) {
    const query = `track:"${item.title}" artist:"${item.artist.split(",")[0]}"`;
    const result = await spotifySearch(token, "FR", query, 3);
    if (result.error) {
      errors.push(result.error);
      if (result.error.includes("429")) break;
      continue;
    }
    const match = result.items[0];
    if (!match?.id) continue;
    const track = spotifyTrack(match, "FR");
    const existing = combined.get(track.id);
    if (!existing) combined.set(track.id, { ...track, countries: ["FR"], appearances: 1 });
    else {
      existing.appearances += 1;
      if (!existing.countries.includes("FR")) existing.countries.push("FR");
    }
  }
}

function findFranceMatch(track, chart) {
  const title = normalize(track.title);
  const artist = normalize(track.artist);
  return chart.find(item => {
    const ct = normalize(item.title);
    const ca = normalize(item.artist);
    const titleMatch = title === ct || (ct.length > 4 && title.includes(ct)) || (title.length > 4 && ct.includes(title));
    const artistMatch = artist === ca || (ca.length > 3 && artist.includes(ca)) || (artist.length > 3 && ca.includes(artist));
    return titleMatch && artistMatch;
  }) || null;
}

function scoreTrack(track, france) {
  const age = daysOld(track.releaseDate);
  let score = 20;
  if (age <= 14) score += 22;
  else if (age <= 30) score += 18;
  else if (age <= 60) score += 14;
  else if (age <= 120) score += 9;
  else if (age <= 365) score += 4;

  score += Math.min(18, track.countries.length * 6);
  score += Math.min(12, track.appearances * 2);

  if (france) {
    score += france.position <= 5 ? 18 : france.position <= 10 ? 14 : 10;
    if (france.change >= 10) score += 10;
    else if (france.change >= 5) score += 7;
    else if (france.change >= 2) score += 4;
    else if (france.change > 0) score += 2;
  }
  return Math.min(100, Math.round(score));
}

function classify(track) {
  if (track.franceDirection === "NEW" || (track.franceChange ?? 0) >= 5) return "BREAKOUT";
  const age = daysOld(track.releaseDate);
  if (track.score >= 80 && age <= 60) return "HOT NOW";
  if (track.score >= 65 && age <= 120) return "BREAKOUT";
  return "RADAR";
}

export default async request => {
  try {
    const token = await getSpotifyToken();
    const origin = new URL(request.url).origin;
    const [marketResults, franceResult] = await Promise.all([
      Promise.all(MARKETS.map(market => searchMarket(token, market))),
      getFranceChart(origin)
    ]);

    const combined = new Map();
    const spotifyErrors = marketResults.flatMap(r => r.errors);

    for (const result of marketResults) {
      for (const track of result.found) {
        const existing = combined.get(track.id);
        if (!existing) combined.set(track.id, { ...track, countries: [track.country], appearances: 1 });
        else {
          existing.appearances += 1;
          if (!existing.countries.includes(track.country)) existing.countries.push(track.country);
        }
      }
    }

    if (!spotifyErrors.some(error => error.includes("429")) && franceResult.tracks.length) {
      await addFranceSpotifyMatches(token, franceResult.tracks, combined, spotifyErrors);
    }

    let tracks = [...combined.values()].map(track => {
      const france = findFranceMatch(track, franceResult.tracks);
      const enriched = {
        ...track,
        score: scoreTrack(track, france),
        francePosition: france?.position ?? null,
        franceLastWeek: france?.lastWeek ?? null,
        franceChange: france?.change ?? null,
        franceDirection: france?.direction ?? null,
        franceMovement: france?.movement ?? null,
        francePeak: france?.peak ?? null,
        franceWeeks: france?.weeks ?? null
      };
      return { ...enriched, category: classify(enriched) };
    });

    tracks.sort((a, b) => b.score - a.score || new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    tracks = tracks.slice(0, 50);
    const hotNow = tracks.filter(t => t.category === "HOT NOW");
    const breakout = tracks.filter(t => t.category === "BREAKOUT");

    return Response.json({
      version: "9.4",
      updated: new Date().toISOString(),
      source: "Spotify catalogue discovery + France chart",
      chartSources: { france: { active: franceResult.tracks.length > 0, tracksLoaded: franceResult.tracks.length, error: franceResult.error } },
      diagnostics: { spotifyErrors: spotifyErrors.slice(0, 8), spotifyCallsPlanned: "3 discovery + max 8 France matches" },
      stats: { candidates: combined.size, tracks: tracks.length, hotNow: hotNow.length, breakout: breakout.length },
      tracks, hotNow, breakout
    }, { headers: { "cache-control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600` } });
  } catch (error) {
    return Response.json({ version: "9.4", error: error.message, tracks: [], hotNow: [], breakout: [] }, {
      status: 500,
      headers: { "cache-control": "no-store" }
    });
  }
};
