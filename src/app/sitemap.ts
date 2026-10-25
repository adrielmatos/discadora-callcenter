import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://discadora-callcenter.vercel.app";
  const now = new Date();

  const routes = [
    "",
    "/login",
    "/dialer",
    "/leads",
    "/tasks",
    "/retornos",
    "/campanhas",
    "/omnichannel",
    "/resultados",
    "/download-extensao"
  ];

  return routes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/leads" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/dialer" || route === "/leads" ? 0.9 : 0.7
  }));
}
