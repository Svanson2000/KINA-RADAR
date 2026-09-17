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
  const url =
    "https://api.spotify.com/v1/search?" +
    new URLSearchParams({
      q: query,
      type: "track",
      market,
      limit: "10",
      offset: String(offset)
    });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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

    if (!data.success || !Array.isArray(data.tracks)) {
      return [];
    }

    return data.tracks;
  } catch {
    return [];
  }
}

function find      market,
      limit: "10",
      offset: String(offset)
    });

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!r.ok) return [];

  const data = await r.json();
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

      for (const t of items) {
        if (!t?.id) continue;

        found.push({
          id: t.id,
          title: t.name,
          artist: (t.artists || [])
            .map(a => a.name)
            .join(" x "),
          country: market,
          spotifyUrl: t.external_urls?.spotify || null,
          image: t.album?.images?.[0]?.url || null,
          releaseDate: t.album?.release_date || null
        });
      }
    }
  }

  return found;
}

function daysOld(date) {
  if (!date) return 9999;

  const released = new Date(date);
  const now = new Date();

  const difference = now - released;

  return Math.max(
    0,
    Math.floor(difference / 86400000)
  );
}

function calculateScore(track) {
  const age = daysOld(track.releaseDate);

  let freshness = 0;

  if (age <= 14) freshness = 30;
  else if (age <= 30) freshness = 25;
  else if (age <= 60) freshness = 20;
  else if (age <= 120) freshness = 15;
  else if (age <= 365) freshness = 8;

  const marketScore =
    Math.min(3, track.countries.length) * 15;

  const discoveryScore =
    Math.min(20, track.appearances * 4);

  return Math.min(
    100,
    25 +
      freshness +
      marketScore +
      discoveryScore
  );
}

function classifyTrack(track) {
  const age = daysOld(track.releaseDate);

  if (track.score >= 85 && age <= 60) {
    return "HOT NOW";
  }

  if (
    track.score >= 70 &&
    age <= 120
  ) {
    return "BREAKOUT";
  }

  return "RADAR";
}

export default async () => {
  try {
    const token = await getSpotifyToken();

    const results = await Promise.all(
      MARKETS.map(market =>
        searchMarket(token, market)
      )
    );

    const combined = new Map();

    for (const marketTracks of results) {
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

          if (
            !existing.countries.includes(
              track.country
            )
          ) {
            existing.countries.push(
              track.country
            );
          }
        }
      }
    }

    let tracks = [...combined.values()];

    tracks = tracks
      .map(track => {
        const score = calculateScore(track);

        const enriched = {
          ...track,
          score
        };

        return {
          ...enriched,
          category: classifyTrack(enriched),

          chart: Math.min(
            100,
            50 +
              enriched.countries.length * 10 +
              enriched.appearances * 2
          ),

          momentum: Math.min(
            100,
            enriched.appearances * 5
          )
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          new Date(b.releaseDate || 0) -
          new Date(a.releaseDate || 0)
        );
      })
      .slice(0, 50);

    const hotNow = tracks.filter(
      t => t.category === "HOT NOW"
    );

    const breakout = tracks.filter(
      t => t.category === "BREAKOUT"
    );

    return Response.json(
      {
        version: "9.0",
        updated: new Date().toISOString(),

        source:
          "Spotify live catalogue discovery",

        disclaimer:
          "KINA Score is een eigen discovery-score en geen officiële Spotify-hitlijst.",

        stats: {
          candidates: combined.size,
          tracks: tracks.length,
          hotNow: hotNow.length,
          breakout: breakout.length
        },

        tracks,
        hotNow,
        breakout
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  } catch (error) {
    return Response.json(
      {
        version: "9.0",
        error: error.message,
        tracks: [],
        hotNow: [],
        breakout: []
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }
};
