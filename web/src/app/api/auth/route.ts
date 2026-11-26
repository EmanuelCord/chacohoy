import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSignedSessionToken,
  isAuthenticatedRequest,
  verifyCredentialsTimingSafe,
} from "@/lib/auth";

// Rate-Limiter en memoria contra ataques de fuerza bruta (máx 5 intentos fallidos por IP cada 15 min)
const failedAttempts = new Map<
  string,
  { count: number; lockedUntil: number }
>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local-ip"
  );
}

export async function GET() {
  const authenticated = await isAuthenticatedRequest();
  return NextResponse.json(
    { authenticated },
    {
      headers: {
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noai",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json();

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true, authenticated: false });
    res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }

  // 1. Verificar si la IP está bloqueada por intentos de fuerza bruta
  const record = failedAttempts.get(ip);
  if (record && record.lockedUntil > Date.now()) {
    const remainingMin = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return NextResponse.json(
      {
        ok: false,
        message: `Acceso bloqueado temporalmente por seguridad anti-fuerza bruta. Intenta nuevamente en ${remainingMin} min.`,
      },
      { status: 429 }
    );
  }

  // 2. Trampa Honeypot anti-bots y agentes de IA de escaneo
  if (body.website_trap || body.honeypot) {
    failedAttempts.set(ip, {
      count: MAX_ATTEMPTS,
      lockedUntil: Date.now() + LOCKOUT_MS,
    });
    return NextResponse.json(
      { ok: false, message: "Acceso denegado." },
      { status: 403 }
    );
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  // 3. Pequeña pausa aleatoria (150-300ms) para mitigar enumeración automatizada
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));

  const valid = verifyCredentialsTimingSafe(username, password);

  if (!valid) {
    const currentCount = (record?.count || 0) + 1;
    const lockedUntil =
      currentCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    failedAttempts.set(ip, { count: currentCount, lockedUntil });

    const left = Math.max(0, MAX_ATTEMPTS - currentCount);
    return NextResponse.json(
      {
        ok: false,
        message:
          left > 0
            ? `Credenciales inválidas. Intentos restantes antes del bloqueo: ${left}.`
            : "Demasiados intentos fallidos. IP bloqueada por 15 minutos.",
      },
      { status: 401 }
    );
  }

  // Login exitoso: limpiar contador de intentos y emitir Cookie HttpOnly firmada con HMAC-SHA256
  failedAttempts.delete(ip);
  const token = createSignedSessionToken(username);

  const res = NextResponse.json({
    ok: true,
    authenticated: true,
  });

  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });

  return res;
}
