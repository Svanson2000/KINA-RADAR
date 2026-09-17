const MARKETS = ["BE", "NL", "FR"];
const CURRENT_YEAR = new Date().getFullYear();

function normalize(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify environment variables ontbreken");
  }

  const credentials = Buffer
    .from(`${clientId}:${clientSecret}`)
    .toString("base64");

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Spotify token error ${response.status}`
    );
  }

  const data = await response.json();

  return data.access_token;
}

async function spotifySearch(token, market, query, offset = 0) {
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

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return data.tracks?.items || [];
}

async function getFranceChart(origin) {
  try {
    const response = await fetch(
      `${origin}/.netlify/functions/france-chart`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.tracks)) {
      return [];
    }

    return data.tracks;
  } catch {
    return [];
  }
}

function findFranceMatch(track, franceChart) {
  const spotifyTitle = normalize(track.title);
  const spotifyArtist = normalize(track.artist);

  return franceChart.find(chartTrack => {
    const chartTitle = normalize(chartTrack.title);
    const chartArtist = normalize(chartTrack.artist);

    const titleMatch =
      spotifyTitle === chartTitle ||
      spotifyTitle.includes(chartTitle) ||
      chartTitle.includes(spotifyTitle);

    const artistMatch =
      spotifyArtist.includes(chartArtist) ||
      chartArtist.includes(spotifyArtist);

    return titleMatch && artistMatch;
  }) || null;
}

function calculateScore(track, franceMatch) {
  let score = 45;

  const releaseDate = new Date(track.releaseDate);
  const now = new Date();

  const ageDays = Math.max(
    0,
    Math.floor(
      (now - releaseDate) / (1000 * 60 * 60 * 24)
    )
  );

  // Release freshness
  if (ageDays <= 14) {
    score += 20;
  } else if (ageDays <= 30) {
    score += 16;
  } else if (ageDays <= 60) {
    score += 12;
  } else if (ageDays <= 120) {
    score += 7;
  }

  // Beschikbaar in meerdere markten
  if (track.countries.length === 3) {
    score += 10;
  } else if (track.countries.length === 2) {
    score += 6;
  } else {
    score += 2;
  }

  // Verschijnt vaker in onze Spotify discovery
  score += Math.min(track.appearances * 2, 10);

  // Echte Franse chart
  if (franceMatch) {
    score += 12;

    if (franceMatch.position <= 5) {
      score += 10;
    } else if (franceMatch.position <= 10) {
      score += 7;
    } else if (franceMatch.position <= 20) {
      score += 4;
    }

    // Momentum
    if (franceMatch.change >= 10) {
      score += 10;
    } else if (franceMatch.change >= 5) {
      score += 7;
    } else if (franceMatch.change >= 2) {
      score += 4;
    } else if (franceMatch.change > 0) {
      score += 2;
    }

    // Nieuwe charttrack
    if (franceMatch.direction === "NEW") {
      score += 6;
    }
  }

  return Math.min(100, Math.round(score));
}

function getCategory(score, releaseDate, franceMatch) {
  const ageDays = Math.max(
    0,
    Math.floor(
      (new Date() - new Date(releaseDate)) /
      (1000 * 60 * 60 * 24)
    )
  );

  if (
    franceMatch &&
    franceMatch.change >= 5
  ) {
    return "BREAKOUT";
  }

  if (score >= 85 && ageDays <= 60) {
    return "HOT NOW";
  }

  if (score >= 70 && ageDays <= 120) {
    return "BREAKOUT";
  }

  return "RADAR";
}

export default async request => {
  try {
    const token = await getSpotifyToken();

    const origin = new URL(request.url).origin;

    const franceChartPromise =
      getFranceChart(origin);

    const queries = [
      `year:${CURRENT_YEAR}`,
      `year:${CURRENT_YEAR - 1}`,
      "tag:new"
    ];

    const offsets = [0, 10, 20];

    const searches = [];

    for (const market of MARKETS) {
      for (const query of queries) {
        for (const offset of offsets) {
          searches.push(
            spotifySearch(
              token,
              market,
              query,
              offset
            ).then(items => ({
              market,
              items
            }))
          );
        }
      }
    }

    const [searchResults, franceChart] =
      await Promise.all([
        Promise.all(searches),
        franceChartPromise
      ]);

    const map = new Map();

    for (const result of searchResults) {
      for (const item of result.items) {
        if (!item?.id) {
          continue;
        }

        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            title: item.name,
            artist:
              item.artists
                ?.map(artist => artist.name)
                .join(", ") || "",
            countries: [],
            spotifyUrl:
              item.external_urls?.spotify || "",
            image:
              item.album?.images?.[0]?.url || "",
            releaseDate:
              item.album?.release_date || "",
            appearances: 0
          });
        }

        const track = map.get(item.id);

        track.appearances += 1;

        if (!track.countries.includes(result.market)) {
          track.countries.push(result.market);
        }
      }
    }

    let tracks = [...map.values()];

    tracks = tracks.map(track => {
      const franceMatch =
        findFranceMatch(track, franceChart);

      const score =
        calculateScore(track, franceMatch);

      const category =
        getCategory(
          score,
          track.releaseDate,
          franceMatch
        );

      return {
        ...track,

        kinaScore: score,
        category,

        chartSignals: {
          france: Boolean(franceMatch)
        },

        francePosition:
          franceMatch?.position ?? null,

        franceLastWeek:
          franceMatch?.lastWeek ?? null,

        franceChange:
          franceMatch?.change ?? null,

        franceDirection:
          franceMatch?.direction ?? null,

        franceMovement:
          franceMatch?.movement ?? null,

        francePeak:
          franceMatch?.peak ?? null,

        franceWeeks:
          franceMatch?.weeks ?? null
      };
    });

    tracks.sort((a, b) => {
      if (b.kinaScore !== a.kinaScore) {
        return b.kinaScore - a.kinaScore;
      }

      return (
        new Date(b.releaseDate) -
        new Date(a.releaseDate)
      );
    });

    tracks = tracks.slice(0, 50);

    return Response.json(
      {
        version: "9.2",
        source:
          "Spotify catalogue discovery + French chart signal",

        disclaimer:
          "KINA Score is an independent discovery score and is not an official Spotify or national chart ranking.",

        fetchedAt:
          new Date().toISOString(),

        chartSources: {
          france: {
            active: franceChart.length > 0,
            tracksLoaded: franceChart.length
          }
        },

        count: tracks.length,
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
        version: "9.2",
        success: false,
        error: error.message
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
