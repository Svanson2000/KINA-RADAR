function cleanText(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cp1252Byte(char) {
  const map = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
    "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8A,
    "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C,
    "ž": 0x9E, "Ÿ": 0x9F
  };
  if (map[char] !== undefined) return map[char];
  const code = char.charCodeAt(0);
  return code <= 255 ? code : null;
}

function fixEncoding(value = "") {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const bytes = [];
    for (const char of value) {
      const byte = cp1252Byte(char);
      if (byte === null) return value;
      bytes.push(byte);
    }
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(
      Uint8Array.from(bytes)
    );
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function decodeText(value = "") {
  return fixEncoding(cleanText(value));
}

function numberFrom(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function movement(position, lastWeek) {
  if (!lastWeek) {
    return { change: null, direction: "NEW", movement: "NEW" };
  }
  const change = lastWeek - position;
  if (change > 0) return { change, direction: "UP", movement: `+${change}` };
  if (change < 0) return { change, direction: "DOWN", movement: String(change) };
  return { change: 0, direction: "SAME", movement: "0" };
}

function extract(block, regex) {
  const match = block.match(regex);
  return match ? decodeText(match[1]) : "";
}

export default async () => {
  try {
    const response = await fetch(
      "https://www.officialcharts.com/charts/french-singles-chart/",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; KINARadar/9.3)",
          Accept: "text/html,application/xhtml+xml"
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Official Charts antwoordde met ${response.status}`);
    }

    const html = await response.text();
    const blocks = html.split(/class=["'][^"']*chart-item[^"']*["']/i).slice(1);
    const tracks = [];

    for (const block of blocks) {
      const title = extract(
        block,
        /class=["'][^"']*chart-name[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
      const artist = extract(
        block,
        /class=["'][^"']*chart-artist[^"']*["'][^>]*>([\s\S]*?)<\//i
      );

      if (!title || !artist) continue;

      const lastWeek = numberFrom(
        extract(block, /title=["']Last week["'][^>]*>([\s\S]*?)<\//i)
      );
      const peak = numberFrom(
        extract(block, /class=["'][^"']*peak[^"']*["'][^>]*>([\s\S]*?)<\//i)
      );
      const weeks = numberFrom(
        extract(block, /class=["'][^"']*weeks[^"']*["'][^>]*>([\s\S]*?)<\//i)
      );

      const position = tracks.length + 1;
      const move = movement(position, lastWeek);

      tracks.push({
        position,
        title,
        artist,
        lastWeek,
        peak,
        weeks,
        ...move
      });

      if (tracks.length >= 20) break;
    }

    return Response.json(
      {
        version: "9.3",
        country: "FR",
        source: "Official Charts / French Singles",
        success: tracks.length > 0,
        count: tracks.length,
        tracks
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        version: "9.3",
        country: "FR",
        source: "Official Charts / French Singles",
        success: false,
        error: error.message,
        count: 0,
        tracks: []
      },
      {
        status: 500,
        headers: { "cache-control": "no-store" }
      }
    );
  }
};
