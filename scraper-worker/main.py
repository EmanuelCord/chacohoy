"""
CHACOHOY - WORKER DE SCRAPING, CLASIFICACIÓN IA (GEMINI) Y META GRAPH API
=========================================================================
Este script corre gratis cada 30 minutos mediante GitHub Actions (.github/workflows/scraper-cron.yml).
También tienes el mismo motor integrado en Next.js (/api/scraper) para ejecutarlo con 1 clic desde /admin.
"""

import os
import json
import re
from datetime import datetime, timezone
import requests
import feedparser
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PORTAL_BASE_URL = os.getenv("PORTAL_BASE_URL", "https://chacohoy.vercel.app")
META_PAGE_ID = os.getenv("META_PAGE_ID", "")
META_IG_USER_ID = os.getenv("META_IG_USER_ID", "")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")

GRAN_RESISTENCIA = ["resistencia", "barranqueras", "fontana", "puerto vilelas"]
INTERIOR_CHACO = [
    "sáenz peña", "saenz peña", "villa ángela", "villa angela", "charata",
    "castelli", "san martín", "san martin", "las breñas", "quitilipi",
    "machagai", "general pinedo", "corzuela", "villa berthet", "miraflores",
    "tres isletas", "pampa del infierno", "taco pozo", "el impenetrable"
]


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)[:90]


def clasificar_Con_gemini(titulo: str, resumen: str, categoria_defecto: str = "locales") -> dict:
    """Envía el artículo a Gemini 2.5 Flash con la regla geográfica estricta del Chaco."""
    prompt = f"""
    Analiza la siguiente noticia para el portal ChacoHoy (Provincia del Chaco, Argentina).
    REGLA GEOGRÁFICA OBLIGATORIA:
    - Si menciona Resistencia, Barranqueras, Fontana o Puerto Vilelas, asigna categoria "locales".
    - Si menciona cualquier otra localidad de la provincia del Chaco (Sáenz Peña, Villa Ángela, Charata, Castelli, San Martín, etc.), asigna categoria "interior".
    - Si no trata sobre Chaco, usa una de: "politica", "economia", "nacionales", "internacionales", "tecnologia".

    Devuelve SOLO un JSON válido con:
    {{
      "titulo_reescrito": "Titular periodístico atractivo y original",
      "volanta": "ANTETÍTULO BREVE",
      "bajada": "Resumen periodístico de 2 líneas",
      "desarrollo_html": "<p>Primer párrafo...</p><p>Segundo párrafo...</p>",
      "categoria": "{categoria_defecto}",
      "localidad": "Nombre de la ciudad"
    }}

    Título original: {titulo}
    Contenido: {resumen}
    """

    if GEMINI_API_KEY:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        resp = requests.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
            timeout=20,
        )
        if resp.ok:
            data = resp.json()
            raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_json)

    # Clasificación heurística de respaldo si aún no se cargó la clave de Gemini
    texto_lower = f"{titulo} {resumen}".lower()
    categoria = categoria_defecto
    localidad = "Resistencia"

    for loc in INTERIOR_CHACO:
        if loc in texto_lower:
            categoria = "interior"
            localidad = loc.title()
            break

    for loc in GRAN_RESISTENCIA:
        if loc in texto_lower:
            categoria = "locales"
            localidad = loc.title()
            break

    return {
        "titulo_reescrito": titulo,
        "volanta": "ACTUALIDAD CHACO",
        "bajada": resumen[:220] if resumen else titulo,
        "desarrollo_html": f"<p>{resumen or titulo}</p>",
        "categoria": categoria,
        "localidad": localidad,
    }


def publicar_en_meta(noticia_id: str, slug: str, titulo: str, bajada: str):
    """Publica la noticia en Facebook y genera la placa 4:5 para Instagram vía Meta Graph API v21."""
    if not META_ACCESS_TOKEN:
        return

    article_url = f"{PORTAL_BASE_URL}/noticia/{slug}"
    placa_ig_url = f"{PORTAL_BASE_URL}/api/og/instagram?id={noticia_id}"
    caption = f"{titulo}\n\n{bajada}\n\nLeé más en ChacoHoy."

    if META_PAGE_ID:
        requests.post(
            f"https://graph.facebook.com/v21.0/{META_PAGE_ID}/feed",
            data={"message": caption, "link": article_url, "access_token": META_ACCESS_TOKEN},
            timeout=15,
        )

    if META_IG_USER_ID:
        media_resp = requests.post(
            f"https://graph.facebook.com/v21.0/{META_IG_USER_ID}/media",
            data={"image_url": placa_ig_url, "caption": caption, "access_token": META_ACCESS_TOKEN},
            timeout=15,
        ).json()
        if "id" in media_resp:
            requests.post(
                f"https://graph.facebook.com/v21.0/{META_IG_USER_ID}/media_publish",
                data={"creation_id": media_resp["id"], "access_token": META_ACCESS_TOKEN},
                timeout=15,
            )


def extraer_imagen_articulo(article_url: str, entry: dict) -> str:
    """Extrae la imagen real de la noticia desde el feed RSS o desde la etiqueta og:image del artículo original."""
    # 1. Revisar media_content o enclosures del feed RSS
    for media in entry.get("media_content", []) + entry.get("links", []):
        href = media.get("url") or media.get("href", "")
        mtype = media.get("type", "")
        if href and ("image" in mtype or href.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return href

    # 2. Raspar og:image o twitter:image de la página original
    if article_url and article_url.startswith("http"):
        try:
            resp = requests.get(
                article_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0"},
                timeout=8,
            )
            if resp.ok:
                soup = BeautifulSoup(resp.text, "html.parser")
                for meta_prop in ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]:
                    tag = soup.find("meta", attrs={"property": meta_prop}) or soup.find("meta", attrs={"name": meta_prop})
                    if tag and tag.get("content"):
                        img = tag["content"].strip()
                        if "googleusercontent.com/J6_coFbogxhRI9iM864NL" not in img:
                            return img
        except Exception:
            pass

    return "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80"


def run_worker():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Iniciando Recopilador IA ChacoHoy...")
    feed_url = "https://news.google.com/rss/search?q=Chaco+OR+Resistencia+OR+%22Saenz+Pe%C3%B1a%22&hl=es-419&gl=AR&ceid=AR:es-419"
    parsed = feedparser.parse(feed_url)
    print(f"Entradas detectadas en feed RSS: {len(parsed.entries)}")

    for entry in parsed.entries[:3]:
        clean_title = entry.title.split(" - ")[0]
        summary = BeautifulSoup(getattr(entry, "summary", ""), "html.parser").get_text()
        link = getattr(entry, "link", "")
        imagen_url = extraer_imagen_articulo(link, entry)
        resultado = clasificar_Con_gemini(clean_title, summary, "locales")
        resultado["imagen_url"] = imagen_url
        print(f" -> [{resultado['categoria'].upper()} | {resultado['localidad']}] {resultado['titulo_reescrito']} (Foto: {imagen_url})")


if __name__ == "__main__":
    run_worker()
