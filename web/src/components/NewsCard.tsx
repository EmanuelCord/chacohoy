import Link from "next/link";
import { CATEGORIAS_OFICIALES, Noticia } from "@/lib/types";
import { Clock, MapPin } from "lucide-react";

export function formatRelativeTime(isoDate: string): string {
  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(isoDate).getTime()) / 60000)
  );
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(isoDate));
}

export default function NewsCard({
  noticia,
  featured = false,
}: {
  noticia: Noticia;
  featured?: boolean;
}) {
  const categoria =
    CATEGORIAS_OFICIALES.find((c) => c.slug === noticia.categoria_slug) ||
    CATEGORIAS_OFICIALES[0];

  if (featured) {
    return (
      <article className="group bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 relative overflow-hidden bg-slate-900 min-h-[280px] sm:min-h-[380px]">
          <Link href={`/noticia/${noticia.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={noticia.imagen_url}
              alt={noticia.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          </Link>
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="bg-brand-800 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded shadow">
              {categoria.nombre}
            </span>
            {noticia.localidad && (
              <span className="bg-white/95 text-brand-900 text-xs font-semibold px-2.5 py-1 rounded shadow inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                {noticia.localidad}
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-sky-700 mb-2">
              {noticia.volanta || categoria.nombre}
            </div>
            <Link href={`/noticia/${noticia.slug}`}>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-brand-800 leading-tight transition mb-4">
                {noticia.titulo}
              </h2>
            </Link>
            <p className="text-slate-600 text-base leading-relaxed line-clamp-4">
              {noticia.bajada}
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">{noticia.autor}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(noticia.published_at)}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-brand-200 shadow-sm hover:shadow-md transition flex flex-col">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <Link href={`/noticia/${noticia.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={noticia.imagen_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        </Link>
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-brand-800 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">
            {categoria.nombre}
          </span>
          {noticia.localidad && (
            <span className="bg-white/95 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-sky-600" />
              {noticia.localidad}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 mb-1.5">
            {noticia.volanta}
          </div>
          <Link href={`/noticia/${noticia.slug}`}>
            <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-brand-800 leading-snug transition mb-2.5">
              {noticia.titulo}
            </h3>
          </Link>
          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {noticia.bajada}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[150px]">{noticia.autor}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(noticia.published_at)}
          </span>
        </div>
      </div>
    </article>
  );
}
