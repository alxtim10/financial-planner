import { createHmac, timingSafeEqual } from "crypto";

// JWT minimalis (HS256) memakai Node crypto — tanpa dependency.
// Untuk demo: payload berisi { sub: userId, exp }. Ditandatangani HMAC-SHA256
// dengan AUTH_SECRET dari environment.

const ALG = "HS256";

interface JwtPayload {
  sub: string; // userId
  exp: number; // epoch detik
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET belum diset (atau terlalu pendek). Set di .env.local, minimal 16 karakter.",
    );
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", getSecret()).update(data).digest());
}

/** Membuat token JWT untuk `userId` dengan masa berlaku `ttlSeconds`. */
export function signSession(userId: string, ttlSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: ALG, typ: "JWT" }));
  const payload: JwtPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

/**
 * Memverifikasi token dan mengembalikan `userId` bila valid & belum kedaluwarsa,
 * atau `null` bila tidak valid. Tidak melempar.
 */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  const [header, body, signature] = segments;

  // Verifikasi tanda tangan (waktu-konstan).
  const expectedSig = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlToBuffer(body).toString("utf8")) as JwtPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
