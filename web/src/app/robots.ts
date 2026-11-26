import type { MetadataRoute } from "next";

/**
 * Bloquea el rastreo de rutas internas y de administración tanto para buscadores
 * como para crawlers de Inteligencia Artificial (GPTBot, CCBot, Google-Extended, anthropic-ai, etc.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "ClaudeBot",
          "Bytespider",
          "PerplexityBot",
        ],
        disallow: ["/admin", "/api/"],
      },
    ],
  };
}
