import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

// Username akun demo tunggal. Seluruh login diarahkan ke akun ini apa pun input
// pengguna (demo satu-pengguna). Selaras dengan seed (SEED_USERNAME default "demo").
const DEMO_USERNAME = process.env.SEED_USERNAME?.trim() || "demo";

/** Jalankan `fn` dengan retry singkat untuk menahan koneksi DB yang cold/transient. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 200): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * POST /api/auth/login — MODE BYPASS / HARDCODE AKUN DEMO.
 *
 * ⚠️ Demo satu-pengguna: validasi kredensial DIMATIKAN. Apa pun yang diketik di
 *   form (username/password, termasuk kosong) diabaikan — login SELALU masuk
 *   sebagai akun `demo`. Password tidak diperiksa (tidak ada scrypt), sehingga
 *   tidak ada lagi gejala "kadang gagal lalu beberapa kali baru bisa".
 *
 * Akun `demo` normalnya dibuat lewat seed; bila belum ada (mis. DB fresh), akun
 * dibuat otomatis sekali. Query DB diberi retry singkat agar tahan koneksi
 * Supabase yang cold. Session tetap JWT sungguhan (data ter-scope per userId).
 *
 * GANTI kembali ke verifikasi password sebelum produksi / multi-pengguna.
 */
export async function POST() {
  try {
    // Selalu arahkan ke akun demo tunggal, abaikan input form.
    let user = await withRetry(() =>
      prisma.user.findUnique({ where: { username: DEMO_USERNAME } }),
    );

    // Fallback: buat akun demo bila belum ada (DB fresh tanpa seed).
    if (!user) {
      const throwawayHash = await hashPassword(
        `bypass-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      user = await withRetry(() =>
        prisma.user.create({ data: { username: DEMO_USERNAME, passwordHash: throwawayHash } }),
      );
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ username: user.username }, { status: 200 });
  } catch (err) {
    console.error("[auth/login] gagal memproses login (bypass demo):", err);
    return NextResponse.json(
      { error: "Maaf, server sedang sibuk. Coba tekan Masuk sekali lagi." },
      { status: 503 },
    );
  }
}
