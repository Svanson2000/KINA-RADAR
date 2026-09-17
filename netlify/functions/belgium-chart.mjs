export default async () => {
  try {
    const url =
      "https://www.ultratop.be/nl/ultratop50";

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 KINA-RADAR/9.1"
      }
    });

    const html = await response.text();

    if (!response.ok) {
      throw new Error(
        `Ultratop antwoordde met ${response.status}`
      );
    }

    return Response.json(
      {
        version: "9.1-test",
        source: "Ultratop",
        country: "BE",
        fetchedAt: new Date().toISOString(),
        success: true,
        status: response.status,
        htmlLength: html.length,
        pageLooksValid:
          html.toLowerCase().includes("ultratop")
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
        source: "Ultratop",
        country: "BE",
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
