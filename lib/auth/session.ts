import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/auth/jwt";

// Helper session berbasis cookie HTTP-only. Dipakai server component & route
// handler untuk menetapkan dan membaca identitas pengguna.

export const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 hari

/** Menetapkan cookie session untuk `userId` (dipanggil setelah login sukses). */
export async function setSessionCookie(userId: string): Promise<void> {
  const token = signSession(userId, SESSION_TTL_SECONDS);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Menghapus cookie session (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Membaca `userId` dari cookie session, atau `null` bila belum login / token
 * tidak valid. Aman dipanggil di server component maupun route handler.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * Seperti getCurrentUserId tetapi melempar bila belum login. Dipakai route
 * handler yang wajib terautentikasi (pemanggil menangkap → balas 401).
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}

/** Error khusus untuk kondisi belum terautentikasi. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Belum login.");
    this.name = "UnauthorizedError";
  }
}

/**
 * Cek apakah pengguna login adalah admin (akses dashboard analitik pemilik).
 *
 * Aturan demo sederhana:
 * - Bila env `ADMIN_USERNAME` diset → hanya username itu yang admin.
 * - Bila `ADMIN_USERNAME` kosong → semua pengguna yang login dianggap admin
 *   (cukup untuk demo single-tenant). Harus diperketat sebelum produksi.
 *
 * Menerima `username` pemilik session (dipanggil setelah lookup User).
 */
export function isAdmin(username: string | null | undefined): boolean {
  if (!username) return false;
  const allow = process.env.ADMIN_USERNAME?.trim();
  if (!allow) return true; // demo: semua user login = admin
  return username === allow;
}
