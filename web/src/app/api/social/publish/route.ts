import { NextRequest, NextResponse } from "next/server";
import {
  addLog,
  getMetaConfig,
  getNoticiaBySlugOrId,
  saveNoticia,
} from "@/lib/db";

/**
 * Endpoint para publicar en Fanpage de Facebook e Instagram Profesional
 * usando las credenciales guardadas en la pestaña "Conexión Meta FB/IG" de /admin
 * (o las variables de entorno META_*) + la placa 4:5 generada al vuelo en /api/og/instagram
 */
export async function POST(req: NextRequest) {
  const { noticiaId, platforms = ["facebook", "instagram"] } = await req.json();
  const noticia = await getNoticiaBySlugOrId(noticiaId);

  if (!noticia) {
    return NextResponse.json(
      { error: "Noticia no encontrada" },
      { status: 404 }
    );
  }

  const metaConfig = await getMetaConfig();
  const pageId = metaConfig.page_id || process.env.META_PAGE_ID;
  const igUserId = metaConfig.ig_user_id || process.env.META_IG_USER_ID;
  const accessToken = metaConfig.access_token || process.env.META_ACCESS_TOKEN;
  const siteUrl = (
    metaConfig.site_url ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://chacohoy.vercel.app"
  ).replace(/\/$/, "");

  const placaUrl = `${siteUrl}/api/og/instagram?id=${noticia.id}`;
  const articleUrl = `${siteUrl}/noticia/${noticia.slug}`;
  const caption = `${noticia.volanta ? `[${noticia.volanta}] ` : ""}${noticia.titulo}\n\n${noticia.bajada}\n\n📍 ${noticia.localidad}, Chaco\n📰 Leé el desarrollo completo en ChacoHoy.`;

  const results: Record<string, unknown> = {};

  if (accessToken && pageId && platforms.includes("facebook")) {
    try {
      const fbRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: caption,
            link: articleUrl,
            access_token: accessToken,
          }),
        }
      );
      results.facebook = await fbRes.json();
    } catch (e) {
      results.facebookError = String(e);
    }
  }

  if (accessToken && igUserId && platforms.includes("instagram")) {
    try {
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: placaUrl,
            caption,
            access_token: accessToken,
          }),
        }
      );
      const mediaData = await mediaRes.json();

      if (mediaData.id) {
        const pubRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: mediaData.id,
              access_token: accessToken,
            }),
          }
        );
        results.instagram = await pubRes.json();
      } else {
        results.instagram = mediaData;
      }
    } catch (e) {
      results.instagramError = String(e);
    }
  }

  await saveNoticia({
    ...noticia,
    publicado_fb: true,
    publicado_ig: true,
  });

  const modoSimulado = !accessToken;
  const msg = modoSimulado
    ? `Placa 4:5 lista (${placaUrl}). Conecta tu Token en la pestaña "Conexión Meta FB/IG" para envío directo.`
    : `Noticia enviada a Meta Graph API v21 (${metaConfig.page_name || pageId}${
        metaConfig.ig_username ? ` + @${metaConfig.ig_username}` : ""
      }).`;

  await addLog({
    tipo: "social_ig",
    estado: "exito",
    mensaje: msg,
  });

  return NextResponse.json({
    ok: true,
    placaUrl,
    articleUrl,
    caption,
    results,
    message: msg,
  });
}
