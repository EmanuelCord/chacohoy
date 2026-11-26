import { NextRequest, NextResponse } from "next/server";
import { addLog, deleteNoticia, getNoticias, saveNoticia } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") || undefined;
  const soloPublicadas = searchParams.get("publicadas") === "1";
  const noticias = await getNoticias({ categoria, soloPublicadas });
  return NextResponse.json({ noticias });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const noticia = await saveNoticia(body);
    await addLog({
      tipo: "editorial",
      estado: "exito",
      mensaje: `Noticia "${noticia.titulo.slice(0, 60)}" guardada en estado [${noticia.estado.toUpperCase()}] (${noticia.categoria_slug}).`,
    });
    return NextResponse.json({ noticia });
  } catch (e) {
    return NextResponse.json(
      { error: "Error al guardar noticia", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }
  await deleteNoticia(id);
  return NextResponse.json({ ok: true });
}
