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

function getMovement(position, lastWeek) {
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
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      throw new Error(
        `French chart antwoordde met ${response.status}`
      );
    }

    const html = await response.text();

    const tracks = [];

    /*
      Zoek naar chart-items.
      We testen eerst welke velden daadwerkelijk
      uit de huidige HTML-structuur komen.
    */

    const itemRegex =
      /<div[^>]*class="[^"]*chart-item[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*chart-item|$)/gi;

    let match;

    while (
      (match = itemRegex.exec(html)) !== null &&
      tracks.length < 20
    ) {
      const block = match[1];

      const positionMatch =
        block.match(
          /class="[^"]*(?:position|chart-position)[^"]*"[^>]*>\s*(\d{1,3})/i
        );

      const lastWeekMatch =
        block.match(
          /LW[^0-9-]*(\d{1,3}|-)/i
        );

      const peakMatch =
        block.match(
          /Peak[^0-9]*(\d{1,3})/i
        );

      const weeksMatch =
        block.match(
          /Weeks[^0-9]*(\d{1,3})/i
        );

      const titleMatch =
        block.match(
          /<(?:h2|h3|a)[^>]*class="[^"]*(?:title|track|name)[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|h3|a)>/i
        );

      const artistMatch =
        block.match(
          /<(?:div|span|p|a)[^>]*class="[^"]*artist[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p|a)>/i
        );

      if (!positionMatch || !titleMatch) {
        continue;
      }

      const position =
        Number(positionMatch[1]);

      const lastWeek =
        lastWeekMatch &&
        lastWeekMatch[1] !== "-"
          ? Number(lastWeekMatch[1])
          : null;

      const peak =
        peakMatch
          ? Number(peakMatch[1])
          : null;

      const weeks =
        weeksMatch
          ? Number(weeksMatch[1])
          : null;

      const movement =
        getMovement(position, lastWeek);

      tracks.push({
        position,
        lastWeek,
        change: movement.change,
        direction: movement.direction,
        movement: movement.label,
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
        fetchedAt: new Date().toISOString(),
        success: true,
        htmlLength: html.length,
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
