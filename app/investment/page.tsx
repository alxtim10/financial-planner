import Link from "next/link";
import { ArrowLeft, LineChart } from "lucide-react";
import ProfileGate from "@/components/profile/ProfileGate";
import InvestmentWizard from "@/components/investment/InvestmentWizard";

// Dilindungi Profile_Gate yang melakukan query DB (Prisma) saat request.
// Paksa render dinamis agar `next build` tidak melakukan query DB saat
// prerender/static generation (build tidak boleh bergantung pada DB).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Perencanaan Investasi — alxfinancial",
  description:
    "Tetapkan tujuan, isi survei risiko, dan dapatkan rekomendasi alokasi investasi edukatif.",
};

/**
 * Halaman Investment_Scope. Server component yang dilindungi Profile_Gate
 * (Req 1.3, 1.4): bila Financial_Profile belum ada, pengguna diarahkan ke
 * `/profile`. Logika alur (Goal → Survei → Rekomendasi) berada di komponen
 * client `InvestmentWizard`.
 */
export default function InvestmentPage() {
  return (
    <ProfileGate>
      <div className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke dashboard
          </Link>

          <div className="mb-6 flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
              <LineChart className="h-3.5 w-3.5" />
              Perencanaan investasi
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Rencanakan Investasi Anda
            </h1>
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              Tetapkan tujuan finansial, isi survei profil risiko singkat, lalu
              dapatkan rekomendasi alokasi beserta perkiraan kontribusi bulanan.
            </p>
          </div>

          <InvestmentWizard />

          <p className="mt-4 text-center text-xs text-muted">
            Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
          </p>
        </div>
      </div>
    </ProfileGate>
  );
}
