import Link from "next/link";
import { getNoticias } from "@/lib/db";
import { CATEGORIAS_OFICIALES } from "@/lib/types";
import NewsCard from "@/components/NewsCard";
import { ArrowRight, MapPin, Newspaper, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q || "";
  const noticias = await getNoticias({
    soloPublicadas: true,
    busqueda: query || undefined,
  });

  const principal = noticias[0];
  const secundarias = noticias.slice(1, 4);
  const resto = noticias.slice(4);

  const locales = noticias.filter((n) => n.categoria_slug === "locales");
  const interior = noticias.filter((n) => n.categoria_slug === "interior");

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-12">
      {/* Cinta de Último Momento + Acceso rápido */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="bg-brand-800 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shrink-0">
            FOCO CHACO
          </span>
          <p className="text-sm font-medium text-slate-700 truncate">
            {principal
              ? principal.titulo
              : "Cobertura permanente en Gran Resistencia y las 70 localidades del Chaco."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/categoria/locales"
            className="text-brand-800 hover:underline inline-flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            Gran Resistencia ({locales.length})
          </Link>
          <span className="text-slate-300">•</span>
          <Link
            href="/categoria/interior"
            className="text-sky-700 hover:underline"
          >
            Interior ({interior.length})
          </Link>
        </div>
      </div>

      {query && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-brand-900">
            Mostrando resultados para: <strong>&ldquo;{query}&rdquo;</strong> (
            {noticias.length} noticias)
          </p>
          <Link
            href="/"
            className="text-xs font-bold text-brand-800 hover:underline"
          >
            Limpiar filtro
          </Link>
        </div>
      )}

      {/* Noticia Principal Destacada */}
      {principal ? (
        <section className="space-y-6">
          <NewsCard noticia={principal} featured />

          {secundarias.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {secundarias.map((item) => (
                <NewsCard key={item.id} noticia={item} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Newspaper className="w-12 h-12 text-brand-700 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">
            No se encontraron noticias para esta búsqueda
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Intenta con otro término o regresa a la portada principal.
          </p>
        </div>
      )}

      {/* Bloque Regional: Gran Resistencia (Locales) vs Interior del Chaco */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b-2 border-brand-800 pb-3 mb-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-900">
                Gran Resistencia (Locales)
              </h2>
              <p className="text-xs text-slate-500">
                Resistencia • Barranqueras • Fontana • Puerto Vilelas
              </p>
            </div>
            <Link
              href="/categoria/locales"
              className="text-xs font-bold text-brand-800 hover:underline inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {locales.slice(0, 3).map((n) => (
              <Link
                key={n.id}
                href={`/noticia/${n.slug}`}
                className="group flex gap-4 items-start py-2 border-b border-slate-100 last:border-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.imagen_url}
                  alt={n.titulo}
                  className="w-24 h-20 object-cover rounded-lg shrink-0 bg-slate-100"
                />
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase">
                    {n.localidad}
                  </span>
                  <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-brand-800 leading-snug">
                    {n.titulo}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b-2 border-sky-600 pb-3 mb-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-900">
                Interior del Chaco
              </h2>
              <p className="text-xs text-slate-500">
                Sáenz Peña • Villa Ángela • Charata • Castelli • San Martín
              </p>
            </div>
            <Link
              href="/categoria/interior"
              className="text-xs font-bold text-sky-700 hover:underline inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {interior.slice(0, 3).map((n) => (
              <Link
                key={n.id}
                href={`/noticia/${n.slug}`}
                className="group flex gap-4 items-start py-2 border-b border-slate-100 last:border-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.imagen_url}
                  alt={n.titulo}
                  className="w-24 h-20 object-cover rounded-lg shrink-0 bg-slate-100"
                />
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase">
                    {n.localidad}
                  </span>
                  <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-brand-800 leading-snug">
                    {n.titulo}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Resto de Noticias por Secciones */}
      {resto.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <h2 className="font-serif text-2xl font-bold text-brand-900">
              Más Noticias en ChacoHoy
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resto.map((item) => (
              <NewsCard key={item.id} noticia={item} />
            ))}
          </div>
        </section>
      )}

      {/* Explorador rápido de las 7 categorías */}
      <section className="bg-brand-900 text-white rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold">
              Secciones de ChacoHoy
            </h2>
            <p className="text-xs text-sky-200 mt-1">
              Información actualizada de toda la provincia del Chaco, el país y el mundo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIAS_OFICIALES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-3.5 transition flex flex-col justify-between"
            >
              <span className="font-bold text-sm text-white">{cat.nombre}</span>
              <span className="text-[11px] text-sky-200 mt-2 line-clamp-2">
                {cat.descripcion}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
