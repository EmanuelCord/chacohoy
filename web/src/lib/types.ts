export type CategoriaSlug =
  | "locales"
  | "interior"
  | "politica"
  | "economia"
  | "nacionales"
  | "internacionales"
  | "tecnologia";

export interface Categoria {
  id: string;
  nombre: string;
  slug: CategoriaSlug;
  descripcion: string;
  color: string;
  orden: number;
}

export interface Noticia {
  id: string;
  titulo: string;
  slug: string;
  volanta: string;
  bajada: string;
  contenido_html: string;
  categoria_slug: CategoriaSlug;
  localidad: string;
  imagen_url: string;
  imagen_caption?: string;
  autor: string;
  estado: "borrador" | "publicado";
  destacada: boolean;
  es_ia: boolean;
  fuente_nombre?: string;
  fuente_url?: string;
  publicado_fb: boolean;
  publicado_ig: boolean;
  fb_post_id?: string;
  ig_media_id?: string;
  vistas: number;
  published_at: string;
  created_at: string;
}

export interface FuenteScraping {
  id: string;
  nombre: string;
  url: string;
  tipo: "web_chaco" | "rss" | "google_news";
  categoria_defecto: CategoriaSlug;
  activa: boolean;
  autopublicar_web: boolean;
  autopublicar_redes: boolean;
  ultima_ejecucion?: string;
  noticias_extraidas: number;
}

export interface LogActividad {
  id: string;
  tipo: "scraper" | "ia_gemini" | "social_fb" | "social_ig" | "editorial";
  estado: "exito" | "advertencia" | "error";
  mensaje: string;
  detalle?: Record<string, unknown>;
  created_at: string;
}

export interface MetaConfig {
  page_id: string;
  page_name?: string;
  ig_user_id: string;
  ig_username?: string;
  access_token: string;
  site_url: string;
  updated_at?: string;
}

export const CATEGORIAS_OFICIALES: Categoria[] = [
  {
    id: "cat-1",
    nombre: "Locales",
    slug: "locales",
    descripcion: "Gran Resistencia: Resistencia, Barranqueras, Fontana y Puerto Vilelas",
    color: "#003366",
    orden: 1,
  },
  {
    id: "cat-2",
    nombre: "Interior",
    slug: "interior",
    descripcion: "Sáenz Peña, Villa Ángela, Charata, Castelli, San Martín y toda la provincia",
    color: "#0284c7",
    orden: 2,
  },
  {
    id: "cat-3",
    nombre: "Política",
    slug: "politica",
    descripcion: "Poder Ejecutivo, Legislatura, municipios y análisis político",
    color: "#1e3a8a",
    orden: 3,
  },
  {
    id: "cat-4",
    nombre: "Economía",
    slug: "economia",
    descripcion: "Comercio, agro, industria, mercados y finanzas",
    color: "#0369a1",
    orden: 4,
  },
  {
    id: "cat-5",
    nombre: "Nacionales",
    slug: "nacionales",
    descripcion: "Actualidad de la República Argentina con impacto federal",
    color: "#1d4ed8",
    orden: 5,
  },
  {
    id: "cat-6",
    nombre: "Internacionales",
    slug: "internacionales",
    descripcion: "El mundo, Mercosur y agenda global",
    color: "#334155",
    orden: 6,
  },
  {
    id: "cat-7",
    nombre: "Tecnología",
    slug: "tecnologia",
    descripcion: "Inteligencia Artificial, innovación, conectividad y ciencia",
    color: "#0f766e",
    orden: 7,
  },
];

export const LOCALIDADES_GRAN_RESISTENCIA = [
  "Resistencia",
  "Barranqueras",
  "Fontana",
  "Puerto Vilelas",
];

export const LOCALIDADES_INTERIOR_CHACO = [
  "Presidencia Roque Sáenz Peña",
  "Sáenz Peña",
  "Villa Ángela",
  "Charata",
  "Juan José Castelli",
  "Castelli",
  "General José de San Martín",
  "San Martín",
  "Las Breñas",
  "Quitilipi",
  "Machagai",
  "Presidencia de la Plaza",
  "General Pinedo",
  "Corzuela",
  "Villa Berthet",
  "Miraflores",
  "Puerto Tirol",
  "Margarita Belén",
  "Colonia Benítez",
  "Tres Isletas",
  "Santa Sylvina",
  "Hermoso Campo",
  "Pampa del Infierno",
  "Taco Pozo",
  "Sauzalito",
  "Nueva Pompeya",
];
