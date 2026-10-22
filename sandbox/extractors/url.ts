import { extractWebTarget } from "../../src/lib/analysis/extractors/web";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error(JSON.stringify({ error: "Missing URL argument" }));
    process.exit(1);
  }

  try {
    const result = await extractWebTarget(url);
    console.log(JSON.stringify(result));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
  }
}

main();
