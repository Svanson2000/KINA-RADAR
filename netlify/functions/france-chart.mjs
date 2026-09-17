export default async () => {
  try {
    const url =
      "https://www.officialcharts.com/charts/french-singles-chart/";

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 KINA-RADAR/9.1",
        "Accept":
          "text/html,application/xhtml+xml"
      }
    });

    const html = await response.text();

    if (!response.ok) {
      throw new Error(
        `French chart antwoordde met ${response.status}`
      );
    }

    return Response.json(
      {
        version: "9.1-test",
        source: "Official Charts / French Singles",
        country: "FR",
        fetchedAt: new Date().toISOString(),
        success: true,
        status: response.status,
        htmlLength: html.length,

        checks: {
          officialCharts:
            html.toLowerCase().includes("official charts"),

          frenchSingles:
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
