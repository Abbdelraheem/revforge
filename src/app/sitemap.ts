import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://revforge.ai";
  const lastModified = new Date();

  const routes = [
    "",
    "/how-it-works",
    "/pricing",
    "/security",
    "/use-cases",
    "/docs",
    "/faq",
    "/contact",
    "/changelog",
    "/terms",
    "/privacy",
    "/acceptable-use",
    "/clean-room-ip-policy",
    "/dmca",
    "/design-system",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "" || route === "/changelog" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/pricing" || route === "/how-it-works" ? 0.9 : 0.7,
  }));
}
