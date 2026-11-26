import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChacoHoy - Periodismo Digital del Chaco y la Región",
    short_name: "ChacoHoy",
    description:
      "Portal de noticias de Resistencia, Interior del Chaco, Política, Economía, Nacionales, Internacionales y Tecnología.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#003366",
    orientation: "portrait",
    categories: ["news", "magazines"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
