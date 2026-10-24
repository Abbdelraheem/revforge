import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "benchmarks",
    "targets",
    "01-static-landing",
    "index.html"
  );

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Demo target not found", { status: 404 });
  }

  const html = fs.readFileSync(filePath, "utf-8");

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline';",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
