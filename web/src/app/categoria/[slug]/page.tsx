import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoticias } from "@/lib/db";
import { CATEGORIAS_OFICIALES } from "@/lib/types";
import NewsCard from "@/components/NewsCard";
import { ArrowLeft, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categoria = CATEGORIAS_OFICIALES.find((c) => c.slug === slug);
  if (!categoria) {
    notFound();
  }

  const noticias = await getNoticias({
    soloPublicadas: true,
    categoria: slug,
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-white border-l-4 border-brand-800 rounded-r-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Sección Oficial ChacoHoy</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-brand-900">
            {categoria.nombre}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{categoria.descripcion}</p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:underline self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Portada
        </Link>
      </div>

      {noticias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {noticias.map((n) => (
            <NewsCard key={n.id} noticia={n} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <p className="text-base font-semibold text-slate-700">
            Aún no hay noticias publicadas en la sección {categoria.nombre}.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 bg-brand-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
          >
            Volver a Portada
          </Link>
        </div>
      )}
    </main>
  );
}
