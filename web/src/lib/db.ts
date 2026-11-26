import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  CATEGORIAS_OFICIALES,
  Categoria,
  FuenteScraping,
  LogActividad,
  MetaConfig,
  Noticia,
} from "./types";

interface LocalDatabaseSchema {
  categorias: Categoria[];
  noticias: Noticia[];
  fuentes: FuenteScraping[];
  logs: LogActividad[];
  meta_config?: MetaConfig;
}

const DATA_DIR = path.join(process.cwd(), "data");
const BUNDLED_DB_FILE = path.join(DATA_DIR, "local-db.json");
const TMP_DB_FILE = path.join("/tmp", "chacohoy-local-db.json");
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const INITIAL_NOTICIAS: Noticia[] = [
  {
    id: "not-1",
    titulo: "Plan de pavimentación e iluminación LED avanza en avenidas troncales del Gran Resistencia",
    slug: "plan-pavimentacion-iluminacion-led-avanza-gran-resistencia",
    volanta: "INFRAESTRUCTURA URBANA",
    bajada: "Las obras conectan corredores clave entre Resistencia, Barranqueras y Fontana para optimizar el transporte público y la seguridad vial en horarios nocturnos.",
    contenido_html: `<p>El programa integral de infraestructura metropolitana continúa ejecutando nuevos frentes de obra en las principales arterias que vinculan a <strong>Resistencia</strong> con <strong>Barranqueras</strong>, <strong>Fontana</strong> y <strong>Puerto Vilelas</strong>.</p><p>Según informaron desde la coordinación técnica, los trabajos incluyen bacheo profundo de hormigón, readecuación de desagües pluviales y la instalación de más de 1.200 luminarias LED de alta eficiencia energética.</p><h3>Impacto en los barrios y corredores seguros</h3><p>Vecinos y comerciantes de la zona destacaron que la renovación lumínica y el nuevo asfalto permiten descomprimir el tránsito en horas pico, mejorando además la frecuencia de las líneas interurbanas de colectivos.</p><blockquote>"Nuestra prioridad es consolidar una red vial moderna y segura para todas las familias del área metropolitana", señalaron durante la recorrida de obra.</blockquote>`,
    categoria_slug: "locales",
    localidad: "Resistencia",
    imagen_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Nuevos corredores viales con tecnología LED en la capital chaqueña.",
    autor: "Redacción ChacoHoy",
    estado: "publicado",
    destacada: true,
    es_ia: false,
    publicado_fb: true,
    publicado_ig: true,
    vistas: 1840,
    published_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "not-2",
    titulo: "Sáenz Peña y Charata lideran la inversión agroindustrial con nuevas plantas de acopio y logística",
    slug: "saenz-pena-charata-lideran-inversion-agroindustrial-chaco",
    volanta: "DESARROLLO DEL INTERIOR",
    bajada: "Productores y cooperativas del centro y sudoeste chaqueño amplían su capacidad instalada de cara a la próxima campaña agrícola.",
    contenido_html: `<p>El interior de la provincia del Chaco consolida un nuevo polo de crecimiento productivo con eje en <strong>Presidencia Roque Sáenz Peña</strong>, <strong>Charata</strong> y <strong>Villa Ángela</strong>.</p><p>Con inversiones privadas y financiamiento orientado al agregado de valor en origen, las nuevas instalaciones permitirán reducir costos de flete y mejorar la competitividad del algodón, girasol, maíz y soja chaqueños.</p><h3>Empleo genuino en el interior provincial</h3><p>Las cámaras empresarias del sudoeste subrayaron la incorporación de mano de obra técnica local y la articulación con universidades y escuelas técnicas de la región.</p>`,
    categoria_slug: "interior",
    localidad: "Sáenz Peña",
    imagen_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Expansión agroindustrial en el centro y sudoeste del Chaco.",
    autor: "Redacción ChacoHoy",
    estado: "publicado",
    destacada: true,
    es_ia: true,
    fuente_nombre: "Recopilador IA ChacoHoy",
    publicado_fb: true,
    publicado_ig: false,
    vistas: 1290,
    published_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "not-3",
    titulo: "Debate legislativo en Chaco por el presupuesto y las partidas destinadas a educación y salud",
    slug: "debate-legislativo-chaco-presupuesto-educacion-salud",
    volanta: "AGENDA PARLAMENTARIA",
    bajada: "Las comisiones permanentes analizan las proyecciones fiscales, la inversión en infraestructura escolar y la modernización hospitalaria.",
    contenido_html: `<p>La Cámara de Diputados del Chaco avanza en el tratamiento de los proyectos estratégicos para el próximo período fiscal, con especial énfasis en el equilibrio de las cuentas públicas y el fortalecimiento de los servicios esenciales.</p><p>Durante las reuniones de comisión, legisladores de los distintos bloques escucharon informes técnicos sobre la ejecución presupuestaria y las obras prioritarias para los 70 municipios de la provincia.</p>`,
    categoria_slug: "politica",
    localidad: "Resistencia",
    imagen_url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Sesión y trabajo en comisiones en la Legislatura chaqueña.",
    autor: "Redacción ChacoHoy",
    estado: "publicado",
    destacada: false,
    es_ia: false,
    publicado_fb: false,
    publicado_ig: false,
    vistas: 940,
    published_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: "not-4",
    titulo: "Comercios del Chaco registran repunte en ventas con promociones bancarias y billeteras digitales",
    slug: "comercios-chaco-repunte-ventas-promociones-billeteras-digitales",
    volanta: "CONSUMO Y FINANZAS",
    bajada: "Los planes en cuotas sin interés impulsaron los rubros de indumentaria, electrodomésticos y supermercados en toda la provincia.",
    contenido_html: `<p>Las cámaras de comercio de <strong>Resistencia</strong> y las principales ciudades del interior informaron un crecimiento en el volumen de operaciones gracias a los acuerdos con entidades financieras y pagos mediante QR.</p><p>Los comerciantes destacaron que la financiación en 3, 6 y 12 cuotas volvió a traccionar la demanda de bienes durables y equipamiento para el hogar.</p>`,
    categoria_slug: "economia",
    localidad: "Resistencia",
    imagen_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Pagos digitales y financiación impulsan la actividad comercial.",
    autor: "Redacción ChacoHoy",
    estado: "publicado",
    destacada: false,
    es_ia: true,
    fuente_nombre: "Google News Economía",
    publicado_fb: true,
    publicado_ig: true,
    vistas: 815,
    published_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
  },
  {
    id: "not-5",
    titulo: "Argentina impulsa la exportación de servicios basados en el conocimiento e inteligencia artificial",
    slug: "argentina-impulsa-exportacion-servicios-conocimiento-ia",
    volanta: "PANORAMA NACIONAL",
    bajada: "El sector tecnológico supera récords de facturación externa con talento distribuido en todas las provincias del país.",
    contenido_html: `<p>La economía del conocimiento se consolida como el tercer complejo exportador de la <strong>República Argentina</strong>, traccionada por el desarrollo de software, biotecnología y soluciones de inteligencia artificial generativa.</p><p>Polos tecnológicos del NEA, incluyendo emprendedores y graduados en el Chaco, participan activamente en proyectos internacionales de alto valor agregado.</p>`,
    categoria_slug: "nacionales",
    localidad: "Buenos Aires",
    imagen_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Crecimiento federal del sector de economía del conocimiento.",
    autor: "Agencia Nacional",
    estado: "publicado",
    destacada: false,
    es_ia: true,
    fuente_nombre: "Google News Argentina",
    publicado_fb: false,
    publicado_ig: false,
    vistas: 670,
    published_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: "not-6",
    titulo: "Cumbre del Mercosur e integración energética: acuerdos clave para el corredor bioceánico norte",
    slug: "cumbre-mercosur-integracion-energetica-corredor-bioceanico",
    volanta: "AGENDA GLOBAL",
    bajada: "Los países de la región priorizan obras de conectividad logística y transporte fluvial en la hidrovía Paraná-Paraguay.",
    contenido_html: `<p>Los cancilleres y ministros de Infraestructura del bloque regional definieron una hoja de ruta para potenciar el corredor bioceánico y modernizar los puertos sobre la hidrovía Paraná-Paraguay, un eje estratégico para la salida exportadora del Chaco y el Norte Grande.</p>`,
    categoria_slug: "internacionales",
    localidad: "Mercosur",
    imagen_url: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Conectividad logística e hidrovía en la agenda regional.",
    autor: "Redacción Internacional",
    estado: "publicado",
    destacada: false,
    es_ia: false,
    publicado_fb: false,
    publicado_ig: false,
    vistas: 530,
    published_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: "not-7",
    titulo: "Nuevos modelos de IA ultralivianos permiten automatizar redacciones y análisis de datos en tiempo real",
    slug: "nuevos-modelos-ia-ultralivianos-automatizar-redacciones-datos",
    volanta: "INNOVACIÓN DIGITAL",
    bajada: "Las herramientas de última generación aceleran la clasificación geográfica, verificación de fuentes y edición multimedia.",
    contenido_html: `<p>El avance de los modelos multimodales como <strong>Gemini Flash</strong> está transformando el flujo de trabajo en medios digitales y empresas tecnológicas, permitiendo clasificar información regional, generar resúmenes ejecutivos y asistir a los periodistas sin perder el control editorial humano.</p>`,
    categoria_slug: "tecnologia",
    localidad: "Global",
    imagen_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Inteligencia Artificial aplicada al periodismo de nueva generación.",
    autor: "ChacoHoy Tech",
    estado: "publicado",
    destacada: false,
    es_ia: true,
    fuente_nombre: "Google News Tecnología",
    publicado_fb: true,
    publicado_ig: true,
    vistas: 1120,
    published_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
  },
  {
    id: "not-8",
    titulo: "[BORRADOR IA] Operativo de pavimentación y desagües pluviales en Juan José Castelli y El Impenetrable",
    slug: "borrador-ia-operativo-pavimentacion-desagues-castelli",
    volanta: "INTERIOR CHAQUEÑO",
    bajada: "Noticia extraída automáticamente por el Recopilador IA lista para tu revisión editorial antes de publicar en ChacoHoy e Instagram.",
    contenido_html: `<p>Equipos viales trabajan en el acceso principal y barrios de <strong>Juan José Castelli</strong> para consolidar nuevas cuadras de pavimento urbano y alcantarillado antes de la temporada de lluvias.</p><p><em>(Este artículo fue clasificado automáticamente en la categoría <strong>Interior</strong> al detectar la localidad de Juan José Castelli y se guardó en estado Borrador según tu configuración).</em></p>`,
    categoria_slug: "interior",
    localidad: "Juan José Castelli",
    imagen_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
    imagen_caption: "Obras viales en el portal de El Impenetrable.",
    autor: "Recopilador IA (Gemini)",
    estado: "borrador",
    destacada: false,
    es_ia: true,
    fuente_nombre: "Google News - Interior del Chaco",
    fuente_url: "https://news.google.com/rss/search?q=Castelli+Chaco",
    publicado_fb: false,
    publicado_ig: false,
    vistas: 0,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const INITIAL_FUENTES: FuenteScraping[] = [
  {
    id: "f-chaco-gob",
    nombre: "Gobierno del Chaco - Noticias (Locales e Interior)",
    url: "https://chaco.gob.ar/noticias",
    tipo: "web_chaco",
    categoria_defecto: "locales",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 9,
  },
  {
    id: "f-letrap",
    nombre: "Letra P - Nacionales y Política (letrap.com.ar)",
    url: "https://www.letrap.com.ar/",
    tipo: "web_chaco",
    categoria_defecto: "politica",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 3,
  },
  {
    id: "f-gn-nacionales",
    nombre: "Google News - Nacionales Argentina",
    url: "https://news.google.com/topics/CAAqJQgKIh9DQkFTRVFvSEwyMHZNR3BuWkJJR1pYTXROREU1S0FBUAE?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "nacionales",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 3,
  },
  {
    id: "f-gn-internacionales",
    nombre: "Google News - Internacionales",
    url: "https://news.google.com/topics/CAAqLAgKIiZDQkFTRmdvSUwyMHZNRGx1YlY4U0JtVnpMVFF4T1JvQ1FWSW9BQVAB?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "internacionales",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 3,
  },
  {
    id: "f-gn-tecnologia",
    nombre: "Google News - Ciencia y Tecnología",
    url: "https://news.google.com/topics/CAAqLQgKIidDQkFTRndvSkwyMHZNR1ptZHpWbUVnWmxjeTAwTVRrYUFrRlNLQUFQAQ?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "tecnologia",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 3,
  },
  {
    id: "f-gn-economia",
    nombre: "Google News - Economía",
    url: "https://news.google.com/topics/CAAqLAgKIiZDQkFTRmdvSUwyMHZNRGx6TVdZU0JtVnpMVFF4T1JvQ1FWSW9BQVAB?hl=es-419&gl=AR&ceid=AR%3Aes-419",
    tipo: "google_news",
    categoria_defecto: "economia",
    activa: true,
    autopublicar_web: false,
    autopublicar_redes: false,
    ultima_ejecucion: new Date().toISOString(),
    noticias_extraidas: 3,
  },
];

const INITIAL_LOGS: LogActividad[] = [
  {
    id: "log-1",
    tipo: "ia_gemini",
    estado: "exito",
    mensaje: "Noticia clasificada en 'Interior' (Localidad detectada: Juan José Castelli) -> Guardada en Borrador.",
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "log-2",
    tipo: "scraper",
    estado: "exito",
    mensaje: "Lectura RSS Google News Chaco completada: 5 fuentes activas analizadas, 2 duplicados descartados.",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "log-3",
    tipo: "social_ig",
    estado: "exito",
    mensaje: "Placa Instagram 4:5 (1080x1350) generada al vuelo para noticia destacada de Gran Resistencia.",
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && url.startsWith("http")) {
    return createClient(url, key);
  }
  return null;
}

function readLocalDb(): LocalDatabaseSchema {
  try {
    if (IS_SERVERLESS && fs.existsSync(TMP_DB_FILE)) {
      return JSON.parse(
        fs.readFileSync(TMP_DB_FILE, "utf-8")
      ) as LocalDatabaseSchema;
    }
    if (fs.existsSync(BUNDLED_DB_FILE)) {
      const parsed = JSON.parse(
        fs.readFileSync(BUNDLED_DB_FILE, "utf-8")
      ) as LocalDatabaseSchema;
      if (IS_SERVERLESS) {
        try {
          fs.writeFileSync(TMP_DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
        } catch {}
      }
      return parsed;
    }
    const seed: LocalDatabaseSchema = {
      categorias: CATEGORIAS_OFICIALES,
      noticias: INITIAL_NOTICIAS,
      fuentes: INITIAL_FUENTES,
      logs: INITIAL_LOGS,
    };
    writeLocalDb(seed);
    return seed;
  } catch {
    return {
      categorias: CATEGORIAS_OFICIALES,
      noticias: INITIAL_NOTICIAS,
      fuentes: INITIAL_FUENTES,
      logs: INITIAL_LOGS,
    };
  }
}

function writeLocalDb(data: LocalDatabaseSchema): void {
  try {
    if (IS_SERVERLESS) {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      return;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BUNDLED_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error guardando DB local:", e);
    }
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 95);
}

export async function getNoticias(options?: {
  soloPublicadas?: boolean;
  categoria?: string;
  busqueda?: string;
}): Promise<Noticia[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase
      .from("noticias")
      .select("*")
      .order("published_at", { ascending: false });
    if (options?.soloPublicadas) {
      query = query.eq("estado", "publicado");
    }
    if (options?.categoria) {
      query = query.eq("categoria_slug", options.categoria);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data as Noticia[];
    }
  }

  const db = readLocalDb();
  let list = [...db.noticias].sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  if (options?.soloPublicadas) {
    list = list.filter((n) => n.estado === "publicado");
  }
  if (options?.categoria) {
    list = list.filter((n) => n.categoria_slug === options.categoria);
  }
  if (options?.busqueda) {
    const q = options.busqueda.toLowerCase();
    list = list.filter(
      (n) =>
        n.titulo.toLowerCase().includes(q) ||
        n.bajada.toLowerCase().includes(q) ||
        n.localidad.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function getNoticiaBySlugOrId(
  slugOrId: string
): Promise<Noticia | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from("noticias")
      .select("*")
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .maybeSingle();
    if (data) return data as Noticia;
  }

  const db = readLocalDb();
  return (
    db.noticias.find((n) => n.slug === slugOrId || n.id === slugOrId) || null
  );
}

export async function saveNoticia(
  input: Partial<Noticia> & { titulo: string }
): Promise<Noticia> {
  const db = readLocalDb();
  const now = new Date().toISOString();
  const existingIndex = input.id
    ? db.noticias.findIndex((n) => n.id === input.id)
    : -1;

  const noticia: Noticia =
    existingIndex >= 0
      ? {
          ...db.noticias[existingIndex],
          ...input,
          slug: input.slug || db.noticias[existingIndex].slug,
        }
      : {
          id: input.id || `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          titulo: input.titulo,
          slug:
            input.slug ||
            `${slugify(input.titulo)}-${Math.floor(100 + Math.random() * 900)}`,
          volanta: input.volanta || "ACTUALIDAD",
          bajada: input.bajada || input.titulo,
          contenido_html: input.contenido_html || `<p>${input.bajada || input.titulo}</p>`,
          categoria_slug: input.categoria_slug || "locales",
          localidad: input.localidad || "Resistencia",
          imagen_url:
            input.imagen_url ||
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
          imagen_caption: input.imagen_caption || "ChacoHoy - Periodismo Digital",
          autor: input.autor || "Redacción ChacoHoy",
          estado: input.estado || "borrador",
          destacada: input.destacada ?? false,
          es_ia: input.es_ia ?? false,
          fuente_nombre: input.fuente_nombre,
          fuente_url: input.fuente_url,
          publicado_fb: input.publicado_fb ?? false,
          publicado_ig: input.publicado_ig ?? false,
          vistas: input.vistas ?? 1,
          published_at: input.published_at || now,
          created_at: now,
        };

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("noticias").upsert(noticia);
  }

  if (existingIndex >= 0) {
    db.noticias[existingIndex] = noticia;
  } else {
    db.noticias.unshift(noticia);
  }
  writeLocalDb(db);
  return noticia;
}

export async function deleteNoticia(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("noticias").delete().eq("id", id);
  }
  const db = readLocalDb();
  db.noticias = db.noticias.filter((n) => n.id !== id);
  writeLocalDb(db);
  return true;
}

export async function getFuentes(): Promise<FuenteScraping[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("fuentes")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) return data as FuenteScraping[];
  }
  return readLocalDb().fuentes;
}

export async function saveFuente(
  input: Partial<FuenteScraping> & { nombre: string; url: string }
): Promise<FuenteScraping> {
  const db = readLocalDb();
  const idx = db.fuentes.findIndex(
    (f) => (input.id && f.id === input.id) || f.url === input.url
  );
  const fuente: FuenteScraping =
    idx >= 0
      ? { ...db.fuentes[idx], ...input }
      : {
          id: input.id || `f-${Date.now()}`,
          nombre: input.nombre,
          url: input.url,
          tipo: input.tipo || "google_news",
          categoria_defecto: input.categoria_defecto || "locales",
          activa: input.activa ?? true,
          autopublicar_web: input.autopublicar_web ?? false,
          autopublicar_redes: input.autopublicar_redes ?? false,
          noticias_extraidas: 0,
        };

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("fuentes").upsert(fuente);
  }

  if (idx >= 0) {
    db.fuentes[idx] = fuente;
  } else {
    db.fuentes.push(fuente);
  }
  writeLocalDb(db);
  return fuente;
}

export async function deleteFuente(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("fuentes").delete().eq("id", id);
  }
  const db = readLocalDb();
  db.fuentes = db.fuentes.filter((f) => f.id !== id);
  writeLocalDb(db);
  return true;
}

export async function getLogs(): Promise<LogActividad[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from("logs_actividad")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data && data.length > 0) return data as LogActividad[];
  }
  return readLocalDb().logs.slice(0, 30);
}

export async function addLog(
  log: Omit<LogActividad, "id" | "created_at">
): Promise<void> {
  const entry: LogActividad = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    created_at: new Date().toISOString(),
    ...log,
  };
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("logs_actividad").insert(entry);
  }
  const db = readLocalDb();
  db.logs.unshift(entry);
  db.logs = db.logs.slice(0, 60);
  writeLocalDb(db);
}

export async function getMetaConfig(): Promise<MetaConfig> {
  const db = readLocalDb();
  return (
    db.meta_config || {
      page_id: process.env.META_PAGE_ID || "",
      page_name: "",
      ig_user_id: process.env.META_IG_USER_ID || "",
      ig_username: "",
      access_token: process.env.META_ACCESS_TOKEN || "",
      site_url:
        process.env.NEXT_PUBLIC_SITE_URL || "https://chacohoy.vercel.app",
    }
  );
}

export async function saveMetaConfig(
  input: Partial<MetaConfig>
): Promise<MetaConfig> {
  const db = readLocalDb();
  const current = await getMetaConfig();
  const updated: MetaConfig = {
    ...current,
    ...input,
    updated_at: new Date().toISOString(),
  };
  db.meta_config = updated;
  writeLocalDb(db);
  return updated;
}

