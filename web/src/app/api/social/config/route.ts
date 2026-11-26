import { NextRequest, NextResponse } from "next/server";
import { addLog, getMetaConfig, saveMetaConfig } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const config = await getMetaConfig();
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();

  // Acción 1: Autodetectar Fanpage de Facebook e Instagram Profesional a partir del Token de Meta Business
  if (body.action === "detect_from_token") {
    const token = (body.access_token || "").trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Pega primero tu Token de Acceso de Meta." },
        { status: 400 }
      );
    }

    try {
      // 1. Probar si es un Page Access Token directo (/me?fields=id,name,instagram_business_account{id,username})
      const meRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(
          token
        )}`
      );
      const meData = await meRes.json();

      if (meData.error) {
        return NextResponse.json({
          ok: false,
          message: `Meta API respondió: ${meData.error.message}`,
        });
      }

      let pageId = meData.id || "";
      let pageName = meData.name || "";
      let igId = meData.instagram_business_account?.id || "";
      let igUser = meData.instagram_business_account?.username || "";
      let finalToken = token;

      // 2. Si el token es de Usuario (Meta Business) y no de Página directa, buscar en /me/accounts las Fanpages administradas
      if (!igId) {
        const accRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(
            token
          )}`
        );
        const accData = await accRes.json();
        if (accData.data && accData.data.length > 0) {
          const bestPage =
            accData.data.find(
              (p: { instagram_business_account?: { id: string } }) =>
                p.instagram_business_account?.id
            ) || accData.data[0];

          pageId = bestPage.id || pageId;
          pageName = bestPage.name || pageName;
          finalToken = bestPage.access_token || token;
          igId = bestPage.instagram_business_account?.id || "";
          igUser = bestPage.instagram_business_account?.username || "";
        }
      }

      const saved = await saveMetaConfig({
        page_id: pageId,
        page_name: pageName,
        ig_user_id: igId,
        ig_username: igUser,
        access_token: finalToken,
        site_url: body.site_url || "https://chacohoy.vercel.app",
      });

      await addLog({
        tipo: "social_fb",
        estado: "exito",
        mensaje: `Conexión Meta Business verificada: Fanpage "${pageName || pageId}" ${
          igUser ? `+ Instagram @${igUser}` : ""
        }.`,
      });

      return NextResponse.json({
        ok: true,
        config: saved,
        message: `¡Conexión exitosa con Meta! Fanpage detectada: "${
          pageName || pageId
        }"${
          igId
            ? ` e Instagram Profesional: @${igUser || igId}`
            : " (Aún no se detectó cuenta de Instagram vinculada a esta Fanpage)"
        }.`,
      });
    } catch (e) {
      return NextResponse.json({
        ok: false,
        message: `Error al conectar con Meta Graph API: ${String(e)}`,
      });
    }
  }

  // Acción 2: Guardar configuración manualmente
  const saved = await saveMetaConfig({
    page_id: body.page_id,
    page_name: body.page_name,
    ig_user_id: body.ig_user_id,
    ig_username: body.ig_username,
    access_token: body.access_token,
    site_url: body.site_url,
  });

  await addLog({
    tipo: "social_fb",
    estado: "exito",
    mensaje: `Credenciales de Meta Business (Facebook + Instagram) actualizadas desde /admin.`,
  });

  return NextResponse.json({
    ok: true,
    config: saved,
    message: "Credenciales de Facebook e Instagram guardadas correctamente.",
  });
}
