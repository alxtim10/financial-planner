import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth/session";
import LoginForm from "@/components/auth/LoginForm";

// Membaca cookie session saat request → render dinamis.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Masuk — Tabungin",
  description: "Masuk untuk mengakses perencana keuangan Anda.",
};

/**
 * Halaman login (demo). Bila sudah login, langsung diarahkan ke dashboard.
 */
export default async function LoginPage() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
        <header className="mb-6 flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Perencana keuangan
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Masuk ke Tabungin
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Masuk dengan akun Anda untuk melanjutkan perencanaan keuangan.
          </p>
        </header>

        <LoginForm />

        <p className="mt-4 text-center text-xs text-muted">
          Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
