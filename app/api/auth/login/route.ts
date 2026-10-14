import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/**
 * POST /api/auth/login — login dengan username + password.
 * Sukses → set cookie session (JWT) + 200 { username }.
 * Kredensial salah → 401 (pesan generik, tidak membocorkan field mana yang salah).
 */
export async function POST(req: Request) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { username, password } = body ?? {};

  if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
    return NextResponse.json(
      { error: "Username dan password wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: username.trim() } });

    // Pesan generik untuk username tak ada maupun password salah.
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 },
      );
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ username: user.username }, { status: 200 });
  } catch (err) {
    console.error("[auth/login] gagal memproses login:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memproses login. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
