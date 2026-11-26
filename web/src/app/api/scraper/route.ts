import { NextRequest, NextResponse } from "next/server";
import {
  addLog,
  deleteNoticia,
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
 * Devuelve una volanta temática editorial limpia de ChacoHoy (nunca el nombre de otro medio).
 */
function getEditorialVolanta(
  categoria: CategoriaSlug,
  titulo: string
): string {
  const lower = titulo.toLowerCase();
  if (categoria === "locales") {
    if (lower.includes("obra") || lower.includes("pavimento") || lower.includes("acceso"))
      return "INFRAESTRUCTURA URBANA";
    if (lower.includes("salud") || lower.includes("hospital") || lower.includes("medicamento"))
      return "SALUD PÚBLICA";
    if (lower.includes("escuela") || lower.includes("educación") || lower.includes("docente"))
      return "EDUCACIÓN PROVINCIAL";
    return "GRAN RESISTENCIA";
  }
  if (categoria === "interior") {
    if (lower.includes("agua") || lower.includes("acueducto") || lower.includes("cloaca"))
      return "OBRAS EN EL INTERIOR";
    if (lower.includes("campo") || lower.includes("forestal") || lower.includes("producción"))
      return "PRODUCCIÓN CHAQUEÑA";
    return "INTERIOR PROVINCIAL";
  }
  if (categoria === "economia") {
    if (lower.includes("dólar") || lower.includes("mercado") || lower.includes("riesgo"))
      return "FINANZAS Y MERCADOS";
    if (lower.includes("inflación") || lower.includes("consumo") || lower.includes("oferta"))
      return "CONSUMO Y PRECIOS";
    return "PANORAMA ECONÓMICO";
  }
  if (categoria === "tecnologia") {
    if (lower.includes("nasa") || lower.includes("marte") || lower.includes("espacio") || lower.includes("ciencia"))
      return "CIENCIA Y ESPACIO";
    if (lower.includes("ia") || lower.includes("chatgpt") || lower.includes("inteligencia"))
      return "INTELIGENCIA ARTIFICIAL";
    return "INNOVACIÓN Y TECNOLOGÍA";
  }
  if (categoria === "internacionales") {
    return "AGENDA INTERNACIONAL";
  }
  if (categoria === "politica") {
    if (lower.includes("congreso") || lower.includes("diputado") || lower.includes("senado") || lower.includes("presupuesto"))
      return "DEBATE PARLAMENTARIO";
    return "ESCENARIO POLÍTICO";
  }
  return "PANORAMA NACIONAL";
}

/**
 * Limpia cualquier mención residual a nombres de medios externos dentro de un texto.
 */
function stripExternalMediaNames(text: string): string {
  return text
    .replace(
      /\b(?:según|a través de|fuente original:|publicó|informó)\s+(?:Infobae|Clarín|Clarin\.com|La Nación|Ámbito|Ambito|Página\/12|Página\|12|Letra P|Google News|DW\.com|3DJuegos)[^.]*\./gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca contexto periodístico adicional en Bing News RSS para ampliar noticias de Google News
 * y obtener descripciones reales de múltiples agencias sobre el mismo hecho.
 */
async function fetchExtendedTopicContext(headline: string): Promise<string[]> {
  const snippets: string[] = [];
  try {
    const cleanQuery = headline
      .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 7)
      .join(" ");
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(
      cleanQuery
    )}&format=rss&setlang=es-AR`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA },
    });
    clearTimeout(timeout);
    if (!res.ok) return snippets;

    const xml = await res.text();
    const descRegex =
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/gi;
    let m: RegExpExecArray | null;
    while ((m = descRegex.exec(xml)) !== null && snippets.length < 5) {
      const raw = decodeHtmlEntities(
        (m[1] || m[2] || "").replace(/<[^>]+>/g, " ")
      )
        .replace(/\s+/g, " ")
        .trim();
      if (
        raw.length > 65 &&
        !raw.toLowerCase().includes("bing news") &&
        !snippets.some((s) => s.slice(0, 40) === raw.slice(0, 40))
      ) {
        snippets.push(stripExternalMediaNames(raw));
      }
    }
  } catch {
    // Continuar sin snippets externos si hay timeout
  }
  return snippets;
}

/**
 * Construye una nota periodística extensa, informativa y 100% propia de ChacoHoy
 * (de 5 a 6 párrafos con subtítulos <h3> y sin mencionar jamás de dónde provino).
 */
async function buildComprehensiveArticle(params: {
  titulo: string;
  categoria: CategoriaSlug;
  localidad: string;
  relatedHeadlines?: string[];
  existingParagraphs?: string[];
}): Promise<{
  volanta: string;
  bajada: string;
  contenido_html: string;
}> {
  const {
    titulo,
    categoria,
    localidad,
    relatedHeadlines = [],
    existingParagraphs = [],
  } = params;
  const volanta = getEditorialVolanta(categoria, titulo);

  // 1. Si ya tenemos un cuerpo largo extraído directamente del artículo (ej. chaco.gob.ar o letrap.com.ar con 4+ párrafos)
  const validExisting = existingParagraphs
    .map((p) => stripExternalMediaNames(p))
    .filter((p) => p.length > 45);

  if (validExisting.length >= 4) {
    const bajada = validExisting[0].slice(0, 260);
    const htmlParts: string[] = [];
    validExisting.forEach((p, idx) => {
      if (p === p.toUpperCase() && p.length < 95) {
        htmlParts.push(`<h3>${toSentenceCaseHeadline(p)}</h3>`);
      } else {
        if (idx === 2 && !htmlParts.some((h) => h.startsWith("<h3>"))) {
          htmlParts.push(`<h3>Detalles y alcance de la medida</h3>`);
        }
        htmlParts.push(`<p>${p}</p>`);
      }
    });
    return {
      volanta,
      bajada,
      contenido_html: htmlParts.join(""),
    };
  }

  // 2. Si está configurada la clave de Gemini, pedirle un desarrollo periodístico extenso de 5 párrafos sin citar medios externos
  const apiKey = process.env.GEMINI_API_KEY;
  const extraSnippets = await fetchExtendedTopicContext(titulo);
  const contextMaterial = [
    ...validExisting,
    ...relatedHeadlines,
    ...extraSnippets,
  ]
    .filter(Boolean)
    .join("\n");

  if (apiKey) {
    try {
      const prompt = `Eres la redacción periodística de ChacoHoy. Redacta una noticia extensa, completa, seria e informativa (mínimo 5 párrafos largos y un subtítulo <h3>) sobre el siguiente hecho.
REGLAS ESTRICTAS:
1. PROHIBIDO mencionar a otros medios o fuentes externas (nunca menciones Infobae, Clarín, La Nación, Ámbito, Google News, Letra P, etc.).
2. Devuelve ÚNICAMENTE un JSON con:
{
  "volanta": "${volanta}",
  "bajada": "Copete periodístico informativo de 2 a 3 oraciones sin citar otros diarios",
  "contenido_html": "<p>Párrafo 1...</p><p>Párrafo 2...</p><h3>Subtítulo informativo</h3><p>Párrafo 3...</p><p>Párrafo 4...</p><p>Párrafo 5...</p>"
}

Titular: ${titulo}
Sección: ${categoria} (${localidad})
Datos y contexto del hecho:
${contextMaterial}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(textOut);
        if (parsed.contenido_html && parsed.contenido_html.length > 350) {
          return {
            volanta: parsed.volanta || volanta,
            bajada: stripExternalMediaNames(parsed.bajada || titulo),
            contenido_html: stripExternalMediaNames(parsed.contenido_html),
          };
        }
      }
    } catch {
      // Continuar con el motor editorial estructurado
    }
  }

  // 3. Motor Editorial Extenso de ChacoHoy (5 a 6 párrafos informativos combinando los datos recolectados del suceso)
  const cleanTitle = titulo.replace(/\.$/, "").trim();
  const leadSnippet =
    extraSnippets[0] ||
    validExisting[0] ||
    `${cleanTitle}, en el marco de una jornada marcada por el seguimiento de los principales indicadores y novedades del sector.`;

  const bajada =
    leadSnippet.length > 85
      ? leadSnippet.slice(0, 260)
      : `${cleanTitle}. El informe completo con los puntos clave, el contexto actualizado y las repercusiones del tema.`;

  const paragraphs: string[] = [];

  // Párrafo 1: Apertura informativa directa
  paragraphs.push(
    `<p>${cleanTitle}. ${
      extraSnippets[0] && extraSnippets[0] !== cleanTitle
        ? extraSnippets[0]
        : "El tema se ubicó en el centro de la agenda informativa tras conocerse los últimos reportes oficiales y el análisis de los especialistas del área."
    }</p>`
  );

  // Párrafo 2: Desarrollo de antecedentes / segundo snippet real
  if (extraSnippets[1]) {
    paragraphs.push(`<p>${extraSnippets[1]}</p>`);
  } else if (relatedHeadlines[0]) {
    paragraphs.push(
      `<p>En la misma línea, dentro del evolución reciente del caso se destacó que ${
        relatedHeadlines[0].charAt(0).toLowerCase() +
        relatedHeadlines[0].slice(1)
      }, lo que aportó nuevos elementos para comprender la dimensión del acontecimiento.</p>`
    );
  } else {
    paragraphs.push(
      `<p>De acuerdo con los datos relevados, la situación involucra una serie de factores técnicos y operativos que vienen siendo monitoreados de cerca para evaluar su evolución en el corto y mediano plazo.</p>`
    );
  }

  // Subtítulo intermedio según la sección
  const subtituloPorSeccion: Record<CategoriaSlug, string> = {
    locales: "Impacto y seguimiento en el área metropolitana",
    interior: "Alcance en las localidades del interior chaqueño",
    politica: "Claves del escenario político y parlamentario",
    economia: "Análisis de los indicadores y perspectivas del sector",
    nacionales: "Los puntos centrales y el impacto a nivel nacional",
    internacionales: "Repercusiones y contexto en el escenario global",
    tecnologia: "Detalles técnicos y avances de la investigación",
  };
  paragraphs.push(`<h3>${subtituloPorSeccion[categoria]}</h3>`);

  // Párrafo 3: Tercer snippet o desglose temático
  if (extraSnippets[2]) {
    paragraphs.push(`<p>${extraSnippets[2]}</p>`);
  } else if (relatedHeadlines[1]) {
    paragraphs.push(
      `<p>Asimismo, otro de los ejes relevantes vinculados al tema señala que ${
        relatedHeadlines[1].charAt(0).toLowerCase() +
        relatedHeadlines[1].slice(1)
      }, ampliando el panorama sobre las decisiones y estudios en curso.</p>`
    );
  } else {
    paragraphs.push(
      `<p>Los informes técnicos subrayan que este tipo de novedades genera un efecto directo sobre la planificación del sector, abriendo nuevas etapas de evaluación por parte de los equipos intervinientes y las instituciones vinculadas.</p>`
    );
  }

  // Párrafo 4: Cuarto snippet o profundización por categoría
  if (extraSnippets[3]) {
    paragraphs.push(`<p>${extraSnippets[3]}</p>`);
  } else {
    const contextoPorCategoria: Record<CategoriaSlug, string> = {
      locales:
        "En el Gran Resistencia, las autoridades y equipos técnicos mantienen un esquema de trabajo articulado para dar seguimiento a cada etapa de implementación y responder a las demandas de los vecinos de la capital chaqueña y zonas aledañas.",
      interior:
        "Para las comunidades del interior de la provincia del Chaco, estas acciones representan un paso significativo en materia de integración territorial, fortaleciendo la infraestructura y los servicios en las distintas regiones productivas.",
      politica:
        "En el plano institucional, las negociaciones y el intercambio entre los distintos bloques y actores políticos continuarán durante los próximos días con el objetivo de alcanzar consensos en torno a los puntos principales de la agenda.",
      economia:
        "Los analistas económicos coinciden en que la dinámica de las próximas semanas será determinante para consolidar la tendencia, prestando especial atención al comportamiento del consumo, la actividad productiva y la estabilidad financiera.",
      nacionales:
        "A nivel federal, la medida es seguida con atención por las provincias y los distintos sectores sociales y productivos de la Argentina, dado su impacto directo en la actividad cotidiana y en la agenda pública nacional.",
      internacionales:
        "En el plano diplomático y geopolítico, los observadores internacionales advierten que el desarrollo de los acontecimientos en las próximas jornadas marcará el pulso de las relaciones bilaterales y los acuerdos multilaterales en la región.",
      tecnologia:
        "Especialistas e investigadores del ámbito científico y tecnológico destacaron la relevancia del avance, señalando que las próximas pruebas y actualizaciones permitirán conocer con mayor precisión todo el potencial de este desarrollo.",
    };
    paragraphs.push(`<p>${contextoPorCategoria[categoria]}</p>`);
  }

  // Párrafo 5: Cierre periodístico informativo
  paragraphs.push(
    `<p>Se espera que en el transcurso de las próximas horas se den a conocer nuevos informes y precisiones oficiales que permitan ampliar los detalles sobre la evolución de este tema.</p>`
  );

  return {
    volanta,
    bajada: stripExternalMediaNames(bajada),
    contenido_html: paragraphs.join(""),
  };
}

/**
 * Extrae título, volanta, texto completo (todos los párrafos) y la IMAGEN REAL EXACTA
 * desde una URL de noticia (compatible con chaco.gob.ar, letrap.com.ar y cualquier diario digital).
 */
async function scrapeArticlePage(articleUrl: string): Promise<{
  title?: string;
  volanta?: string;
  description?: string;
  paragraphs?: string[];
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

    // 5. Extraer Descripción / Bajada (og:description)
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

    // 6. Extraer TODOS los párrafos del cuerpo del artículo:
    const paragraphs: string[] = [];
    const chacoContentMatch = html.match(
      /<h5[^>]+class=["'][^"']*content-news[^"']*["'][^>]*>([\s\S]*?)<\/h5>/i
    );

    if (chacoContentMatch?.[1]) {
      const rawBlocks = chacoContentMatch[1]
        .replace(/<\/?div[^>]*>/gi, "\n")
        .split(/(?:<br\s*\/?>\s*){2,}|\n{2,}/gi);

      for (const b of rawBlocks) {
        const cleanP = decodeHtmlEntities(
          b.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")
        )
          .replace(/\s+/g, " ")
          .trim();
        if (cleanP.length > 25) {
          paragraphs.push(cleanP);
        }
      }
    } else {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pRegex.exec(html)) !== null && paragraphs.length < 18) {
        const cleanP = decodeHtmlEntities(pMatch[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim();
        if (
          cleanP.length > 55 &&
          !cleanP.toLowerCase().includes("cookies") &&
          !cleanP.toLowerCase().includes("todos los derechos reservados") &&
          !cleanP.toLowerCase().includes("suscribite")
        ) {
          paragraphs.push(cleanP);
        }
      }
    }

    return {
      title,
      description: ogDescription || paragraphs[0],
      paragraphs,
      imageUrl,
    };
  } catch {
    return {};
  }
}

interface ListedNewsCard {
  title: string;
  link: string;
  imageUrl: string;
  bajada?: string;
  relatedHeadlines?: string[];
}

/**
 * 1. Scraper de chaco.gob.ar/noticias
 */
async function scrapeChacoGobListing(
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
      const h3Match = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);

      if (hrefMatch?.[1] && h3Match?.[1]) {
        const link = new URL(hrefMatch[1].trim(), portalUrl).toString();
        const imageUrl = imgMatch?.[1]
          ? new URL(imgMatch[1].trim(), portalUrl).toString()
          : "";
        const title = decodeHtmlEntities(h3Match[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim();

        if (title && imageUrl && !isIgnoredImage(imageUrl)) {
          results.push({ title, link, imageUrl });
        }
      }
    }
  } catch (e) {
    console.warn("Error raspando chaco.gob.ar:", e);
  }
  return results;
}

/**
 * 2. Scraper de Letra P (https://www.letrap.com.ar/)
 */
async function scrapeLetraPListing(
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
      const titleMatch = articleHtml.match(
        /<h[1234][^>]+class=["'][^"']*news-article__title[^"']*["'][^>]*>([\s\S]*?)<\/h[1234]>/i
      );

      const imageUrl = imgMatch?.[1]?.trim() || "";
      const title = titleMatch?.[1]
        ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " "))
            .replace(/\s+/g, " ")
            .trim()
        : "";
      const bajada = altMatch?.[1]
        ? decodeHtmlEntities(altMatch[1]).replace(/\s+/g, " ").trim()
        : undefined;

      if (
        title &&
        imageUrl &&
        !isIgnoredImage(imageUrl) &&
        !results.some((r) => r.link === link)
      ) {
        results.push({ title, link, imageUrl, bajada });
      }
    }
  } catch (e) {
    console.warn("Error raspando Letra P:", e);
  }
  return results;
}

/**
 * 3. Scraper de páginas de Tópicos de Google News (https://news.google.com/topics/CAAq...)
 * Extrae las noticias con la foto real exacta (/api/attachments/...-w560-h336-p-df) y los titulares relacionados del cluster
 * sin guardar ni mostrar el nombre del medio externo.
 */
async function scrapeGoogleNewsTopicListing(
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
    const cardRegex =
      /<figure[^>]+class=["'][^"']*K0q4G[^"']*["'][^>]*>\s*<img[^>]+src=["'](\/api\/attachments\/[^"']+)["'][^>]*>\s*<\/figure>[\s\S]{1,4200}?<a[^>]+class=["']gPFEn["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>([\s\S]{0,3000}?)(?=<figure[^>]+class=["'][^"']*K0q4G|$)/gi;

    let match: RegExpExecArray | null;
    while ((match = cardRegex.exec(html)) !== null && results.length < 5) {
      const rawImgPath = match[1]
        .replace(/-w\d+-h\d+-p-df/i, "-w560-h336-p-df")
        .trim();
      const imageUrl = new URL(
        rawImgPath,
        "https://news.google.com"
      ).toString();
      const rawHref = decodeHtmlEntities(match[2]).replace(/^\.\//, "/");
      const link = new URL(rawHref, "https://news.google.com").toString();
      const title = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .replace(
          /\s+Hace\s+\d+\s+(?:hora|horas|minuto|minutos|d[ií]a|d[ií]as)[\s\S]*$/i,
          ""
        )
        .trim();

      // Extraer titulares secundarios del mismo cluster de cobertura en Google News para enriquecer el cuerpo de la noticia
      const clusterTail = match[4] || "";
      const relatedHeadlines: string[] = [];
      const relRegex = /<a[^>]+class=["']gPFEn["'][^>]*>([\s\S]*?)<\/a>/gi;
      let relMatch: RegExpExecArray | null;
      while (
        (relMatch = relRegex.exec(clusterTail)) !== null &&
        relatedHeadlines.length < 3
      ) {
        const relTitle = decodeHtmlEntities(
          relMatch[1].replace(/<[^>]+>/g, " ")
        )
          .replace(/\s+/g, " ")
          .trim();
        if (relTitle && relTitle.length > 20 && relTitle !== title) {
          relatedHeadlines.push(relTitle);
        }
      }

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
          relatedHeadlines,
        });
      }
    }
  } catch (e) {
    console.warn("Error raspando Google News Topic:", e);
  }
  return results;
}

function clasificarGeografiaChaco(
  texto: string,
  categoriaDefecto: CategoriaSlug = "locales"
): { categoria: CategoriaSlug; localidad: string } {
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

  const locMap: Record<CategoriaSlug, string> = {
    locales: "Resistencia",
    interior: "Interior del Chaco",
    politica: "Argentina",
    economia: "Argentina",
    nacionales: "Argentina",
    internacionales: "Internacional",
    tecnologia: "Tecnología",
  };

  return {
    categoria: categoriaDefecto,
    localidad: locMap[categoriaDefecto] || "Chaco",
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

const FUENTES_OFICIALES_USUARIO: Array<{
  id: string;
  nombre: string;
  url: string;
  tipo: "web_chaco" | "google_news" | "rss";
  categoria_defecto: CategoriaSlug;
}> = [
  {
    id: "f-chaco-gob",
    nombre: "Actualidad Chaco (Locales e Interior)",
    url: "https://chaco.gob.ar/noticias",
    tipo: "web_chaco",
    categoria_defecto: "locales",
  },
  {
    id: "f-letrap",
    nombre: "Política y Congreso",
    url: "https://www.letrap.com.ar/",
    tipo: "web_chaco",
    categoria_defecto: "politica",
  },
  {
    id: "f-gn-nacionales",
    nombre: "Nacionales Argentina",
    url: "https://news.google.com/topics/CAAqJQgKIh9DQkFTRVFvSEwyMHZNR3BuWkJJR1pYTXROREU1S0FBUAE?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "nacionales",
  },
  {
    id: "f-gn-internacionales",
    nombre: "Internacionales",
    url: "https://news.google.com/topics/CAAqLAgKIiZDQkFTRmdvSUwyMHZNRGx1YlY4U0JtVnpMVFF4T1JvQ1FWSW9BQVAB?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "internacionales",
  },
  {
    id: "f-gn-tecnologia",
    nombre: "Ciencia y Tecnología",
    url: "https://news.google.com/topics/CAAqLQgKIidDQkFTRndvSkwyMHZNR1ptZHpWbUVnWmxjeTAwTVRrYUFrRlNLQUFQAQ?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "tecnologia",
  },
  {
    id: "f-gn-economia",
    nombre: "Economía y Mercados",
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
    const existingParagraphs =
      scraped.paragraphs && scraped.paragraphs.length > 0
        ? scraped.paragraphs
        : rawText.split(/\n+/).filter(Boolean);

    const geo = clasificarGeografiaChaco(
      `${titleBase} ${existingParagraphs.join(" ")}`,
      "locales"
    );

    const built = await buildComprehensiveArticle({
      titulo: titleBase,
      categoria: geo.categoria,
      localidad: geo.localidad,
      existingParagraphs,
    });

    await addLog({
      tipo: "ia_gemini",
      estado: "exito",
      mensaje: `Noticia redactada en formato extenso y clasificada en '${geo.categoria}' (${geo.localidad}).`,
    });

    return NextResponse.json({
      resultado: {
        titulo_reescrito: titleBase,
        volanta: built.volanta,
        bajada: built.bajada,
        desarrollo_html: built.contenido_html,
        categoria: geo.categoria,
        localidad: geo.localidad,
        imagen_url: toProxiedImageUrl(scraped.imageUrl),
      },
    });
  }

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

  // Limpiar o actualizar cualquier noticia existente que tuviera texto corto o mencionara "Fuente original:" / nombres de otros medios en la volanta
  const prevNoticias = await getNoticias();
  for (const prev of prevNoticias) {
    if (
      prev.contenido_html.includes("Fuente original:") ||
      prev.bajada.includes("a través de") ||
      prev.contenido_html.length < 320
    ) {
      await deleteNoticia(prev.id);
    }
  }

  const fuentes = (await getFuentes()).filter((f) => f.activa);
  const existentes = await getNoticias();
  let nuevas = 0;

  for (const fuente of fuentes) {
    let cards: ListedNewsCard[] = [];
    const maxPerSource = fuente.url.includes("chaco.gob.ar") ? 5 : 3;

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
        let existingParagraphs: string[] = card.bajada ? [card.bajada] : [];
        let imgFinal = card.imageUrl;

        if (
          card.link.includes("chaco.gob.ar") ||
          card.link.includes("letrap.com.ar")
        ) {
          const detail = await scrapeArticlePage(card.link);
          if (detail.title) tituloFinal = toSentenceCaseHeadline(detail.title);
          if (detail.paragraphs && detail.paragraphs.length > 0) {
            existingParagraphs = detail.paragraphs;
          }
          if (detail.imageUrl) imgFinal = detail.imageUrl;
        }

        const geo = clasificarGeografiaChaco(
          `${tituloFinal} ${existingParagraphs.join(" ")}`,
          fuente.categoria_defecto
        );

        const built = await buildComprehensiveArticle({
          titulo: tituloFinal,
          categoria: geo.categoria,
          localidad: geo.localidad,
          relatedHeadlines: card.relatedHeadlines,
          existingParagraphs,
        });

        const guardada = await saveNoticia({
          titulo: tituloFinal,
          volanta: built.volanta,
          bajada: built.bajada,
          contenido_html: built.contenido_html,
          categoria_slug: geo.categoria,
          localidad: geo.localidad,
          imagen_url: toProxiedImageUrl(imgFinal),
          imagen_caption: `${built.volanta} — ChacoHoy`,
          autor: "Redacción ChacoHoy",
          estado: addedFromThisSource < 2 ? "publicado" : "borrador",
          destacada: addedFromThisSource === 0,
          es_ia: true,
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
    mensaje: `Recopilador procesó ${nuevas} noticias extensas con desarrollo completo de Redacción ChacoHoy.`,
  });

  return NextResponse.json({
    ok: true,
    nuevas,
    message: `¡Se actualizaron ${nuevas} noticias con desarrollo periodístico extenso y sin menciones a fuentes externas!`,
  });
}
