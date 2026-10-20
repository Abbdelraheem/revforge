import { NextResponse, type NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const path = req.nextUrl.pathname;

  // Protected route checking: (app) routes and (admin) routes
  const isAppRoute = path.startsWith("/dashboard") || path.startsWith("/projects") || path.startsWith("/settings");
  const isAdminRoute = path.startsWith("/admin");

  const sessionToken = req.cookies.get("revforge_session_token")?.value;
  const isAuthenticated = Boolean(sessionToken && sessionToken.includes("."));

  if ((isAppRoute || isAdminRoute) && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // Nonce CSP per Appendix F
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval' 'unsafe-inline'" : ""} https://cdn.paddle.com https://sandbox-cdn.paddle.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com https://cdn.paddle.com",
    "font-src 'self'",
    "connect-src 'self' https://*.paddle.com",
    "frame-src 'self' https://*.paddle.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()");

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
