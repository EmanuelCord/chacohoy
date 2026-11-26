import { NextRequest, NextResponse } from "next/server";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Proxy de imágenes para que las fotos extraídas de portales del Chaco (como chaco.gob.ar)
 * se visualicen siempre sin bloqueos de hotlinking, Referer o CORP/CORS en el navegador.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !url.startsWith("http")) {
    return new NextResponse("Missing url", { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Referer: `${parsed.protocol}//${parsed.host}/`,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new NextResponse("Upstream error", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (e) {
    return new NextResponse(String(e), { status: 500 });
  }
}
