import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { isPro, chatDailyLimit, PRO_FEATURES } from "@/lib/billing/plan";
import UpgradeButton from "@/components/billing/UpgradeButton";

// Membaca plan pengguna dari DB saat request → render dinamis.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Upgrade ke Pro — Tabungin",
  description: "Buka fitur lanjutan: kuota chat lebih besar & proyeksi investasi detail.",
};

/**
 * Halaman /upgrade — menjelaskan benefit Pro + tombol upgrade (demo).
 * Dipakai untuk menguji minat (willingness-to-pay) sebelum pasang pembayaran.
 */
export default async function UpgradePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const pro = isPro(user?.plan);
  const freeLimit = chatDailyLimit("free");
  const proLimit = chatDailyLimit("pro");

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </Link>

        <header className="mb-6 flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Tabungin Pro
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {pro ? "Kamu sudah di paket Pro" : "Buka fitur lanjutan dengan Pro"}
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            {pro
              ? "Terima kasih! Semua fitur lanjutan sudah aktif untuk akunmu."
              : "Dapatkan kuota chat AI lebih besar dan proyeksi investasi yang lebih rinci untuk perencanaan yang lebih matang."}
          </p>
        </header>

        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Yang kamu dapat</h2>
          <ul className="flex flex-col gap-2.5">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[var(--accent)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-relaxed text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Perbandingan kuota konkret */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-border bg-background px-3.5 py-3">
              <div className="text-xs text-muted">Chat harian — Free</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">
                {freeLimit.toLocaleString("id-ID")}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--accent)]/40 bg-accent-soft px-3.5 py-3">
              <div className="text-xs text-[var(--accent)]">Chat harian — Pro</div>
              <div className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                {proLimit.toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </section>

        {pro ? (
          <Link
            href="/investment"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
          >
            Coba proyeksi detail di Investasi
          </Link>
        ) : (
          <UpgradeButton />
        )}

        <p className="mt-4 text-center text-xs text-muted">
          Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
