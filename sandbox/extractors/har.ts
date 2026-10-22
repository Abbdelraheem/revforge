import fs from "node:fs";
import { extractHarTarget } from "../../src/lib/analysis/extractors/har";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error(JSON.stringify({ error: `Input HAR file not found: ${inputPath}` }));
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(inputPath, "utf-8");
    const result = extractHarTarget(content);
    console.log(JSON.stringify(result));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
  }
}

main();
