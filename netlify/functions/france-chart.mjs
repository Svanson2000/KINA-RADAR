function text(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstNumber(value) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function movement(position, lastWeek) {
  if (!lastWeek) {
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

    /*
      Splits de HTML op iedere echte chart-item.
      De eerste split bevat de pagina vóór de chart.
    */
    const pieces = html.split(
      /<div[^>]*class="[^"]*\bchart-item\b[^"]*"[^>]*>/i
    );

    const tracks = [];

    for (let i = 1; i < pieces.length; i++) {
      if (tracks.length >= 20) break;

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

      /*
        Zoek de positie dicht bij het begin
        van het chart-item.
      */
const beginning = block.slice(0, 2500);
console.log("KINA POSITION DEBUG", tracks.length + 1, beginning.slice(0, 1200));
      
      const positionPatterns = [
        /class="[^"]*\bposition\b[^"]*"[^>]*>[\s\S]*?(\d{1,3})/i,
        /class="[^"]*\bposition-number\b[^"]*"[^>]*>[\s\S]*?(\d{1,3})/i,
        /aria-label="Position[^0-9]*(\d{1,3})/i
      ];

      let position = null;

      for (const pattern of positionPatterns) {
        const match = beginning.match(pattern);

        if (match) {
          position = firstNumber(match[1]);
          break;
        }
      }

      /*
        Als de positie niet uit de HTML-class komt,
        gebruiken we de volgorde van de chart-items.
      */
      if (!position) {
        position = tracks.length + 1;
      }

      const lastWeek =
        lwMatch ? Number(lwMatch[1]) : null;

      const peak =
        peakMatch ? Number(peakMatch[1]) : null;

      const weeks =
        weeksMatch ? Number(weeksMatch[1]) : null;

      const move = movement(position, lastWeek);

      tracks.push({
        position,
        title: text(titleMatch[1]),
        artist: text(artistMatch[1]),
        lastWeek,
        peak,
        weeks,
        change: move.change,
        direction: move.direction,
        movement: move.label
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
