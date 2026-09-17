function cleanText(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&agrave;/g, "à")
    .replace(/&Agrave;/g, "À")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&egrave;/g, "è")
    .replace(/&Egrave;/g, "È")
    .replace(/&ecirc;/g, "ê")
    .replace(/&Ecirc;/g, "Ê")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/\s+/g, " ")
    .trim();
}

function fixEncoding(value = "") {
  const replacements = [
    ["Ã€", "À"],
    ["Ã‚", "Â"],
    ["Ã‡", "Ç"],
    ["Ãˆ", "È"],
    ["Ã‰", "É"],
    ["ÃŠ", "Ê"],
    ["Ã‹", "Ë"],
    ["ÃŽ", "Î"],
    ["Ã”", "Ô"],
    ["Ã™", "Ù"],
    ["Ã›", "Û"],
    ["Ãœ", "Ü"],
    ["Ã¡", "á"],
    ["Ã¢", "â"],
    ["Ã§", "ç"],
    ["Ã¨", "è"],
    ["Ã©", "é"],
    ["Ãª", "ê"],
    ["Ã«", "ë"],
    ["Ã®", "î"],
    ["Ã¯", "ï"],
    ["Ã´", "ô"],
    ["Ã¹", "ù"],
    ["Ã»", "û"],
    ["Ã¼", "ü"]
  ];

  let result = value;

  for (const [wrong, correct] of replacements) {
    result = result.split(wrong).join(correct);
  }

  return result;
}

function decodeText(value = "") {
  return fixEncoding(cleanText(value));
}

function getMovement(position, lastWeek) {
  if (lastWeek === null) {
    return {
      change: null,
      direction: "NEW",
      label: "NEW"
    };
  }

  const change = lastWeek - position;

  if (change > 0) {
    return {
      change,
      direction: "UP",
      label: `+${change}`
    };
  }

  if (change < 0) {
    return {
      change,
      direction: "DOWN",
      label: String(change)
    };
  }

  return {
    change: 0,
    direction: "SAME",
    label: "0"
  };
}

export default async () => {
  try {
    const url =
      "https://www.officialcharts.com/charts/french-singles-chart/";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 KINA-RADAR/9.1",
        "Accept": "text/html"
      }
    });

    if (!response.ok) {
      throw new Error(
        `French chart HTTP ${response.status}`
      );
    }

    const html = await response.text();

    const pieces = html.split(
      /<div[^>]*class="[^"]*\bchart-item\b[^"]*"[^>]*>/i
    );

    const tracks = [];

    for (let i = 1; i < pieces.length; i++) {
      if (tracks.length >= 20) {
        break;
      }

      const block = pieces[i];

      const titleMatch = block.match(
        /class="[^"]*\bchart-name\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i
      );

      const artistMatch = block.match(
        /class="[^"]*\bchart-artist\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i
      );

      if (!titleMatch || !artistMatch) {
        continue;
      }

      const lwMatch = block.match(
        /title="Last week"[\s\S]*?LW:[\s\S]*?<span[^>]*>(\d+)<\/span>/i
      );

      const peakMatch = block.match(
        /class="[^"]*\bpeak\b[^"]*"[\s\S]*?Peak:[\s\S]*?<span[^>]*>(\d+)<\/span>/i
      );

      const weeksMatch = block.match(
        /class="[^"]*\bweeks\b[^"]*"[\s\S]*?Weeks:[\s\S]*?<span[^>]*>(\d+)<\/span>/i
      );

      const position = tracks.length + 1;

      const lastWeek = lwMatch
        ? Number(lwMatch[1])
        : null;

      const peak = peakMatch
        ? Number(peakMatch[1])
        : null;

      const weeks = weeksMatch
        ? Number(weeksMatch[1])
        : null;

      const movement = getMovement(
        position,
        lastWeek
      );

      tracks.push({
        position,
        title: decodeText(titleMatch[1]),
        artist: decodeText(artistMatch[1]),
        lastWeek,
        peak,
        weeks,
        change: movement.change,
        direction: movement.direction,
        movement: movement.label
      });
    }

    return Response.json(
      {
        version: "9.1",
        country: "FR",
        source: "Official Charts / French Singles",
        fetchedAt: new Date().toISOString(),
        success: true,
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
        version: "9.1",
        country: "FR",
        success: false,
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
