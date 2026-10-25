import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://discadora-callcenter.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/download-extensao"],
        disallow: ["/api/", "/admin", "/settings", "/dnd"]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
