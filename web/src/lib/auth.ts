import crypto from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "chacohoy_vault_session";

// Credenciales blindadas por defecto (pueden sobreescribirse en .env.local)
export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USER || "director.chacohoy",
    password: process.env.ADMIN_PASSWORD || "Ch4c0H0y!2026#R3d4cc10n$99",
    secret:
      process.env.AUTH_SECRET ||
      "chacohoy-hmac-sha256-vault-secret-key-2026-resistencia-chaco",
  };
}

/**
 * Comparación en tiempo constante (Constant-Time Comparison) usando SHA-256 + timingSafeEqual.
 * Impide ataques de medición de tiempo (Timing Attacks) por hackers o bots de IA.
 */
export function verifyCredentialsTimingSafe(
  inputUser: string,
  inputPass: string
): boolean {
  const { username, password } = getAdminCredentials();

  const userHashA = crypto.createHash("sha256").update(inputUser).digest();
  const userHashB = crypto.createHash("sha256").update(username).digest();

  const passHashA = crypto.createHash("sha256").update(inputPass).digest();
  const passHashB = crypto.createHash("sha256").update(password).digest();

  const userMatch = crypto.timingSafeEqual(userHashA, userHashB);
  const passMatch = crypto.timingSafeEqual(passHashA, passHashB);

  return userMatch && passMatch;
}

/**
 * Genera un token de sesión firmado criptográficamente con HMAC-SHA256 y expiración de 12 horas.
 */
export function createSignedSessionToken(username: string): string {
  const { secret } = getAdminCredentials();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12; // 12 horas
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${username}.${expiresAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifySignedSessionToken(token?: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [username, expiresAtStr, nonce, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return false;

  const { secret, username: expectedUser } = getAdminCredentials();
  if (username !== expectedUser) return false;

  const payload = `${username}.${expiresAtStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

export async function isAuthenticatedRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return verifySignedSessionToken(token);
  } catch {
    return false;
  }
}
