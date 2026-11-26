import { NextRequest, NextResponse } from "next/server";
import { deleteFuente, getFuentes, saveFuente } from "@/lib/db";
import { isAuthenticatedRequest } from "@/lib/auth";

export async function GET() {
  const fuentes = await getFuentes();
  return NextResponse.json({ fuentes });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const fuente = await saveFuente(body);
  return NextResponse.json({ fuente });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticatedRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  await deleteFuente(id);
  return NextResponse.json({ ok: true });
}
