import { NextRequest, NextResponse } from "next/server";
import { getNoticiaBySlugOrId } from "@/lib/db";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitleLines(text: string, maxCharsPerLine = 26): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

/**
 * Descarga la imagen de la noticia en el servidor y la convierte a base64 data URI.
 * Esto es indispensable porque los navegadores bloquean URLs externas dentro de un SVG
 * cuando el SVG se renderiza mediante <img src="/api/og/instagram">.
 */
async function resolveImageAsDataUri(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:image/")) return imageUrl;

  let targetUrl = imageUrl;
  if (targetUrl.startsWith("/api/image?url=")) {
    targetUrl = decodeURIComponent(targetUrl.replace("/api/image?url=", ""));
  } else if (targetUrl.includes("/api/image?url=")) {
    const idx = targetUrl.indexOf("/api/image?url=");
    targetUrl = decodeURIComponent(targetUrl.slice(idx + "/api/image?url=".length));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    }
  } catch (e) {
    console.warn("No se pudo descargar imagen remota para placa IG:", e);
  }
  return "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  let titulo =
    searchParams.get("titulo") ||
    "ChacoHoy: Cobertura en vivo de Resistencia y toda la provincia";
  let categoria = (searchParams.get("categoria") || "LOCALES").toUpperCase();
  let localidad = searchParams.get("localidad") || "Resistencia, Chaco";
  let imagenUrl =
    searchParams.get("img") ||
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80";

  if (id) {
    const noticia = await getNoticiaBySlugOrId(id);
    if (noticia) {
      titulo = noticia.titulo;
      categoria = noticia.categoria_slug.toUpperCase();
      localidad = noticia.localidad || "Chaco";
      if (noticia.imagen_url) {
        imagenUrl = noticia.imagen_url;
      }
    }
  }

  const embeddedImageDataUri = await resolveImageAsDataUri(imagenUrl);

  const lines = wrapTitleLines(titulo, 27);
  const fontSize = lines.length >= 5 ? 52 : 60;
  const lineHeight = fontSize * 1.22;
  const startY = 860 - (lines.length - 1) * (lineHeight * 0.65);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#001937" stop-opacity="0.72"/>
      <stop offset="32%" stop-color="#002b5c" stop-opacity="0.12"/>
      <stop offset="58%" stop-color="#001937" stop-opacity="0.78"/>
      <stop offset="82%" stop-color="#001226" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#000c1a" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>

  <!-- Fondo Azul Institucional -->
  <rect width="1080" height="1350" fill="#001f3f"/>

  <!-- Foto Real de la Noticia (Incrustada en Base64 para verse en todos los navegadores) -->
  ${
    embeddedImageDataUri
      ? `<image href="${embeddedImageDataUri}" x="0" y="0" width="1080" height="1050" preserveAspectRatio="xMidYMid slice"/>`
      : ""
  }

  <!-- Degradado Periodístico sobre la foto -->
  <rect width="1080" height="1350" fill="url(#bgGrad)"/>

  <!-- Marco interno sutil -->
  <rect x="36" y="36" width="1008" height="1278" rx="24" fill="none" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Cabecera: Logo CHACOHOY y Localidad -->
  <g transform="translate(72, 72)">
    <rect x="0" y="0" width="320" height="82" rx="14" fill="#003366" fill-opacity="0.92" stroke="#38bdf8" stroke-width="3"/>
    <text x="160" y="56" font-family="Georgia, serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">
      CHACO<tspan fill="#38bdf8">HOY</tspan>
    </text>

    <rect x="620" y="12" width="316" height="58" rx="29" fill="#002b5c" fill-opacity="0.9" stroke="#38bdf8" stroke-width="2"/>
    <text x="778" y="49" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#e0f2fe" text-anchor="middle" letter-spacing="1.5">
      ${escapeXml(localidad.toUpperCase().slice(0, 22))}
    </text>
  </g>

  <!-- Etiqueta de Categoría -->
  <g transform="translate(72, ${Math.round(startY - 120)})">
    <rect x="0" y="0" width="${Math.max(220, categoria.length * 24 + 56)}" height="58" rx="10" fill="url(#accentGrad)"/>
    <text x="${Math.max(220, categoria.length * 24 + 56) / 2}" y="39" font-family="Arial, sans-serif" font-weight="800" font-size="26" fill="#ffffff" text-anchor="middle" letter-spacing="3">
      ${escapeXml(categoria)}
    </text>
  </g>

  <!-- Titular Periodístico Multilínea -->
  <g font-family="Georgia, serif" font-weight="bold" font-size="${fontSize}" fill="#ffffff">
    ${lines
      .map(
        (line, idx) =>
          `<text x="72" y="${Math.round(startY + idx * lineHeight)}">${escapeXml(line)}</text>`
      )
      .join("\n    ")}
  </g>

  <!-- Barra divisoria celeste -->
  <rect x="72" y="1155" width="190" height="10" rx="5" fill="#38bdf8"/>

  <!-- Pie institucional -->
  <line x1="72" y1="1205" x2="1008" y2="1205" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2"/>
  <text x="72" y="1255" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#bae6fd">
    chacohoy.com.ar
  </text>
  <text x="1008" y="1255" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#7dd3fc" text-anchor="end" letter-spacing="2">
    PERIODISMO DIGITAL DEL CHACO
  </text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
