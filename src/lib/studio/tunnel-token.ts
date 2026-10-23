import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 300;

interface TunnelTokenPayload {
  workerId: string;
  iat: number;
  exp: number;
}

function secret(): string {
  const value = process.env.PREVIEW_TUNNEL_SECRET;
  if (!value || value.length < 16) {
    throw new Error("PREVIEW_TUNNEL_SECRET is required for the preview tunnel.");
  }
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sign(payload: string): string {
  return base64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

/** Short-lived, rotating bearer token for the outbound worker tunnel. */
export function signTunnelToken(
  workerId: string,
  nowMs: number = Date.now(),
  ttlSeconds: number = TOKEN_TTL_SECONDS
): string {
  if (!workerId || workerId.length > 128) {
    throw new Error("workerId is required.");
  }

  const payload: TunnelTokenPayload = {
    workerId,
    iat: Math.floor(nowMs / 1000),
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyTunnelToken(
  token: string,
  nowMs: number = Date.now()
): TunnelTokenPayload | null {
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) return null;

  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as TunnelTokenPayload;

    if (
      typeof payload.workerId !== "string" ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= nowMs
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
