import Link from "next/link";
import {
  ArrowRight,
  LineChart,
  MessageCircle,
  PieChart,
  PiggyBank,
  Sparkles,
  TrendingDown,
  UserRound,
  Wallet,
} from "lucide-react";
import { getLatestProfile } from "@/lib/profileGate";
import { getActiveGoal } from "@/lib/goal";
import ActiveGoalCard from "@/components/goal/ActiveGoalCard";

// Halaman ini membaca Financial_Profile dari DB (Prisma) saat request.
// Paksa render dinamis agar `next build` tidak mencoba melakukan query DB
// saat prerender/static generation (build tidak boleh bergantung pada DB).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "TabungOne — Perencana Keuangan",
  description:
    "Perencana keuangan pribadi: mulai dari profil finansial, tetapkan tujuan, dan dapatkan rekomendasi alokasi investasi.",
};

/** Format nominal ke Rupiah id-ID (mis. 10000 → "Rp 10.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * Dashboard aplikasi (Req 1.4). Server component yang membaca Financial_Profile
 * terakhir via `getLatestProfile()` untuk menampilkan ringkasan status:
 * - Bila profil belum ada: dorong pengguna mengisi profil (CTA ke `/profile`).
 * - Bila profil sudah ada: tampilkan ringkasan singkat (pemasukan, pengeluaran,
 *   tabungan) + CTA lanjut ke `/investment`.
 * Menyediakan kartu navigasi ke Profil Finansial dan Investasi. Chatbot AI
 * pelengkap tersedia lewat tombol di sudut kanan atas (drawer di layout).
 */
export default async function Home() {
  const profile = await getLatestProfile();
  const hasProfile = profile !== null;
  const activeGoal = await getActiveGoal();

  return (
    <div className="min-h-dvh bg-background">
      {/* pr-16 di header memberi ruang agar tidak menabrak tombol drawer
          (fixed right-4 top-4, z-30) yang di-mount di app/layout.tsx. */}
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8 flex flex-col gap-3 pr-16">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Perencana keuangan
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            TabungOne
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Rencanakan keuangan Anda secara terstruktur: mulai dari profil
            finansial, tetapkan tujuan, lalu dapatkan rekomendasi alokasi
            investasi. Butuh diskusi? Asisten AI tersedia lewat tombol di sudut
            kanan atas.
          </p>
        </header>

        {/* ── Ringkasan status profil ─────────────────────────── */}
        <section
          aria-label="Status profil finansial"
          className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
        >
          {hasProfile ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Profil finansial Anda
                </h2>
                <p className="text-sm text-muted">
                  Berikut ringkasan kondisi keuangan yang tersimpan. Lanjutkan
                  ke perencanaan investasi kapan saja.
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted">Pemasukan / bln</dt>
                    <dd className="truncate text-sm font-medium text-foreground">
                      {formatRupiah(profile.income)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                    <TrendingDown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted">Pengeluaran / bln</dt>
                    <dd className="truncate text-sm font-medium text-foreground">
                      {formatRupiah(profile.expense)}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                    <PiggyBank className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted">Tabungan saat ini</dt>
                    <dd className="truncate text-sm font-medium text-foreground">
                      {formatRupiah(profile.currentSavings)}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/investment"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
                >
                  Lanjut ke perencanaan investasi
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/profile"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[0.9375rem] font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  Perbarui profil
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Mulai dari profil finansial Anda
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  Anda belum mengisi profil finansial. Lengkapi pemasukan,
                  pengeluaran, dan tabungan saat ini terlebih dahulu — langkah
                  ini wajib sebelum masuk ke perencanaan investasi.
                </p>
              </div>
              <Link
                href="/profile"
                className="flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
              >
                Isi profil finansial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* ── Kartu Tujuan Aktif (Req 4.5) ────────────────────── */}
        <ActiveGoalCard
          activeGoal={
            activeGoal
              ? {
                  id: activeGoal.id,
                  name: activeGoal.name,
                  targetAmount: activeGoal.targetAmount,
                  horizonYears: activeGoal.horizonYears,
                }
              : null
          }
        />

        {/* ── Kartu navigasi ──────────────────────────────────── */}
        <section aria-label="Navigasi" className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Jelajahi</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/profile"
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-foreground">
                  Profil Finansial
                  <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Catat pemasukan, pengeluaran, dan tabungan sebagai dasar
                  perencanaan.
                </p>
              </div>
            </Link>

            <Link
              href="/investment"
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
                <LineChart className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-foreground">
                  Investasi
                  <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Tetapkan tujuan, isi survei risiko, dan dapatkan rekomendasi
                  alokasi.
                </p>
              </div>
            </Link>

            <Link
              href="/planner"
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
                <PieChart className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-foreground">
                  Anggaran
                  <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Bagi pemasukan ke pos kebutuhan, keinginan, dan tabungan
                  berdasarkan metode preset.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Petunjuk asisten AI ─────────────────────────────── */}
        <section
          aria-label="Asisten AI"
          className="mb-8 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <MessageCircle className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed text-muted">
            Punya pertanyaan seputar keuangan? Buka asisten AI lewat tombol di{" "}
            <span className="font-medium text-foreground">sudut kanan atas</span>{" "}
            untuk berdiskusi kapan saja.
          </p>
        </section>

        <p className="text-center text-xs text-muted">
          Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
