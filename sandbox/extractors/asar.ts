import fs from "node:fs";
import { extractAsarTarget } from "../../src/lib/analysis/extractors/asar";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error(JSON.stringify({ error: `Input ASAR file not found: ${inputPath}` }));
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(inputPath);
    const result = await extractAsarTarget(buffer);
    console.log(JSON.stringify(result));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
  }
}

main();
