import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://revforge.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/projects/",
          "/share/",
          "/dev/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
