function getSnippet(html, term) {
  const lower = html.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());

  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - 500);
  const end = Math.min(html.length, index + 1000);

  return html
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
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

    return Response.json({
      version: "9.1-debug",
      success: true,
      htmlLength: html.length,
      samples: {
        position: getSnippet(html, "position"),
        peak: getSnippet(html, "Peak"),
        weeks: getSnippet(html, "Weeks"),
        chart: getSnippet(html, "chart-item")
      }
    });

  } catch (error) {
    return Response.json(
      {
        version: "9.1-debug",
        success: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
};
