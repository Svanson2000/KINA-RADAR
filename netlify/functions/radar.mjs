const MARKETS = ["BE", "NL", "FR"];
const CURRENT_YEAR = new Date().getUTCFullYear();

function normalize(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error("Spotify credentials ontbreken");
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    throw new Error(`Spotify token fout: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function spotifySearch(token, market, query, offset) {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    market,
    limit: "10",
    offset: String(offset)
  });

  const response = await fetch(
    `https://api.spotify.com/v1/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  return data.tracks?.items || [];
}

async function searchMarket(token, market) {
  const queries = [
    `year:${CURRENT_YEAR}`,
    `year:${CURRENT_YEAR - 1}`,
    "tag:new"
  ];

  const offsets = [0, 10, 20];
  const found = [];

  for (const query of queries) {
    for (const offset of offsets) {
      const items = await spotifySearch(
        token,
        market,
        query,
        offset
      );

      for (const item of items) {
        if (!item?.id) continue;

        found.push({
          id: item.id,
          title: item.name,
          artist: (item.artists || [])
            .map(a => a.name)
            .join(", "),
          country: market,
          spotifyUrl: item.external_urls?.spotify || null,
          image: item.album?.images?.[0]?.url || null,
          releaseDate: item.album?.release_date || null
        });
      }
    }
  }

  return found;
}

async function getFranceChart(origin) {
  try {
    const response = await fetch(
      `${origin}/.netlify/functions/france-chart`
    );

    if (!response.ok) return [];

    const data = await response.json();

    return Array.isArray(data.tracks)
      ? data.tracks
      : [];
  } catch {
    return [];
  }
}

function findFranceMatch(track, chart) {
  const title = normalize(track.title);
  const artist = normalize(track.artist);

  return chart.find(item => {
    const chartTitle = normalize(item.title);
    const chartArtist = normalize(item.artist);

    const titleMatch =
      title === chartTitle ||
      title.includes(chartTitle) ||
      chartTitle.includes(title);

    const artistMatch =
      artist.includes(chartArtist) ||
      chartArtist.includes(artist);

    return titleMatch && artistMatch;
  }) || null;
}

function daysOld(date) {
  if (!date) return 9999;

  return Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(date).getTime()) / 86400000
    )
  );
}

function calculateScore(track, france) {
  const age = daysOld(track.releaseDate);
  let score = 25;

  if (age <= 14) score += 30;
  else if (age <= 30) score += 25;
  else if (age <= 60) score += 20;
  else if (age <= 120) score += 15;
  else if (age <= 365) score += 8;

  score += Math.min(45, track.countries.length * 15);
  score += Math.min(20, track.appearances * 4);

  if (france) {
    score += 10;

    if (france.position <= 5) score += 10;
    else if (france.position <= 10) score += 7;
    else score += 4;

    if (france.change >= 10) score += 10;
    else if (france.change >= 5) score += 7;
    else if (france.change >= 2) score += 4;
    else if (france.change > 0) score += 2;
  }

  return Math.min(100, score);
}

function classify(track) {
  const age = daysOld(track.releaseDate);

  if (
    track.franceChange !== null &&
    track.franceChange >= 5
  ) {
    return "BREAKOUT";
  }

  if (track.score >= 85 && age <= 60) {
    return "HOT NOW";
  }

  if (track.score >= 70 && age <= 120) {
    return "BREAKOUT";
  }

  return "RADAR";
}

export default async request => {
  try {
    const token = await getSpotifyToken();
    const origin = new URL(request.url).origin;

    const [marketResults, franceChart] =
      await Promise.all([
        Promise.all(
          MARKETS.map(market =>
            searchMarket(token, market)
          )
        ),
        getFranceChart(origin)
      ]);

    const combined = new Map();

    for (const marketTracks of marketResults) {
      for (const track of marketTracks) {
        if (!combined.has(track.id)) {
          combined.set(track.id, {
            id: track.id,
            title: track.title,
            artist: track.artist,
            spotifyUrl: track.spotifyUrl,
            image: track.image,
            releaseDate: track.releaseDate,
            countries: [track.country],
            appearances: 1
          });
        } else {
          const existing = combined.get(track.id);

          existing.appearances++;

          if (!existing.countries.includes(track.country)) {
            existing.countries.push(track.country);
          }
        }
      }
    }

    let tracks = [...combined.values()].map(track => {
      const france = findFranceMatch(track, franceChart);
      const score = calculateScore(track, france);

      const enriched = {
        ...track,
        score,
        francePosition: france?.position ?? null,
        franceLastWeek: france?.lastWeek ?? null,
        franceChange: france?.change ?? null,
        franceDirection: france?.direction ?? null,
        franceMovement: france?.movement ?? null,
        francePeak: france?.peak ?? null,
        franceWeeks: france?.weeks ?? null
      };

      return {
        ...enriched,
        category: classify(enriched)
      };
    });

    tracks = tracks
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    const hotNow = tracks.filter(
      track => track.category === "HOT NOW"
    );

    const breakout = tracks.filter(
      track => track.category === "BREAKOUT"
    );

    return Response.json({
      version: "9.2",
      updated: new Date().toISOString(),

      source:
        "Spotify catalogue discovery + France chart",

      chartSources: {
        france: {
          active: franceChart.length > 0,
          tracksLoaded: franceChart.length
        }
      },

      stats: {
        candidates: combined.size,
        tracks: tracks.length,
        hotNow: hotNow.length,
        breakout: breakout.length
      },

      tracks,
      hotNow,
      breakout
    }, {
      headers: {
        "cache-control": "no-store"
      }
    });

  } catch (error) {
    return Response.json({
      version: "9.2",
      error: error.message,
      tracks: [],
      hotNow: [],
      breakout: []
    }, {
      status: 500,
      headers: {
        "cache-control": "no-store"
      }
    });
  }
};
