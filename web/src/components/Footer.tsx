import Link from "next/link";
import { CATEGORIAS_OFICIALES } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="bg-brand-950 text-slate-300 border-t-4 border-brand-700 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="font-serif text-3xl font-black text-white">
            CHACO<span className="text-sky-400">HOY</span>
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Diario digital de información general del Gran Resistencia, el
            interior de la provincia del Chaco, la región NEA, Argentina y el
            mundo. Cobertura periodística permanente las 24 horas.
          </p>
          <p className="text-xs text-slate-500 pt-2">
            Resistencia, Provincia del Chaco, República Argentina
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3">
            Secciones
          </h3>
          <ul className="space-y-2 text-sm">
            {CATEGORIAS_OFICIALES.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/categoria/${cat.slug}`}
                  className="hover:text-white transition"
                >
                  {cat.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3">
            Cobertura Regional
          </h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>Gran Resistencia y Área Metropolitana</li>
            <li>Presidencia Roque Sáenz Peña</li>
            <li>Villa Ángela y Sudoeste Chaqueño</li>
            <li>Charata, Las Breñas y Corredor Productivo</li>
            <li>Juan José Castelli y El Impenetrable</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ChacoHoy. Todos los derechos reservados.
        Prohibida su reproducción total o parcial sin citar la fuente.
      </div>
    </footer>
  );
}
