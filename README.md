# ChacoHoy — Portal de Noticias Full-Stack + PWA + Recopilador IA (\$0/mes)

Monorepo completo del diario digital **ChacoHoy** diseñado para operar 100% en las capas gratuitas (Free Tier sin tarjeta de crédito) de **Vercel**, **Supabase**, **Google AI Studio (Gemini)**, **GitHub Actions** y **Meta Graph API**.

## Estructura del Monorepo

- `/web`: Portal público en **Next.js 15 (App Router) + Tailwind CSS + PWA Offline** + Dashboard estilo WordPress en `/admin` + Generador de placas 4:5 (1080×1350) para Instagram al vuelo (`/api/og/instagram`).
- `/scraper-worker`: Worker en Python (`BeautifulSoup` + `feedparser` + `Gemini 2.5 Flash` + `Meta Graph API v21`) listo para ejecutarse gratis cada 30 minutos en GitHub Actions.
- `/supabase/migrations/001_initial_schema.sql`: Esquema SQL con las 7 secciones oficiales (*Locales, Interior, Política, Economía, Nacionales, Internacionales, Tecnología*), tabla de fuentes, noticias, logs y bucket de imágenes.
- `/.github/workflows/scraper-cron.yml`: Cron gratuito en la nube cada 30 minutos.

## Cómo usarlo ahora mismo en tu PC (Sin configurar cuentas externas todavía)

El proyecto cuenta con un **Motor Híbrido Local-First** (`web/src/lib/db.ts`): funciona inmediatamente guardando todo en `web/data/local-db.json` y, apenas agregues tus variables de entorno gratuitas en `web/.env.local`, sincroniza con **Supabase** y **Gemini** automáticamente.

1. **Portal Público:** http://localhost:3000
2. **Panel Editorial estilo WordPress:** http://localhost:3000/admin
3. **Generador de Placas Instagram 4:5 (1080×1350):** http://localhost:3000/api/og/instagram?id=not-1
