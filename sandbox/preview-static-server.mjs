import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "/workspace/out");
const port = Number(process.argv[3] || process.env.PORT || 4100);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalized = path.posix.normalize(decoded);
  if (
    normalized.startsWith("../") ||
    normalized.includes("\0") ||
    path.isAbsolute(normalized)
  ) {
    return null;
  }
  const relative = normalized === "/" ? "index.html" : normalized.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  if (!candidate.startsWith(root + path.sep) && candidate !== root) return null;
  return candidate;
}

http
  .createServer((req, res) => {
    let target = resolvePath(req.url);
    if (!target) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("Bad request");
      return;
    }

    try {
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, "index.html");
      }
      if (!fs.existsSync(target) && fs.existsSync(`${target}.html`)) {
        target = `${target}.html`;
      }
      if (!fs.existsSync(target)) {
        const fallback = path.join(root, "404.html");
        if (fs.existsSync(fallback)) {
          res.writeHead(404, { "content-type": TYPES[".html"] });
          res.end(fs.readFileSync(fallback));
          return;
        }
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found");
        return;
      }

      const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      fs.createReadStream(target).pipe(res);
    } catch {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("Internal error");
    }
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`static preview listening on ${port}`);
  });
