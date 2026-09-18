function cleanText(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&Agrave;/g, "À")
    .replace(/&Eacute;/g, "É")
    .replace(/&eacute;/g, "é")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeText(value = "") {
  return cleanText(value);
}

function numberFrom(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function movement(position, lastWeek) {
  if (!lastWeek) return { change: null, direction: "NEW", movement: "NEW" };
  const change = lastWeek - position;
  if (change > 0) return { change, direction: "UP", movement: `+${change}` };
  if (change < 0) return { change, direction: "DOWN", movement: String(change) };
  return { change: 0, direction: "SAME", movement: "0" };
}

function firstMatch(block, patterns) {
  for (const regex of patterns) {
    const match = block.match(regex);
    if (match?.[1]) return decodeText(match[1]);
  }
  return "";
}

function parseChart(html) {
  const tracks = [];
  const marker = /Number\s+(\d{1,3})/gi;
  const positions = [...html.matchAll(marker)];

  for (let i = 0; i < positions.length && tracks.length < 20; i++) {
    const position = Number(positions[i][1]);
    if (!position || position > 100) continue;
    const start = positions[i].index;
    const end = positions[i + 1]?.index ?? Math.min(html.length, start + 12000);
    const block = html.slice(start, end);

    const title = firstMatch(block, [
      /class=["'][^"']*chart-name[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
      /class=["'][^"']*chart-name[^"']*["'][^>]*>([\s\S]*?)<\//i
    ]);
    const artist = firstMatch(block, [
      /class=["'][^"']*chart-artist[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
      /class=["'][^"']*chart-artist[^"']*["'][^>]*>([\s\S]*?)<\//i
    ]);

    if (!title || !artist) continue;

    const lastWeek = numberFrom(firstMatch(block, [
      /title=["']Last week["'][^>]*>([\s\S]*?)<\//i,
      /LW:\s*([0-9-]+)/i
    ]));
    const peak = numberFrom(firstMatch(block, [
      /class=["'][^"']*peak[^"']*["'][^>]*>([\s\S]*?)<\//i,
      /Peak:\s*(\d+)/i
    ]));
    const weeks = numberFrom(firstMatch(block, [
      /class=["'][^"']*weeks[^"']*["'][^>]*>([\s\S]*?)<\//i,
      /Weeks:\s*(\d+)/i
    ]));

    tracks.push({ position, title, artist, lastWeek, peak, weeks, ...movement(position, lastWeek) });
  }
  return tracks;
}

export default async () => {
  try {
    const response = await fetch("https://www.officialcharts.com/charts/french-singles-chart/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KINARadar/9.4)",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) throw new Error(`Official Charts antwoordde met ${response.status}`);

    const html = await response.text();
    const tracks = parseChart(html);

    return Response.json({
      version: "9.4",
      country: "FR",
      source: "Official Charts / French Singles",
      success: tracks.length > 0,
      count: tracks.length,
      tracks,
      diagnostics: tracks.length ? null : { htmlLength: html.length, hasNumberMarker: /Number\s+1/i.test(html), hasChartName: /chart-name/i.test(html) }
    }, { headers: { "cache-control": "public, max-age=300, s-maxage=21600" } });
  } catch (error) {
    return Response.json({
      version: "9.4",
      country: "FR",
      source: "Official Charts / French Singles",
      success: false,
      error: error.message,
      count: 0,
      tracks: []
    }, { status: 500, headers: { "cache-control": "no-store" } });
  }
};
