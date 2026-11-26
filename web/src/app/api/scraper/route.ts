import { NextRequest, NextResponse } from "next/server";
import {
  addLog,
  getFuentes,
  getLogs,
  getNoticias,
  saveFuente,
  saveNoticia,
} from "@/lib/db";
import {
  CategoriaSlug,
  LOCALIDADES_GRAN_RESISTENCIA,
  LOCALIDADES_INTERIOR_CHACO,
} from "@/lib/types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "—");
}

function toProxiedImageUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("/api/image?url=") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  return `/api/image?url=${encodeURIComponent(rawUrl)}`;
}

function isIgnoredImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("isologotipo") ||
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("gob-ico") ||
    lower.includes("ico-radiogob") ||
    lower.includes("icon-social") ||
    lower.includes("avatar") ||
    lower.includes("/autores/") ||
    lower.endsWith(".svg") ||
    lower.includes("googleusercontent.com/j6_cofbogxhri9im864nl")
  );
}

/**
 * Extrae título, volanta, texto completo y la IMAGEN REAL EXACTA
 * desde una URL de noticia (compatible con chaco.gob.ar, letrap.com.ar y cualquier diario digital).
 */
export async function scrapeArticlePage(articleUrl: string): Promise<{
  title?: string;
  volanta?: string;
  description?: string;
  bodyHtml?: string;
  bodyText?: string;
  imageUrl?: string;
}> {
  if (!articleUrl || !articleUrl.startsWith("http")) return {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return {};
    const html = await res.text();
    const finalUrl = res.url || articleUrl;

    // 1. Imagen específica de chaco.gob.ar (<img class="img-article" src="/uploads/files/...">)
    let imageUrl: string | undefined;
    const chacoImgMatch =
      html.match(
        /<img[^>]+class=["'][^"']*img-article[^"']*["'][^>]+src=["']([^"']+)["']/i
      ) ||
      html.match(
        /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*img-article[^"']*["']/i
      );

    if (chacoImgMatch?.[1]) {
      imageUrl = chacoImgMatch[1].trim();
    }

    // 2. Si es otro portal (como letrap.com.ar), buscar og:image / twitter:image
    if (!imageUrl) {
      const ogImgMatch =
        html.match(
          /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']/i
        );
      if (ogImgMatch?.[1] && !isIgnoredImage(ogImgMatch[1])) {
        imageUrl = ogImgMatch[1].trim();
      }
    }

    // 3. Si aún no hay imagen, buscar la primera foto válida del artículo
    if (!imageUrl) {
      const imgRegex =
        /<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = imgRegex.exec(html)) !== null) {
        const candidate = m[1].trim();
        if (!isIgnoredImage(candidate)) {
          imageUrl = candidate;
          break;
        }
      }
    }

    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        imageUrl = new URL(imageUrl, finalUrl).toString();
      } catch {
        imageUrl = undefined;
      }
    }

    // 4. Extraer Título
    const chacoTitleMatch = html.match(
      /<h2[^>]+class=["'][^"']*title-news[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i
    );
    const ogTitleMatch =
      html.match(
        /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i
      ) ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

    const rawTitle = chacoTitleMatch?.[1] || ogTitleMatch?.[1] || "";
    const title = decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();

    // 5. Extraer Volanta
    const panelMatch = html.match(
      /<section[^>]+class=["'][^"']*container-panel[^"']*["'][^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i
    );
    const badgeMatch = html.match(
      /<span[^>]+class=["'][^"']*news-article__badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );
    const rawVolanta = panelMatch?.[1] || badgeMatch?.[1];
    const volanta = rawVolanta
      ? decodeHtmlEntities(rawVolanta.replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase()
      : undefined;

    // 6. Extraer Descripción / Bajada (og:description)
    const ogDescMatch =
      html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i
      );
    const ogDescription = ogDescMatch?.[1]
      ? decodeHtmlEntities(ogDescMatch[1]).replace(/\s+/g, " ").trim()
      : undefined;

    // 7. Extraer Cuerpo del artículo:
    let bodyHtml = "";
    let bodyText = "";

    const chacoContentMatch = html.match(
      /<h5[^>]+class=["'][^"']*content-news[^"']*["'][^>]*>([\s\S]*?)<\/h5>/i
    );

    if (chacoContentMatch?.[1]) {
      const rawBlocks = chacoContentMatch[1]
        .replace(/<\/?div[^>]*>/gi, "\n")
        .split(/(?:<br\s*\/?>\s*){2,}|\n{2,}/gi);

      const cleanParagraphs = rawBlocks
        .map((b) =>
          decodeHtmlEntities(
            b.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
          )
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter((b) => b.length > 25);

      bodyText = cleanParagraphs.join("\n\n");
      bodyHtml = cleanParagraphs
        .map((p) =>
          p === p.toUpperCase() && p.length < 95
            ? `<h3>${p}</h3>`
            : `<p>${p}</p>`
        )
        .join("");
    } else {
      const paragraphs: string[] = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pRegex.exec(html)) !== null && paragraphs.length < 10) {
        const cleanP = decodeHtmlEntities(pMatch[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim();
        if (
          cleanP.length > 60 &&
          !cleanP.toLowerCase().includes("cookies") &&
          !cleanP.toLowerCase().includes("todos los derechos reservados")
        ) {
          paragraphs.push(cleanP);
        }
      }
      bodyText = paragraphs.join("\n\n");
      bodyHtml = paragraphs.map((p) => `<p>${p}</p>`).join("");
    }

    const description =
      ogDescription || bodyText.split("\n\n")[0]?.slice(0, 260) || title;

    return {
      title,
      volanta,
      description,
      bodyHtml,
      bodyText,
      imageUrl,
    };
  } catch {
    return {};
  }
}

export interface ListedNewsCard {
  title: string;
  link: string;
  imageUrl: string;
  volanta?: string;
  bajada?: string;
}

/**
 * 1. Scraper de chaco.gob.ar/noticias
 */
export async function scrapeChacoGobListing(
  portalUrl: string
): Promise<ListedNewsCard[]> {
  const results: ListedNewsCard[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(portalUrl, {
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA },
    });
    clearTimeout(timeout);
    if (!res.ok) return results;

    const html = await res.text();
    const cardRegex =
      /<div[^>]+class=["'][^"']*card-article["'][^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null && results.length < 8) {
      const cardHtml = match[1];
      const hrefMatch = cardHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
      const imgMatch = cardHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      const h4Match = cardHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
      const h3Match = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);

      if (hrefMatch?.[1] && h3Match?.[1]) {
        const link = new URL(hrefMatch[1].trim(), portalUrl).toString();
        const imageUrl = imgMatch?.[1]
          ? new URL(imgMatch[1].trim(), portalUrl).toString()
          : "";
        const volanta = h4Match?.[1]
          ? decodeHtmlEntities(h4Match[1].replace(/<[^>]+>/g, " "))
              .replace(/\s+/g, " ")
              .trim()
          : "ACTUALIDAD CHACO";
        const title = decodeHtmlEntities(h3Match[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim();

        if (title && imageUrl && !isIgnoredImage(imageUrl)) {
          results.push({ title, link, imageUrl, volanta });
        }
      }
    }
  } catch (e) {
    console.warn("Error raspando chaco.gob.ar:", e);
  }
  return results;
}

/**
 * 2. Scraper de Letra P (https://www.letrap.com.ar/) con sus fotos reales de alta resolución
 */
export async function scrapeLetraPListing(
  portalUrl: string
): Promise<ListedNewsCard[]> {
  const results: ListedNewsCard[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(portalUrl, {
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA },
    });
    clearTimeout(timeout);
    if (!res.ok) return results;

    const html = await res.text();
    // En Letra P cada nota es un <a ... href="https://www.letrap.com.ar/..."><article class="news-article__article-wrapper">...</article></a>
    const blockRegex =
      /<a[^>]+href=["'](https:\/\/www\.letrap\.com\.ar\/[^"']+-n\d+)["'][^>]*>\s*<article[^>]*>([\s\S]*?)<\/article>\s*<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(html)) !== null && results.length < 6) {
      const link = match[1].trim();
      const articleHtml = match[2];

      const imgMatch = articleHtml.match(
        /<img[^>]+src=["'](https:\/\/media\.letrap\.com\.ar\/[^"']+)["'][^>]*>/i
      );
      const altMatch = articleHtml.match(
        /<img[^>]+alt=["']([^"']+)["'][^>]*>/i
      );
      const badgeMatch = articleHtml.match(
        /<span[^>]+class=["'][^"']*news-article__badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
      );
      const titleMatch = articleHtml.match(
        /<h[1234][^>]+class=["'][^"']*news-article__title[^"']*["'][^>]*>([\s\S]*?)<\/h[1234]>/i
      );

      const imageUrl = imgMatch?.[1]?.trim() || "";
      const title = titleMatch?.[1]
        ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " "))
            .replace(/\s+/g, " ")
            .trim()
        : "";
      const volanta = badgeMatch?.[1]
        ? decodeHtmlEntities(badgeMatch[1].replace(/<[^>]+>/g, " "))
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase()
        : "POLÍTICA NACIONAL";
      const bajada = altMatch?.[1]
        ? decodeHtmlEntities(altMatch[1]).replace(/\s+/g, " ").trim()
        : undefined;

      if (
        title &&
        imageUrl &&
        !isIgnoredImage(imageUrl) &&
        !results.some((r) => r.link === link)
      ) {
        results.push({ title, link, imageUrl, volanta, bajada });
      }
    }
  } catch (e) {
    console.warn("Error raspando Letra P:", e);
  }
  return results;
}

/**
 * 3. Scraper de páginas de Tópicos de Google News (https://news.google.com/topics/CAAq...)
 * Extrae las noticias con la foto real exacta (/api/attachments/...-w560-h336-p-df) y el medio original.
 */
export async function scrapeGoogleNewsTopicListing(
  topicUrl: string
): Promise<ListedNewsCard[]> {
  const results: ListedNewsCard[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(topicUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "es-419,es;q=0.9",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return results;

    const html = await res.text();

    // En el HTML de Google News Topic, cada tarjeta principal con foto tiene:
    // <img class="Quavad vwBmvb" ... src="/api/attachments/..." /> ... <div class="vr1PYe"...>MEDIO</div> ... <a class="gPFEn" href="./read/...">TITULAR</a>
    const cardRegex =
      /<figure[^>]+class=["'][^"']*K0q4G[^"']*["'][^>]*>\s*<img[^>]+src=["'](\/api\/attachments\/[^"']+)["'][^>]*>\s*<\/figure>[\s\S]{1,1200}?<div[^>]+class=["']vr1PYe["'][^>]*>([\s\S]*?)<\/div>[\s\S]{1,3500}?<a[^>]+class=["']gPFEn["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = cardRegex.exec(html)) !== null && results.length < 5) {
      const rawImgPath = match[1]
        .replace(/-w\d+-h\d+-p-df/i, "-w560-h336-p-df")
        .trim();
      const imageUrl = new URL(rawImgPath, "https://news.google.com").toString();
      const sourceName = decodeHtmlEntities(
        match[2].replace(/<[^>]+>/g, " ")
      )
        .replace(/\s+/g, " ")
        .trim();
      const rawHref = decodeHtmlEntities(match[3]).replace(/^\.\//, "/");
      const link = new URL(rawHref, "https://news.google.com").toString();
      const title = decodeHtmlEntities(match[4].replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim();

      if (
        title &&
        title.length > 20 &&
        imageUrl &&
        !results.some((r) => r.title === title)
      ) {
        results.push({
          title,
          link,
          imageUrl,
          volanta: sourceName ? sourceName.toUpperCase() : "ACTUALIDAD",
          bajada: `${title}. Cobertura nacional e internacional destacada a través de ${sourceName || "agencias"}.`,
        });
      }
    }
  } catch (e) {
    console.warn("Error raspando Google News Topic:", e);
  }
  return results;
}

export function clasificarGeografiaChaco(
  texto: string,
  categoriaDefecto: CategoriaSlug = "locales"
): { categoria: CategoriaSlug; localidad: string } {
  // Si la fuente es específica de Internacionales, Tecnología, Economía o Nacionales (fuera de Chaco), respetar su sección salvo que mencione explícitamente una ciudad del Chaco
  const lower = texto.toLowerCase();

  const interiorExtra = [
    ...LOCALIDADES_INTERIOR_CHACO,
    "Puerto Las Palmas",
    "La Leonesa",
    "Las Palmas",
    "El Impenetrable",
    "Fuerte Esperanza",
    "Pampa del Indio",
    "Makallé",
    "Basail",
  ];

  for (const loc of interiorExtra) {
    if (lower.includes(loc.toLowerCase())) {
      return { categoria: "interior", localidad: loc };
    }
  }

  for (const loc of LOCALIDADES_GRAN_RESISTENCIA) {
    if (lower.includes(loc.toLowerCase())) {
      return { categoria: "locales", localidad: loc };
    }
  }

  if (
    categoriaDefecto === "internacionales" ||
    categoriaDefecto === "tecnologia" ||
    categoriaDefecto === "economia" ||
    categoriaDefecto === "nacionales" ||
    categoriaDefecto === "politica"
  ) {
    const locMap: Record<CategoriaSlug, string> = {
      locales: "Resistencia",
      interior: "Interior del Chaco",
      politica: "Argentina",
      economia: "Mercados",
      nacionales: "Argentina",
      internacionales: "Mundo",
      tecnologia: "Ciencia y Tech",
    };
    return {
      categoria: categoriaDefecto,
      localidad: locMap[categoriaDefecto],
    };
  }

  return {
    categoria: categoriaDefecto,
    localidad: "Chaco",
  };
}

function toSentenceCaseHeadline(title: string): string {
  if (title === title.toUpperCase() && title.length > 15) {
    const words = title.toLowerCase().split(" ");
    const properNouns: Record<string, string> = {
      chaco: "Chaco",
      zdero: "Zdero",
      resistencia: "Resistencia",
      "sáenz": "Sáenz",
      peña: "Peña",
      "peña:": "Peña:",
      barranqueras: "Barranqueras",
      fontana: "Fontana",
      vilelas: "Vilelas",
      palmas: "Palmas",
      ferichaco: "Ferichaco",
      aprender: "Aprender",
      fonplata: "FONPLATA",
      insssep: "INSSSEP",
      secheep: "SECHEEP",
      sameep: "SAMEEP",
      iccti: "ICCTI",
      qr: "QR",
      argentina: "Argentina",
    };
    return words
      .map((w, i) => {
        const clean = w.replace(/[.,:;!?]/g, "");
        if (properNouns[clean]) {
          return w.replace(clean, properNouns[clean]);
        }
        if (i === 0) {
          return w.charAt(0).toUpperCase() + w.slice(1);
        }
        return w;
      })
      .join(" ");
  }
  return title;
}

export const FUENTES_OFICIALES_USUARIO: Array<{
  id: string;
  nombre: string;
  url: string;
  tipo: "web_chaco" | "google_news" | "rss";
  categoria_defecto: CategoriaSlug;
}> = [
  {
    id: "f-chaco-gob",
    nombre: "Gobierno del Chaco - Noticias (Locales e Interior)",
    url: "https://chaco.gob.ar/noticias",
    tipo: "web_chaco",
    categoria_defecto: "locales",
  },
  {
    id: "f-letrap",
    nombre: "Letra P - Nacionales y Política (letrap.com.ar)",
    url: "https://www.letrap.com.ar/",
    tipo: "web_chaco",
    categoria_defecto: "politica",
  },
  {
    id: "f-gn-nacionales",
    nombre: "Google News - Nacionales Argentina",
    url: "https://news.google.com/topics/CAAqJQgKIh9DQkFTRVFvSEwyMHZNR3BuWkJJR1pYTXROREU1S0FBUAE?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "nacionales",
  },
  {
    id: "f-gn-internacionales",
    nombre: "Google News - Internacionales",
    url: "https://news.google.com/topics/CAAqLAgKIiZDQkFTRmdvSUwyMHZNRGx1YlY4U0JtVnpMVFF4T1JvQ1FWSW9BQVAB?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "internacionales",
  },
  {
    id: "f-gn-tecnologia",
    nombre: "Google News - Ciencia y Tecnología",
    url: "https://news.google.com/topics/CAAqLQgKIidDQkFTRndvSkwyMHZNR1ptZHpWbUVnWmxjeTAwTVRrYUFrRlNLQUFQAQ?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "tecnologia",
  },
  {
    id: "f-gn-economia",
    nombre: "Google News - Economía",
    url: "https://news.google.com/topics/CAAqLAgKIiZDQkFTRmdvSUwyMHZNRGx6TVdZU0JtVnpMVFF4T1JvQ1FWSW9BQVAB?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "economia",
  },
];

export async function GET() {
  const logs = await getLogs();
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "rewrite_text") {
    const articleUrl: string = body.articleUrl || "";
    const rawText: string = body.rawText || "";

    const scraped = articleUrl ? await scrapeArticlePage(articleUrl) : {};
    const titleBase = toSentenceCaseHeadline(
      scraped.title || rawText.split(".")[0] || "Noticia de ChacoHoy"
    );
    const fullText = [titleBase, scraped.bodyText || rawText]
      .filter(Boolean)
      .join("\n\n");

    const geo = clasificarGeografiaChaco(fullText, "locales");
    const bajada =
      scraped.description ||
      (scraped.bodyText
        ? scraped.bodyText.split("\n\n")[0]
        : rawText.slice(0, 240));
    const desarrolloHtml =
      scraped.bodyHtml ||
      rawText
        .split(/\n+/)
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join("");

    await addLog({
      tipo: "ia_gemini",
      estado: "exito",
      mensaje: `Noticia extraída con su foto original y clasificada en '${geo.categoria}' (${geo.localidad}).`,
    });

    return NextResponse.json({
      resultado: {
        titulo_reescrito: titleBase,
        volanta: scraped.volanta || "ACTUALIDAD CHACO",
        bajada,
        desarrollo_html: desarrolloHtml,
        categoria: geo.categoria,
        localidad: geo.localidad,
        imagen_url: toProxiedImageUrl(scraped.imageUrl),
      },
    });
  }

  // Sincronizar las 6 fuentes oficiales del usuario en la tabla de fuentes
  for (const f of FUENTES_OFICIALES_USUARIO) {
    await saveFuente({
      id: f.id,
      nombre: f.nombre,
      url: f.url,
      tipo: f.tipo,
      categoria_defecto: f.categoria_defecto,
      activa: true,
    });
  }

  const fuentes = (await getFuentes()).filter((f) => f.activa);
  const existentes = await getNoticias();
  let nuevas = 0;

  for (const fuente of fuentes) {
    let cards: ListedNewsCard[] = [];
    const maxPerSource = fuente.url.includes("chaco.gob.ar") ? 4 : 3;

    if (fuente.url.includes("chaco.gob.ar")) {
      cards = await scrapeChacoGobListing(fuente.url);
    } else if (fuente.url.includes("letrap.com.ar")) {
      cards = await scrapeLetraPListing(fuente.url);
    } else if (fuente.url.includes("news.google.com/topics/")) {
      cards = await scrapeGoogleNewsTopicListing(fuente.url);
    }

    let addedFromThisSource = 0;
    for (const card of cards) {
      if (addedFromThisSource >= maxPerSource) break;

      const proxiedCardImg = toProxiedImageUrl(card.imageUrl);
      const yaExiste = existentes.some(
        (e) =>
          e.fuente_url === card.link ||
          e.imagen_url === proxiedCardImg ||
          e.titulo.toLowerCase() === card.title.toLowerCase()
      );

      if (!yaExiste && card.imageUrl) {
        let tituloFinal = toSentenceCaseHeadline(card.title);
        let volantaFinal = card.volanta || fuente.categoria_defecto.toUpperCase();
        let bajadaFinal = card.bajada || tituloFinal;
        let contenidoHtmlFinal = `<p><strong>${volantaFinal} —</strong> ${bajadaFinal}</p><p>Fuente original: <strong>${fuente.nombre}</strong>.</p>`;
        let imgFinal = card.imageUrl;

        // Si es chaco.gob.ar o letrap.com.ar, entrar al artículo para traer todos los párrafos completos
        if (
          card.link.includes("chaco.gob.ar") ||
          card.link.includes("letrap.com.ar")
        ) {
          const detail = await scrapeArticlePage(card.link);
          if (detail.title) tituloFinal = toSentenceCaseHeadline(detail.title);
          if (detail.volanta) volantaFinal = detail.volanta;
          if (detail.description) bajadaFinal = detail.description;
          if (detail.bodyHtml && detail.bodyHtml.length > 80) {
            contenidoHtmlFinal = detail.bodyHtml;
          }
          if (detail.imageUrl) imgFinal = detail.imageUrl;
        }

        const geo = clasificarGeografiaChaco(
          `${tituloFinal} ${bajadaFinal}`,
          fuente.categoria_defecto
        );

        const guardada = await saveNoticia({
          titulo: tituloFinal,
          volanta: volantaFinal,
          bajada: bajadaFinal,
          contenido_html: contenidoHtmlFinal,
          categoria_slug: geo.categoria,
          localidad: geo.localidad,
          imagen_url: toProxiedImageUrl(imgFinal),
          imagen_caption: `${volantaFinal} — Fotografía original correspondiente a la noticia`,
          autor: fuente.url.includes("letrap.com.ar")
            ? "Letra P / Redacción ChacoHoy"
            : "Redacción ChacoHoy",
          estado: addedFromThisSource < 2 ? "publicado" : "borrador",
          destacada: addedFromThisSource === 0,
          es_ia: true,
          fuente_nombre: fuente.nombre,
          fuente_url: card.link,
        });

        existentes.unshift(guardada);
        nuevas++;
        addedFromThisSource++;
      }
    }
  }

  await addLog({
    tipo: "scraper",
    estado: "exito",
    mensaje: `Recopilador extrajo ${nuevas} noticias reales (Chaco.gob.ar, Letra P y Google News Topics) con sus fotografías exactas.`,
  });

  return NextResponse.json({
    ok: true,
    nuevas,
    message: `¡Recopilación completada! Se sumaron ${nuevas} noticias reales de Nacionales, Internacionales, Ciencia y Tecnología, Economía y Política con sus fotos originales.`,
  });
}
