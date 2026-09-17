function decodeText(value = "") {
  let result = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const replacements = {
    "Ã€": "À",
    "Ã‚": "Â",
    "Ã‡": "Ç",
    "Ãˆ": "È",
    "Ã‰": "É",
    "ÃŠ": "Ê",
    "Ã‹": "Ë",
    "ÃŽ": "Î",
    "ÃÏ": "Ï",
    "Ã”": "Ô",
    "Ã™": "Ù",
    "Ã›": "Û",
    "Ãœ": "Ü",
    "Ã ": "à",
    "Ã¢": "â",
    "Ã§": "ç",
    "Ã¨": "è",
    "Ã©": "é",
    "Ãª": "ê",
    "Ã«": "ë",
    "Ã®": "î",
    "Ã¯": "ï",
    "Ã´": "ô",
    "Ã¹": "ù",
    "Ã»": "û",
    "Ã¼": "ü"
  };

  for (const [wrong, correct] of Object.entries(replacements)) {
    result = result.split(wrong).join(correct);
  }

  return result;
}
