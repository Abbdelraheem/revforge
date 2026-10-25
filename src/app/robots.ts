import type { MetadataRoute } from "next";

function baseUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/how-it-works", "/use-cases", "/security", "/faq"],
        disallow: [
          "/dashboard",
          "/projects",
          "/billing",
          "/team",
          "/settings",
          "/notifications",
          "/admin",
          "/api",
          "/dev",
          "/design-system",
        ],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
    host: baseUrl(),
  };
}
