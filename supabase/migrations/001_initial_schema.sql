-- ============================================================================
-- CHACOHOY - ESQUEMA COMPLETO PARA SUPABASE (PostgreSQL + Storage + RLS)
-- ============================================================================

-- Extensión para UUIDs y búsqueda de texto
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 1. TABLA DE CATEGORÍAS
create table if not exists public.categorias (
    id uuid primary key default uuid_generate_v4(),
    nombre text not null unique,
    slug text not null unique,
    descripcion text,
    color text default '#003366',
    orden int default 0,
    created_at timestamptz default now()
);

insert into public.categorias (nombre, slug, descripcion, color, orden) values
    ('Locales', 'locales', 'Gran Resistencia: Resistencia, Barranqueras, Fontana y Puerto Vilelas', '#003366', 1),
    ('Interior', 'interior', 'Sáenz Peña, Villa Ángela, Charata, Castelli, San Martín y resto del Chaco', '#0284c7', 2),
    ('Política', 'politica', 'Actualidad política provincial y nacional', '#1e3a8a', 3),
    ('Economía', 'economia', 'Finanzas, agro, industria, comercio y dólar', '#0369a1', 4),
    ('Nacionales', 'nacionales', 'Noticias de Argentina', '#1d4ed8', 5),
    ('Internacionales', 'internacionales', 'Actualidad del mundo y la región', '#334155', 6),
    ('Tecnología', 'tecnologia', 'Innovación, ciencia, IA y cultura digital', '#0f766e', 7)
on conflict (slug) do nothing;

-- 2. TABLA DE FUENTES DE SCRAPING (Medios de Chaco y Feeds de Google News)
create table if not exists public.fuentes (
    id uuid primary key default uuid_generate_v4(),
    nombre text not null,
    url text not null unique,
    tipo text not null check (tipo in ('web_chaco', 'rss', 'google_news')),
    categoria_defecto text not null default 'locales',
    activa boolean not null default true,
    autopublicar_web boolean not null default false,
    autopublicar_redes boolean not null default false,
    ultima_ejecucion timestamptz,
    noticias_extraidas int default 0,
    created_at timestamptz default now()
);

insert into public.fuentes (nombre, url, tipo, categoria_defecto, activa, autopublicar_web, autopublicar_redes) values
    ('Google News - Resistencia y Gran Resistencia', 'https://news.google.com/rss/search?q=Resistencia+Chaco+OR+Barranqueras+OR+Fontana&hl=es-419&gl=AR&ceid=AR:es-419', 'google_news', 'locales', true, false, false),
    ('Google News - Interior del Chaco', 'https://news.google.com/rss/search?q=%22Saenz+Pe%C3%B1a%22+OR+%22Villa+Angela%22+OR+Charata+OR+Castelli+Chaco&hl=es-419&gl=AR&ceid=AR:es-419', 'google_news', 'interior', true, false, false),
    ('Google News - Política y Economía Chaco', 'https://news.google.com/rss/search?q=Chaco+Gobierno+OR+Economia+Chaco&hl=es-419&gl=AR&ceid=AR:es-419', 'google_news', 'politica', true, false, false),
    ('Google News - Argentina Nacionales', 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZ4ZERBU0JtVnpMVFF4T1NnQVAB?hl=es-419&gl=AR&ceid=AR:es-419', 'google_news', 'nacionales', true, false, false),
    ('Google News - Tecnología', 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0JtVnpMVFF4T1NnQVAB?hl=es-419&gl=AR&ceid=AR:es-419', 'google_news', 'tecnologia', true, false, false)
on conflict (url) do nothing;

-- 3. TABLA DE NOTICIAS
create table if not exists public.noticias (
    id uuid primary key default uuid_generate_v4(),
    titulo text not null,
    slug text not null unique,
    volanta text,
    bajada text not null,
    contenido_html text not null,
    categoria_slug text not null default 'locales',
    localidad text default 'Resistencia',
    imagen_url text,
    imagen_caption text,
    autor text default 'Redacción ChacoHoy',
    estado text not null default 'borrador' check (estado in ('borrador', 'publicado')),
    destacada boolean not null default false,
    es_ia boolean not null default false,
    fuente_nombre text,
    fuente_url text unique,
    publicado_fb boolean not null default false,
    publicado_ig boolean not null default false,
    fb_post_id text,
    ig_media_id text,
    vistas int default 0,
    published_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_noticias_estado_fecha on public.noticias (estado, published_at desc);
create index if not exists idx_noticias_categoria on public.noticias (categoria_slug, estado);
create index if not exists idx_noticias_titulo_trgm on public.noticias using gin (titulo gin_trgm_ops);

-- 4. TABLA DE LOGS DE SCRAPING Y REDES SOCIALES
create table if not exists public.logs_actividad (
    id uuid primary key default uuid_generate_v4(),
    tipo text not null check (tipo in ('scraper', 'ia_gemini', 'social_fb', 'social_ig', 'editorial')),
    estado text not null check (estado in ('exito', 'advertencia', 'error')),
    mensaje text not null,
    detalle jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- 5. BUCKET DE STORAGE PARA IMÁGENES WEBP
insert into storage.buckets (id, name, public)
values ('noticias-media', 'noticias-media', true)
on conflict (id) do nothing;

-- Políticas RLS básicas (lectura pública de noticias publicadas, escritura autenticada o vía Service Role)
alter table public.categorias enable row level security;
alter table public.noticias enable row level security;
alter table public.fuentes enable row level security;
alter table public.logs_actividad enable row level security;

create policy "Lectura pública de categorías" on public.categorias for select using (true);
create policy "Lectura pública de noticias" on public.noticias for select using (true);
create policy "Gestión total noticias" on public.noticias for all using (true) with check (true);
create policy "Gestión total fuentes" on public.fuentes for all using (true) with check (true);
create policy "Gestión total logs" on public.logs_actividad for all using (true) with check (true);
