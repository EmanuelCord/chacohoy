"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CATEGORIAS_OFICIALES,
  CategoriaSlug,
  FuenteScraping,
  LogActividad,
  Noticia,
} from "@/lib/types";
import RichTextEditor from "@/components/RichTextEditor";
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  Facebook,
  FileText,
  Globe,
  Image as ImageIcon,
  Instagram,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Rss,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm font-semibold text-brand-900">
          Cargando panel editorial ChacoHoy...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "noticias" | "redactar" | "fuentes" | "ia" | "meta" | "logs"
  >("noticias");

  // Estado de Conexión Meta Business (Facebook + Instagram)
  const [metaToken, setMetaToken] = useState("");
  const [metaPageId, setMetaPageId] = useState("");
  const [metaPageName, setMetaPageName] = useState("");
  const [metaIgId, setMetaIgId] = useState("");
  const [metaIgUsername, setMetaIgUsername] = useState("");
  const [metaSiteUrl, setMetaSiteUrl] = useState("https://chacohoy.vercel.app");
  const [detectingMeta, setDetectingMeta] = useState(false);

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [fuentes, setFuentes] = useState<FuenteScraping[]>([]);
  const [logs, setLogs] = useState<LogActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Estado del formulario estilo WordPress
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [volanta, setVolanta] = useState("ACTUALIDAD");
  const [bajada, setBajada] = useState("");
  const [contenidoHtml, setContenidoHtml] = useState(
    "<p>Escribe aquí el desarrollo periodístico de la noticia...</p>"
  );
  const [categoriaSlug, setCategoriaSlug] = useState<CategoriaSlug>("locales");
  const [localidad, setLocalidad] = useState("Resistencia");
  const [imagenUrl, setImagenUrl] = useState(
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80"
  );
  const [imagenCaption, setImagenCaption] = useState("");
  const [autor, setAutor] = useState("Redacción ChacoHoy");
  const [estado, setEstado] = useState<"borrador" | "publicado">("borrador");
  const [destacada, setDestacada] = useState(false);
  const [publicarEnRedesAlGuardar, setPublicarEnRedesAlGuardar] =
    useState(false);
  const [saving, setSaving] = useState(false);

  // Estado de Nueva Fuente
  const [nuevaFuenteNombre, setNuevaFuenteNombre] = useState("");
  const [nuevaFuenteUrl, setNuevaFuenteUrl] = useState("");
  const [nuevaFuenteTipo, setNuevaFuenteTipo] = useState<
    "google_news" | "rss" | "web_chaco"
  >("google_news");
  const [nuevaFuenteCat, setNuevaFuenteCat] =
    useState<CategoriaSlug>("locales");

  // Estado del Recopilador con IA
  const [scrapingNow, setScrapingNow] = useState(false);
  const [urlNoticiaIA, setUrlNoticiaIA] = useState("");
  const [textoCrudoIA, setTextoCrudoIA] = useState("");
  const [procesandoIA, setProcesandoIA] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resNot, resFue, resLog, resMeta] = await Promise.all([
        fetch("/api/noticias"),
        fetch("/api/fuentes"),
        fetch("/api/scraper?logs=1"),
        fetch("/api/social/config"),
      ]);
      const dataNot = await resNot.json();
      const dataFue = await resFue.json();
      const dataLog = await resLog.json();
      const dataMeta = await resMeta.json();
      setNoticias(dataNot.noticias || []);
      setFuentes(dataFue.fuentes || []);
      setLogs(dataLog.logs || []);
      if (dataMeta.config) {
        setMetaToken(dataMeta.config.access_token || "");
        setMetaPageId(dataMeta.config.page_id || "");
        setMetaPageName(dataMeta.config.page_name || "");
        setMetaIgId(dataMeta.config.ig_user_id || "");
        setMetaIgUsername(dataMeta.config.ig_username || "");
        setMetaSiteUrl(
          dataMeta.config.site_url || "https://chacohoy.vercel.app"
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(Boolean(d.authenticated));
        setAuthChecked(true);
        if (d.authenticated) {
          loadAll();
        }
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const handleSecureLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUser,
          password: loginPass,
          website_trap: honeypot,
        }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setAuthenticated(true);
        setLoginPass("");
        loadAll();
      } else {
        setLoginError(data.message || "Credenciales inválidas.");
      }
    } catch {
      setLoginError("Error de conexión con el servidor de seguridad.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAuthenticated(false);
    setLoginUser("");
    setLoginPass("");
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "fuentes" ||
      tabParam === "ia" ||
      tabParam === "redactar" ||
      tabParam === "meta" ||
      tabParam === "logs"
    ) {
      setActiveTab(tabParam);
    }
    const editParam = searchParams.get("edit");
    if (editParam && noticias.length > 0) {
      const found = noticias.find((n) => n.id === editParam);
      if (found) {
        startEdit(found);
      }
    }
  }, [searchParams, noticias]);

  const notify = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitulo("");
    setVolanta("ACTUALIDAD");
    setBajada("");
    setContenidoHtml("<p>Escribe o pega aquí el desarrollo de la noticia...</p>");
    setCategoriaSlug("locales");
    setLocalidad("Resistencia");
    setImagenUrl(
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80"
    );
    setImagenCaption("");
    setAutor("Redacción ChacoHoy");
    setEstado("borrador");
    setDestacada(false);
    setPublicarEnRedesAlGuardar(false);
  };

  const startEdit = (n: Noticia) => {
    setEditingId(n.id);
    setTitulo(n.titulo);
    setVolanta(n.volanta || "ACTUALIDAD");
    setBajada(n.bajada);
    setContenidoHtml(n.contenido_html);
    setCategoriaSlug(n.categoria_slug);
    setLocalidad(n.localidad || "Resistencia");
    setImagenUrl(n.imagen_url);
    setImagenCaption(n.imagen_caption || "");
    setAutor(n.autor);
    setEstado(n.estado);
    setDestacada(n.destacada);
    setActiveTab("redactar");
  };

  // Compresión automática de foto a WebP en el navegador (ahorra 95% de espacio en Supabase Free)
  const handleFileUploadWebP = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 1200;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpDataUrl = canvas.toDataURL("image/webp", 0.8);
          setImagenUrl(webpDataUrl);
          notify(
            `Imagen optimizada a WebP (${canvas.width}x${canvas.height}px) lista para ahorrar espacio.`
          );
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNoticia = async (
    forcedEstado?: "borrador" | "publicado"
  ) => {
    if (!titulo.trim()) {
      notify("Por favor ingresa un titular para la noticia.");
      return;
    }
    setSaving(true);
    const finalEstado = forcedEstado || estado;
    try {
      const res = await fetch("/api/noticias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          titulo,
          volanta,
          bajada: bajada || titulo,
          contenido_html: contenidoHtml,
          categoria_slug: categoriaSlug,
          localidad,
          imagen_url: imagenUrl,
          imagen_caption: imagenCaption,
          autor,
          estado: finalEstado,
          destacada,
        }),
      });
      const data = await res.json();
      if (data.noticia) {
        if (publicarEnRedesAlGuardar && finalEstado === "publicado") {
          await fetch("/api/social/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              noticiaId: data.noticia.id,
              platforms: ["facebook", "instagram"],
            }),
          });
          notify(
            "Noticia publicada en ChacoHoy y enviada a Facebook e Instagram."
          );
        } else {
          notify(
            finalEstado === "publicado"
              ? "¡Noticia publicada en vivo en ChacoHoy!"
              : "Borrador guardado correctamente."
          );
        }
        await loadAll();
        setActiveTab("noticias");
        resetForm();
      }
    } catch (e) {
      console.error(e);
      notify("Error al guardar la noticia.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNoticia = async (id: string) => {
    await fetch(`/api/noticias?id=${id}`, { method: "DELETE" });
    notify("Noticia eliminada.");
    loadAll();
  };

  const handleQuickPublish = async (n: Noticia) => {
    const nuevoEstado: "borrador" | "publicado" =
      n.estado === "publicado" ? "borrador" : "publicado";

    // Actualización visual instantánea en la lista
    setNoticias((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, estado: nuevoEstado } : item
      )
    );

    const res = await fetch("/api/noticias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...n,
        estado: nuevoEstado,
      }),
    });

    if (res.ok) {
      notify(
        nuevoEstado === "publicado"
          ? "¡Noticia aprobada y publicada en ChacoHoy!"
          : "Noticia pasada a Borrador."
      );
      await loadAll();
    } else {
      notify("No se pudo actualizar la noticia. Recarga la página e intenta de nuevo.");
      await loadAll();
    }
  };

  const handleSocialShare = async (n: Noticia) => {
    notify(`Generando placa 4:5 y enviando "${n.titulo.slice(0, 35)}..." a Meta Graph API...`);
    const res = await fetch("/api/social/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noticiaId: n.id,
        platforms: ["facebook", "instagram"],
      }),
    });
    const data = await res.json();
    notify(data.message || "Publicación en redes procesada.");
    loadAll();
  };

  const handleAddFuente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFuenteNombre || !nuevaFuenteUrl) return;
    await fetch("/api/fuentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevaFuenteNombre,
        url: nuevaFuenteUrl,
        tipo: nuevaFuenteTipo,
        categoria_defecto: nuevaFuenteCat,
        activa: true,
        autopublicar_web: false,
        autopublicar_redes: false,
      }),
    });
    setNuevaFuenteNombre("");
    setNuevaFuenteUrl("");
    notify("Nueva fuente agregada al recopilador.");
    loadAll();
  };

  const handleToggleFuente = async (
    f: FuenteScraping,
    field: "activa" | "autopublicar_web" | "autopublicar_redes"
  ) => {
    await fetch("/api/fuentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        [field]: !f[field],
      }),
    });
    loadAll();
  };

  const handleDeleteFuente = async (id: string) => {
    await fetch(`/api/fuentes?id=${id}`, { method: "DELETE" });
    notify("Fuente eliminada.");
    loadAll();
  };

  const handleRunScraperNow = async () => {
    setScrapingNow(true);
    notify(
      "Consultando fuentes del Chaco y Google News + clasificando localidades (Gran Resistencia vs Interior)..."
    );
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_all" }),
      });
      const data = await res.json();
      notify(
        data.message ||
          `Recopilación completada: ${data.nuevas || 0} noticias extraídas.`
      );
      await loadAll();
      setActiveTab("noticias");
    } catch {
      notify("Error al ejecutar el recopilador.");
    } finally {
      setScrapingNow(false);
    }
  };

  const handleProcesarTextoConIA = async () => {
    if (!textoCrudoIA.trim() && !urlNoticiaIA.trim()) return;
    setProcesandoIA(true);
    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rewrite_text",
          rawText: textoCrudoIA,
          articleUrl: urlNoticiaIA,
        }),
      });
      const data = await res.json();
      if (data.resultado) {
        const r = data.resultado;
        setEditingId(null);
        setTitulo(r.titulo_reescrito);
        setVolanta(r.volanta || "COBERTURA CHACOHOY");
        setBajada(r.bajada);
        setContenidoHtml(r.desarrollo_html);
        setCategoriaSlug(r.categoria);
        setLocalidad(r.localidad);
        if (r.imagen_url) {
          setImagenUrl(r.imagen_url);
        }
        setEstado("borrador");
        setActiveTab("redactar");
        notify(
          `IA extrajo la foto, clasificó la noticia en "${r.categoria.toUpperCase()}" (${r.localidad}) y la cargó en el editor.`
        );
      }
    } catch {
      notify("Error al procesar noticia con IA.");
    } finally {
      setProcesandoIA(false);
    }
  };

  const borradoresCount = noticias.filter((n) => n.estado === "borrador").length;
  const publicadasCount = noticias.filter(
    (n) => n.estado === "publicado"
  ).length;

  const placaPreviewUrl = `/api/og/instagram?titulo=${encodeURIComponent(
    titulo || "Titular de ChacoHoy en Instagram"
  )}&categoria=${encodeURIComponent(
    categoriaSlug.toUpperCase()
  )}&localidad=${encodeURIComponent(
    localidad || "Chaco"
  )}&img=${encodeURIComponent(imagenUrl)}`;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-brand-950 text-white flex items-center justify-center text-sm font-semibold">
        Verificando firma criptográfica de sesión...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-brand-800/40 overflow-hidden">
          <div className="bg-brand-900 px-6 py-6 text-center border-b border-brand-800">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-sky-400" />
            </div>
            <div className="font-serif text-2xl font-black tracking-tight text-white">
              CHACO<span className="text-sky-400">HOY</span>
            </div>
            <p className="text-xs text-sky-200 font-semibold mt-1">
              Bóveda Editorial Cifrada • Acceso Exclusivo
            </p>
          </div>

          <form onSubmit={handleSecureLogin} className="p-6 sm:p-8 space-y-5">
            {/* Campo Honeypot invisible contra bots y crawlers de IA */}
            <div className="hidden" aria-hidden="true">
              <label>
                No completar este campo
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3.5">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Usuario Autorizado
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Usuario editorial"
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Contraseña Criptográfica
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••••••••••••••••••••"
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-mono focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-brand-800 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
            >
              {loggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {loggingIn
                  ? "Verificando Firma SHA-256..."
                  : "Ingresar a la Redacción"}
              </span>
            </button>

            <div className="pt-3 border-t border-slate-100 text-center space-y-1">
              <p className="text-[11px] text-slate-400">
                Protegido con HMAC-SHA256 • Comparación en Tiempo Constante •
                Bloqueo Anti-Fuerza Bruta (5 intentos) • Anti-AI Bot Shield
              </p>
              <Link
                href="/"
                className="inline-block text-xs font-semibold text-brand-800 hover:underline pt-1"
              >
                ← Volver al diario público
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Barra Superior de Administración */}
      <div className="bg-brand-950 text-white border-b border-brand-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-black tracking-tight text-white">
              CHACO<span className="text-sky-400">HOY</span>
            </span>
            <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] font-bold px-2 py-0.5 rounded">
              CMS /ADMIN
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleRunScraperNow}
            disabled={scrapingNow}
            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-xs"
          >
            {scrapingNow ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {scrapingNow
                ? "Extrayendo con IA..."
                : "Extraer Noticias con IA Ahora"}
            </span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setActiveTab("redactar");
            }}
            className="inline-flex items-center gap-1.5 bg-white text-brand-900 hover:bg-brand-50 text-xs font-bold px-3.5 py-2 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Noticia</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-sky-200 hover:text-white px-2.5 py-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Portal Público</span>
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-200 border border-red-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
            title="Cerrar sesión cifrada"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Notificación flotante */}
      {statusMsg && (
        <div className="bg-brand-800 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow">
          <CheckCircle2 className="w-4 h-4 text-sky-300 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Menú Lateral Estilo WordPress */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab("noticias")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "noticias"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Todas las Noticias
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15">
                {noticias.length}
              </span>
            </button>

            <button
              onClick={() => {
                if (!editingId) resetForm();
                setActiveTab("redactar");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "redactar"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Edit3 className="w-4 h-4" /> Redactar / Editor
              </span>
            </button>

            <button
              onClick={() => setActiveTab("fuentes")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "fuentes"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Rss className="w-4 h-4" /> Gestor de Fuentes
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15">
                {fuentes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ia")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "ia"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" /> Laboratorio IA Chaco
              </span>
            </button>

            <button
              onClick={() => setActiveTab("meta")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "meta"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-pink-600" /> Conexión Meta FB/IG
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  metaToken ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === "logs"
                  ? "bg-brand-800 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Layers className="w-4 h-4" /> Actividad & Redes
              </span>
            </button>
          </div>

          {/* Tarjeta de Métricas Rápidas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estado Editorial
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-2xl font-black text-emerald-800">
                  {publicadasCount}
                </div>
                <div className="text-xs font-semibold text-emerald-700">
                  Publicadas
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-2xl font-black text-amber-800">
                  {borradoresCount}
                </div>
                <div className="text-xs font-semibold text-amber-700">
                  En Borrador
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Las noticias extraídas por la IA ingresan como{" "}
              <strong>Borrador</strong> por defecto hasta que las apruebes con
              un clic.
            </p>
          </div>
        </aside>

        {/* Área Principal del Dashboard */}
        <section className="lg:col-span-9 space-y-6">
          {/* PESTAÑA 1: LISTADO DE NOTICIAS Y BORRADORES */}
          {activeTab === "noticias" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Gestión de Noticias y Borradores IA
                  </h1>
                  <p className="text-xs text-slate-500">
                    Aprueba borradores, edita titulares o genera placas 4:5 para
                    Instagram y Facebook con un clic.
                  </p>
                </div>
                <button
                  onClick={loadAll}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-800 border border-slate-200 px-3 py-1.5 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  Cargando noticias...
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {noticias.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={n.imagen_url}
                          alt={n.titulo}
                          className="w-20 h-16 object-cover rounded-lg shrink-0 bg-slate-200"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                n.estado === "publicado"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {n.estado}
                            </span>
                            <span className="bg-brand-100 text-brand-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                              {n.categoria_slug}
                            </span>
                            <span className="text-xs text-slate-500 inline-flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-sky-600" />
                              {n.localidad}
                            </span>
                            {n.es_ia && (
                              <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                IA
                              </span>
                            )}
                          </div>

                          <h3 className="font-serif font-bold text-slate-900 text-base leading-snug">
                            {n.titulo}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleQuickPublish(n)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                            n.estado === "borrador"
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          }`}
                        >
                          {n.estado === "borrador"
                            ? "Aprobar y Publicar"
                            : "Pasar a Borrador"}
                        </button>

                        <button
                          onClick={() => startEdit(n)}
                          className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                          title="Editar en editor enriquecido"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <a
                          href={`/api/og/instagram?id=${n.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
                          title="Ver Placa Instagram 4:5 generada al vuelo"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleSocialShare(n)}
                          className="p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Enviar a Facebook e Instagram (Meta Graph API)"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/noticia/${n.slug}`}
                          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          title="Ver nota en el portal"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteNoticia(n.id)}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Eliminar noticia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: REDACTAR / EDITOR ESTILO WORDPRESS + PLACA IG EN VIVO */}
          {activeTab === "redactar" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Principal del Editor */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId ? "Editando Noticia" : "Redactar Nueva Noticia"}
                  </h2>
                  {editingId && (
                    <button
                      onClick={resetForm}
                      className="text-xs text-slate-500 hover:text-brand-800"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Volanta / Antetítulo
                    </label>
                    <input
                      type="text"
                      value={volanta}
                      onChange={(e) => setVolanta(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej: INFRAESTRUCTURA"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Localidad (Define Locales vs Interior)
                    </label>
                    <input
                      type="text"
                      value={localidad}
                      onChange={(e) => setLocalidad(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej: Resistencia, Sáenz Peña, Charata, Castelli..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Titular Periodístico
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 font-serif text-xl font-bold text-slate-900"
                    placeholder="Escribe el titular principal de la noticia..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Bajada / Copete (Resumen para SEO y Redes)
                  </label>
                  <textarea
                    rows={2}
                    value={bajada}
                    onChange={(e) => setBajada(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-700"
                    placeholder="Resumen de 2 líneas que engancha al lector..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Cuerpo de la Noticia (Editor Enriquecido)
                  </label>
                  <RichTextEditor
                    value={contenidoHtml}
                    onChange={setContenidoHtml}
                  />
                </div>
              </div>

              {/* Barra Lateral Derecha Estilo WordPress */}
              <div className="lg:col-span-4 space-y-5">
                {/* Caja de Publicación */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    Publicación y Categoría
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sección de ChacoHoy
                    </label>
                    <select
                      value={categoriaSlug}
                      onChange={(e) =>
                        setCategoriaSlug(e.target.value as CategoriaSlug)
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-brand-900"
                    >
                      {CATEGORIAS_OFICIALES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Autor / Firma
                    </label>
                    <input
                      type="text"
                      value={autor}
                      onChange={(e) => setAutor(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={destacada}
                      onChange={(e) => setDestacada(e.target.checked)}
                      className="rounded text-brand-800"
                    />
                    Destacar en portada principal
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-brand-900 bg-brand-50 border border-brand-200 p-2.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publicarEnRedesAlGuardar}
                      onChange={(e) =>
                        setPublicarEnRedesAlGuardar(e.target.checked)
                      }
                      className="rounded text-brand-800"
                    />
                    <span>
                      Publicar también en <strong>Instagram y Facebook</strong>{" "}
                      al publicar
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveNoticia("borrador")}
                      className="w-full border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-lg transition"
                    >
                      Guardar Borrador
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveNoticia("publicado")}
                      className="w-full bg-brand-800 hover:bg-brand-700 text-white font-bold text-xs py-2.5 rounded-lg transition shadow-xs"
                    >
                      {saving ? "Guardando..." : "Publicar Ahora"}
                    </button>
                  </div>
                </div>

                {/* Caja de Imagen Destacada con Compresión WebP Gratis */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Imagen Destacada (WebP)
                  </h3>

                  <input
                    type="text"
                    value={imagenUrl}
                    onChange={(e) => setImagenUrl(e.target.value)}
                    placeholder="Pega URL de imagen o sube un archivo..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />

                  <label className="block w-full text-center bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 rounded-lg py-2.5 px-3 text-xs font-semibold text-slate-700 cursor-pointer transition">
                    Subir foto desde mi PC (Auto-WebP 50KB)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUploadWebP}
                      className="hidden"
                    />
                  </label>

                  {imagenUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 max-h-40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagenUrl}
                        alt="Vista previa"
                        className="w-full h-36 object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Vista Previa en Vivo de la Placa de Instagram (4:5) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5" /> Placa Instagram 4:5
                    </h3>
                    <a
                      href={placaPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-brand-800 hover:underline"
                    >
                      Abrir 1080×1350
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Generada al vuelo sin ocupar espacio en tu cuenta gratuita
                    de Supabase:
                  </p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-brand-950 aspect-[4/5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={placaPreviewUrl}
                      alt="Placa Instagram ChacoHoy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: GESTOR DE FUENTES Y RSS GOOGLE NEWS */}
          {activeTab === "fuentes" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Agregar Fuente de Noticias (Medios del Chaco o Google News RSS)
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Pega la URL de cualquier medio local o búsqueda RSS de Google
                  News. El recopilador clasificará automáticamente si menciona
                  Gran Resistencia (Locales) o localidades del Interior.
                </p>

                <form
                  onSubmit={handleAddFuente}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={nuevaFuenteNombre}
                    onChange={(e) => setNuevaFuenteNombre(e.target.value)}
                    placeholder="Nombre (Ej: Diario Norte / Google News Sáenz Peña)"
                    className="sm:col-span-4 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    required
                    value={nuevaFuenteUrl}
                    onChange={(e) => setNuevaFuenteUrl(e.target.value)}
                    placeholder="URL del sitio o RSS (https://...)"
                    className="sm:col-span-4 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    value={nuevaFuenteCat}
                    onChange={(e) =>
                      setNuevaFuenteCat(e.target.value as CategoriaSlug)
                    }
                    className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-2 text-sm"
                  >
                    {CATEGORIAS_OFICIALES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-2 bg-brand-800 hover:bg-brand-700 text-white font-bold text-xs rounded-lg px-4 py-2 transition"
                  >
                    + Agregar Fuente
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900">
                    Fuentes Configuradas ({fuentes.length})
                  </h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {fuentes.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              f.activa ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="font-bold text-sm text-slate-900">
                            {f.nombre}
                          </span>
                          <span className="bg-brand-50 text-brand-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                            {f.categoria_defecto}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {f.url}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={f.activa}
                            onChange={() => handleToggleFuente(f, "activa")}
                          />
                          <span className="font-semibold">Activa</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={f.autopublicar_web}
                            onChange={() =>
                              handleToggleFuente(f, "autopublicar_web")
                            }
                          />
                          <span className="font-semibold">
                            Autopublicar Web
                          </span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-pink-800 bg-pink-50 px-2.5 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={f.autopublicar_redes}
                            onChange={() =>
                              handleToggleFuente(f, "autopublicar_redes")
                            }
                          />
                          <span className="font-semibold">
                            Autopublicar IG/FB
                          </span>
                        </label>

                        <button
                          onClick={() => handleDeleteFuente(f.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: LABORATORIO IA CHACO (CLASIFICADOR Y REESCRITURA) */}
          {activeTab === "ia" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div>
                <span className="bg-sky-100 text-brand-900 text-xs font-bold px-2.5 py-1 rounded">
                  MOTOR GEMINI + REGLA GEOGRÁFICA DEL CHACO
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Redactor y Clasificador Geográfico con IA
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pega aquí cualquier cable de agencia, gacetilla de prensa o
                  texto crudo. La IA lo reescribirá con estilo periodístico
                  original y aplicará tu regla:{" "}
                  <strong>
                    Resistencia, Barranqueras, Fontana o Puerto Vilelas →
                    Locales
                  </strong>
                  ; cualquier otra ciudad del Chaco (Sáenz Peña, Villa Ángela,
                  Charata, Castelli, San Martín, etc.) →{" "}
                  <strong>Interior</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  1. Pegar URL de la Noticia Original (Extrae Titular + Cuerpo + Foto og:image automáticamente)
                </label>
                <input
                  type="url"
                  value={urlNoticiaIA}
                  onChange={(e) => setUrlNoticiaIA(e.target.value)}
                  placeholder="https://www.diariochaco.com/... o cualquier portal de noticias"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  2. O pegar texto / gacetilla de prensa (Opcional si ya pusiste URL arriba)
                </label>
                <textarea
                  rows={5}
                  value={textoCrudoIA}
                  onChange={(e) => setTextoCrudoIA(e.target.value)}
                  placeholder="Ejemplo: 'La Municipalidad de Villa Ángela junto a Vialidad Provincial inauguraron 15 nuevas cuadras de pavimento y desagües en el acceso norte de la ciudad...'"
                  className="w-full border border-slate-300 rounded-xl p-4 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() =>
                    setTextoCrudoIA(
                      "En un operativo conjunto realizado este jueves en Presidencia Roque Sáenz Peña y Villa Ángela, el Ministerio de Producción del Chaco anunció líneas de crédito y asistencia para productores algodoneros y pymes metalmecánicas del interior provincial."
                    )
                  }
                  className="text-xs font-semibold text-sky-700 hover:underline"
                >
                  Cargar texto de prueba del Interior del Chaco
                </button>

                <button
                  onClick={handleProcesarTextoConIA}
                  disabled={procesandoIA}
                  className="inline-flex items-center gap-2 bg-brand-800 hover:bg-brand-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition"
                >
                  {procesandoIA ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    Reescribir con IA, Clasificar Localidad y Abrir en Editor
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 5: CONEXIÓN META BUSINESS (FACEBOOK + INSTAGRAM) */}
          {activeTab === "meta" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <h2 className="text-xl font-bold text-slate-900">
                        Conexión Meta Business (Facebook + Instagram)
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Se conectan los dos juntos con un único Token de Meta Graph API v21.
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      metaToken
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {metaToken
                      ? `Conectado ${metaPageName ? `(${metaPageName})` : ""}`
                      : "Pendiente de Token (Modo Simulación)"}
                  </span>
                </div>

                {/* Paso 1: Pegar Token y Autodetectar */}
                <div className="bg-brand-50/70 border border-brand-200 rounded-xl p-4 space-y-3">
                  <label className="block text-xs font-bold uppercase text-brand-900">
                    1. Token de Acceso de Meta (Page Access Token)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="EAAGm0PX4ZCpsBA..."
                      className="flex-1 border border-slate-300 bg-white rounded-lg px-3.5 py-2 text-sm font-mono"
                    />
                    <button
                      type="button"
                      disabled={detectingMeta}
                      onClick={async () => {
                        setDetectingMeta(true);
                        try {
                          const res = await fetch("/api/social/config", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "detect_from_token",
                              access_token: metaToken,
                              site_url: metaSiteUrl,
                            }),
                          });
                          const data = await res.json();
                          notify(data.message || "Verificación finalizada.");
                          if (data.config) {
                            setMetaPageId(data.config.page_id || "");
                            setMetaPageName(data.config.page_name || "");
                            setMetaIgId(data.config.ig_user_id || "");
                            setMetaIgUsername(data.config.ig_username || "");
                            setMetaToken(data.config.access_token || metaToken);
                          }
                          loadAll();
                        } catch {
                          notify("Error al verificar Token con Meta.");
                        } finally {
                          setDetectingMeta(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shrink-0"
                    >
                      {detectingMeta ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Autodetectar Fanpage e Instagram con 1 Clic</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Al tocar <strong>Autodetectar</strong>, ChacoHoy consulta Meta Graph API con tu Token y completa solo el ID de tu Fanpage y el ID de tu cuenta de Instagram Profesional vinculada.
                  </p>
                </div>

                {/* Campos de IDs detectados o manuales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      ID de Fanpage Facebook (META_PAGE_ID)
                    </label>
                    <input
                      type="text"
                      value={metaPageId}
                      onChange={(e) => setMetaPageId(e.target.value)}
                      placeholder="Ej: 104829104921"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                    {metaPageName && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        ✓ Página: {metaPageName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      ID Instagram Profesional (META_IG_USER_ID)
                    </label>
                    <input
                      type="text"
                      value={metaIgId}
                      onChange={(e) => setMetaIgId(e.target.value)}
                      placeholder="Ej: 17841405822304914"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                    {metaIgUsername && (
                      <p className="text-[11px] text-pink-700 font-semibold mt-1">
                        ✓ Instagram: @{metaIgUsername}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      URL Pública del Portal (Para placas IG)
                    </label>
                    <input
                      type="url"
                      value={metaSiteUrl}
                      onChange={(e) => setMetaSiteUrl(e.target.value)}
                      placeholder="https://chacohoy.vercel.app"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch("/api/social/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          page_id: metaPageId,
                          page_name: metaPageName,
                          ig_user_id: metaIgId,
                          ig_username: metaIgUsername,
                          access_token: metaToken,
                          site_url: metaSiteUrl,
                        }),
                      });
                      const data = await res.json();
                      notify(data.message || "Configuración guardada.");
                      loadAll();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition"
                  >
                    Guardar Credenciales de Meta
                  </button>
                </div>
              </div>

              {/* Guía rápida paso a paso */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  ¿Cómo obtener tu Token gratuito en 3 pasos desde Meta Business?
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600 leading-relaxed">
                  <li>
                    Vincula tu cuenta de <strong>Instagram Profesional</strong> a tu{" "}
                    <strong>Fanpage de Facebook</strong> (desde Configuración de tu Página → Cuentas vinculadas → Instagram).
                  </li>
                  <li>
                    Entra a{" "}
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-800 font-bold underline"
                    >
                      Meta Graph API Explorer
                    </a>
                    , selecciona tu App, elige{" "}
                    <strong>Obtener token de acceso de página</strong> y marca los permisos:{" "}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                      pages_manage_posts
                    </code>
                    ,{" "}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                      pages_read_engagement
                    </code>
                    ,{" "}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                      instagram_basic
                    </code>{" "}
                    e{" "}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                      instagram_content_publish
                    </code>
                    .
                  </li>
                  <li>
                    Copia el Token generado, pégalo arriba en el punto 1 y haz clic en{" "}
                    <strong>Autodetectar Fanpage e Instagram con 1 Clic</strong>. ¡Listo!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* PESTAÑA 6: LOGS DE ACTIVIDAD Y REDES SOCIALES */}
          {activeTab === "logs" && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Historial del Recopilador IA y Meta Graph API
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <Globe className="w-4 h-4 text-brand-800" />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold uppercase text-brand-800 mr-2">
                        [{log.tipo}]
                      </span>
                      <span className="text-slate-700">{log.mensaje}</span>
                    </div>
                    <span className="text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
