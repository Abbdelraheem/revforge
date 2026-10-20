import http from "node:http";
import net from "node:net";
import dns from "node:dns/promises";
import { isBlockedIp } from "../../src/lib/security/safe-fetch";

/**
 * Hardcoded egress proxy allowlist for sandboxed build containers.
 * Restricts external communication strictly to known package managers and safe endpoints.
 */
export const ALLOWED_HOSTS = new Set([
  "registry.npmjs.org",
  "registry.yarnpkg.com",
  "github.com",
  "api.github.com",
  "objects.githubusercontent.com",
  "raw.githubusercontent.com",
]);

/**
 * Checks if a destination hostname is permitted on the egress proxy.
 */
export function isAllowedHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  if (ALLOWED_HOSTS.has(normalized)) return true;
  for (const allowed of ALLOWED_HOSTS) {
    if (normalized.endsWith("." + allowed)) return true;
  }
  return false;
}

/**
 * Resolves a hostname, pins the IP, and verifies it is not blocked or private.
 */
export async function resolvePinnedIp(hostname: string): Promise<string> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records || records.length === 0) {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }

  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new Error(`Egress blocked: ${hostname} resolved to illegal IP ${r.address}`);
    }
  }

  // Pin first safe public address
  return records[0].address;
}

export function createEgressProxy(port = 8888): http.Server {
  const server = http.createServer((req, res) => {
    // Standard HTTP proxying
    const hostHeader = req.headers.host;
    if (!hostHeader || !isAllowedHost(hostHeader)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden: Host not in egress allowlist");
      return;
    }

    resolvePinnedIp(hostHeader.split(":")[0])
      .then((pinnedIp) => {
        const proxyReq = http.request(
          {
            host: pinnedIp,
            port: 80,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: hostHeader },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on("error", (err) => {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end(`Proxy error: ${err.message}`);
        });

        req.pipe(proxyReq);
      })
      .catch((err) => {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end(`Egress blocked: ${err.message}`);
      });
  });

  // Handle HTTPS CONNECT tunneling
  server.on("connect", (req, clientSocket, head) => {
    const [destHost, destPort] = (req.url || "").split(":");
    const portNum = parseInt(destPort || "443", 10);

    if (!isAllowedHost(destHost)) {
      clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\nHost not in egress allowlist");
      clientSocket.destroy();
      return;
    }

    resolvePinnedIp(destHost)
      .then((pinnedIp) => {
        const serverSocket = net.connect(portNum, pinnedIp, () => {
          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          serverSocket.write(head);
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        });

        serverSocket.on("error", () => {
          clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
          clientSocket.destroy();
        });
      })
      .catch((err) => {
        clientSocket.write(`HTTP/1.1 403 Forbidden\r\n\r\n${err.message}`);
        clientSocket.destroy();
      });
  });

  return server;
}

if (process.env.RUN_EGRESS_PROXY === "true") {
  const port = parseInt(process.env.PORT || "8888", 10);
  createEgressProxy(port).listen(port, "0.0.0.0");
}
