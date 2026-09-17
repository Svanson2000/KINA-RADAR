const MARKETS = ["BE", "NL", "FR"];

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error("Spotify credentials ontbreken");
  }

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!r.ok) {
    throw new Error(`Spotify token fout: ${r.status}`);
  }

  return (await r.json()).access_token;
}

async function searchMarket(token, market) {
  const queries = [
    "year:2026",
    "tag:new"
  ];

  const results = [];

  for (const q of queries) {
    const url =
      "https://api.spotify.com/v1/search?" +
      new URLSearchParams({
        q,
        type: "track",
        market,
        limit: "10"
      });

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!r.ok) continue;

    const data = await r.json();

    for (const t of data.tracks?.items || []) {
      results.push({
        id: t.id,
        title: t.name,
        artist: (t.artists || []).map(a => a.name).join(" x "),
        country: market,
        spotifyUrl: t.external_urls?.spotify || null,
        image: t.album?.images?.[0]?.url || null,
        releaseDate: t.album?.release_date || null
      });
    }
  }

  return results;
}

export default async () => {
  try {
    const token = await getSpotifyToken();

    const marketResults = await Promise.all(
      MARKETS.map(m => searchMarket(token, m))
    );

    const combined = new Map();

    for (const tracks of marketResults) {
      for (const track of tracks) {
        if (!track.id) continue;

        if (!combined.has(track.id)) {
          combined.set(track.id, {
            ...track,
            countries: [track.country],
            appearances: 1
          });
        } else {
          const old = combined.get(track.id);

          if (!old.countries.includes(track.country)) {
            old.countries.push(track.country);
            old.appearances++;
          }
        }
      }
    }

    const tracks = [...combined.values()]
      .map(t => ({
        title: t.title,
        artist: t.artist,
        countries: t.countries,
        chart: Math.min(100, 55 + t.appearances * 15),
        momentum: t.appearances * 5,
        score: Math.min(100, 60 + t.appearances * 10),
        spotifyUrl: t.spotifyUrl,
        image: t.image,
        releaseDate: t.releaseDate
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    return Response.json(
      {
        updated: new Date().toISOString(),
        source: "Spotify live search",
        tracks
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
        error: error.message,
        tracks: []
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
