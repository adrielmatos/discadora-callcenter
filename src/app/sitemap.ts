import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://discadora-callcenter.vercel.app";
  const now = new Date();

  // Apenas rotas públicas institucionais devem ser indexadas por buscadores (SEO)
  const publicRoutes = [
    "",
    "/login",
    "/download-extensao"
  ];

  return publicRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8
  }));
}
