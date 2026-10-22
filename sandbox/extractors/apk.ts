import fs from "node:fs";
import { extractApkTarget } from "../../src/lib/analysis/extractors/apk";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error(JSON.stringify({ error: `Input APK file not found: ${inputPath}` }));
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(inputPath);
    const result = await extractApkTarget(buffer);
    console.log(JSON.stringify(result));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
  }
}

main();
