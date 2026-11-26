import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoticiaBySlugOrId, getNoticias } from "@/lib/db";
import { CATEGORIAS_OFICIALES } from "@/lib/types";
import NewsCard from "@/components/NewsCard";
import { ArrowLeft, Calendar, MapPin, Share2, User } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await getNoticiaBySlugOrId(slug);
  if (!noticia) return { title: "Noticia no encontrada" };

  return {
    title: noticia.titulo,
    description: noticia.bajada,
    openGraph: {
      title: noticia.titulo,
      description: noticia.bajada,
      type: "article",
      publishedTime: noticia.published_at,
      authors: [noticia.autor],
      images: noticia.imagen_url ? [{ url: noticia.imagen_url }] : undefined,
    },
  };
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const noticia = await getNoticiaBySlugOrId(slug);
  if (!noticia) {
    notFound();
  }

  const categoria =
    CATEGORIAS_OFICIALES.find((c) => c.slug === noticia.categoria_slug) ||
    CATEGORIAS_OFICIALES[0];

  const relacionadas = (await getNoticias({ soloPublicadas: true }))
    .filter((n) => n.id !== noticia.id)
    .slice(0, 3);

  const fechaFormateada = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(noticia.published_at));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/categoria/${categoria.slug}`}
            className="bg-brand-800 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
          >
            {categoria.nombre}
          </Link>
          {noticia.localidad && (
            <span className="bg-sky-100 text-brand-900 text-xs font-semibold px-3 py-1 rounded inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-700" />
              {noticia.localidad}
            </span>
          )}
        </div>
      </div>

      <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-widest text-sky-700 mb-2">
          {noticia.volanta}
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-slate-950 leading-tight mb-5">
          {noticia.titulo}
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-6 font-normal">
          {noticia.bajada}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-200 text-xs text-slate-500 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <User className="w-4 h-4 text-brand-700" />
              {noticia.autor}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {fechaFormateada} hs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(noticia.titulo)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md font-semibold transition"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartir
            </a>
          </div>
        </div>

        {noticia.imagen_url && (
          <figure className="mb-8">
            <div className="rounded-xl overflow-hidden bg-slate-100 max-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={noticia.imagen_url}
                alt={noticia.titulo}
                className="w-full h-full object-cover"
              />
            </div>
            {noticia.imagen_caption && (
              <figcaption className="text-xs text-slate-500 mt-2 italic">
                {noticia.imagen_caption}
              </figcaption>
            )}
          </figure>
        )}

        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: noticia.contenido_html }}
        />

        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-800 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la portada de ChacoHoy
          </Link>
        </div>
      </article>

      {relacionadas.length > 0 && (
        <section className="mt-12 space-y-5">
          <h2 className="font-serif text-2xl font-bold text-brand-900">
            Noticias Relacionadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relacionadas.map((rel) => (
              <NewsCard key={rel.id} noticia={rel} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
