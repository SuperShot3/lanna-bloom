import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

const files = [
  {
    input: "Eng Negative keyword.csv",
    output: "Eng Negative keyword paste.txt",
  },
  {
    input: "Thai Negative keyword .csv",
    output: "Thai Negative keyword paste.txt",
  },
  {
    input: "Location Negative keyword.csv",
    output: "Location Negative keyword paste.txt",
  },
];

function formatKeyword(keyword, matchType) {
  const trimmedKeyword = keyword.trim();
  const normalizedMatchType = matchType.trim().toUpperCase();

  if (normalizedMatchType === "PHRASE") {
    return `"${trimmedKeyword}"`;
  }

  if (normalizedMatchType === "EXACT") {
    return `[${trimmedKeyword}]`;
  }

  return trimmedKeyword;
}

for (const file of files) {
  const inputPath = join(currentDir, file.input);
  const outputPath = join(currentDir, file.output);
  const rows = readFileSync(inputPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const formatted = [];
  const seen = new Set();

  for (const row of rows.slice(1)) {
    const separatorIndex = row.lastIndexOf(",");

    if (separatorIndex === -1) {
      continue;
    }

    const keyword = row.slice(0, separatorIndex);
    const matchType = row.slice(separatorIndex + 1);
    const formattedKeyword = formatKeyword(keyword, matchType);

    if (!seen.has(formattedKeyword)) {
      seen.add(formattedKeyword);
      formatted.push(formattedKeyword);
    }
  }

  writeFileSync(outputPath, `${formatted.join("\n")}\n`);
  console.log(`Wrote ${formatted.length} keywords to ${outputPath}`);
}
