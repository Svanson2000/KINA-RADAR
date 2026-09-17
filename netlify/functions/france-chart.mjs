function cleanText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function movement(position, lastWeek) {
  if (!lastWeek || lastWeek <= 0) {
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
      label: `${change}`
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
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      throw new Error(
        `French chart antwoordde met ${response.status}`
      );
    }

    const html = await response.text();

    /*
      Official Charts gebruikt JSON-LD / HTML-data
      op de chartpagina. We zoeken de zichtbare
      chart-items en lezen hun velden uit.
    */

    const tracks = [];

    const blocks = html.match(
      /<div[^>]+class="[^"]*(?:chart-item|chart-results-content)[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*(?:chart-item|chart-results-content)|$)/gi
    ) || [];

    for (const block of blocks) {
      if (tracks.length >= 20) break;

      const positionMatch =
        block.match(/(?:position|chart-position)[^>]*>\s*(\d{1,3})\s*</i) ||
        block.match(/Number\s*(\d{1,3})/i);

      const lastWeekMatch =
        block.match(/LW:\s*(\d{1,3}|-)/i);

      const peakMatch =
        block.match(/Peak:\s*(\d{1,3})/i);

      const weeksMatch =
        block.match(/Weeks:\s*(\d{1,3})/i);

      const titleMatch =
        block.match(
          /<(?:a|h2|h3)[^>]*(?:title|track|chart-name)[^>]*>([\s\S]*?)<\/(?:a|h2|h3)>/i
        );

      const artistMatch =
        block.match(
          /<(?:a|div|span|p)[^>]*(?:artist)[^>]*>([\s\S]*?)<\/(?:a|div|span|p)>/i
        );

      if (!positionMatch || !titleMatch) {
        continue;
      }

      const position = Number(positionMatch[1]);

      const lastWeek =
        lastWeekMatch &&
        lastWeekMatch[1] !== "-"
          ? Number(lastWeekMatch[1])
          : null;

      const peak =
        peakMatch ? Number(peakMatch[1]) : null;

      const weeks =
        weeksMatch ? Number(weeksMatch[1]) : null;

      const move = movement(position, lastWeek);

      tracks.push({
        position,
        lastWeek,
        change: move.change,
        direction: move.direction,
        movement: move.label,
        peak,
        weeks,
        title: cleanText(titleMatch[1]),
        artist: artistMatch
          ? cleanText(artistMatch[1])
          : ""
      });
    }

    return Response.json(
      {
        version: "9.1",
        country: "FR",
        source: "Official Charts / French Singles",
        sourceUrl: url,
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
};          frenchSingles:
            html.toLowerCase().includes("french singles"),

          position:
            html.toLowerCase().includes("position")
        }
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
        version: "9.1-test",
        source: "Official Charts / French Singles",
        country: "FR",
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
