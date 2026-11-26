"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS_OFICIALES } from "@/lib/types";
import { CloudSun, Download, MapPin, Menu, Search, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        "Para instalar ChacoHoy como App:\n• En Android/Chrome: toca el menú (⋮) y elige 'Instalar aplicación'.\n• En iPhone/Safari: toca Compartir y elige 'Agregar a inicio'."
      );
    }
  };

  const todayFormatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      {/* Barra institucional superior (Sin enlaces a /admin ni menciones a IA) */}
      <div className="bg-brand-900 text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="capitalize font-medium text-brand-100">
              {todayFormatted}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-sky-200">
              <MapPin className="w-3.5 h-3.5" /> Resistencia, Chaco
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-sky-200">
              <CloudSun className="w-3.5 h-3.5" /> 29°C Despejado
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!installed && (
              <button
                onClick={handleInstallPwa}
                className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-0.5 rounded font-medium transition"
                title="Instalar App PWA en tu celular o PC"
              >
                <Download className="w-3 h-3" />
                <span>Instalar App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cabecera Principal Estilo La Nación / Diario Chaco */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-brand-900 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>EDICIÓN EN VIVO • CHACO & REGIÓN NEA</span>
        </div>

        <Link href="/" className="text-center group">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif text-3xl sm:text-5xl font-black tracking-tight text-brand-800 group-hover:text-brand-700 transition">
              CHACO<span className="text-sky-600">HOY</span>
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold mt-0.5">
            Periodismo Independiente de la Provincia del Chaco
          </p>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/?q=Resistencia"
            className="p-2 rounded-lg text-slate-600 hover:text-brand-800 hover:bg-slate-100 transition"
            title="Buscar noticias"
          >
            <Search className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Barra de Navegación con las 7 Categorías Oficiales */}
      <nav className="border-t border-slate-200 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <ul className="flex items-center justify-start md:justify-center gap-1 sm:gap-2 py-2 text-sm font-semibold whitespace-nowrap">
            <li>
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md transition ${
                  pathname === "/"
                    ? "bg-brand-800 text-white"
                    : "text-slate-700 hover:text-brand-800 hover:bg-slate-200/60"
                }`}
              >
                Portada
              </Link>
            </li>
            {CATEGORIAS_OFICIALES.map((cat) => {
              const active = pathname === `/categoria/${cat.slug}`;
              return (
                <li key={cat.slug}>
                  <Link
                    href={`/categoria/${cat.slug}`}
                    className={`px-3 py-1.5 rounded-md transition ${
                      active
                        ? "bg-brand-800 text-white shadow-sm"
                        : "text-slate-700 hover:text-brand-800 hover:bg-slate-200/60"
                    }`}
                  >
                    {cat.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Menú móvil desplegable */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS_OFICIALES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-semibold text-sm hover:bg-brand-800 hover:text-white transition"
              >
                {cat.nombre}
              </Link>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
            <button
              onClick={handleInstallPwa}
              className="text-xs bg-brand-800 text-white px-3 py-1.5 rounded-md font-semibold"
            >
              Instalar App ChacoHoy
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
