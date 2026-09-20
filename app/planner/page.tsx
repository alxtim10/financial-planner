import Link from "next/link";
import { ArrowLeft, PieChart } from "lucide-react";
import ProfileGate from "@/components/profile/ProfileGate";
import PlannerWizard from "@/components/planner/PlannerWizard";

// Dilindungi Profile_Gate yang melakukan query DB (Prisma) saat request.
// Paksa render dinamis agar `next build` tidak melakukan query DB saat
// prerender/static generation (build tidak boleh bergantung pada DB).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Perencanaan Anggaran — alxfinancial",
  description:
    "Pilih metode penganggaran preset, tetapkan jumlah dasar, dan lihat alokasi anggaran per pos secara edukatif.",
};

/**
 * Halaman Planner (Budget_Planner). Server component yang dilindungi Profile_Gate
 * (Req 1.1, 1.2, 1.3): bila Financial_Profile belum ada, pengguna diarahkan ke
 * `/profile`. Logika alur (Preset → Anggaran → Hasil) berada di komponen client
 * `PlannerWizard`.
 */
export default function PlannerPage() {
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
              <PieChart className="h-3.5 w-3.5" />
              Perencanaan anggaran
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Rencanakan Anggaran Anda
            </h1>
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              Pilih metode penganggaran preset, gunakan atau timpa jumlah dasar dari
              profil Anda, lalu lihat rincian alokasi tiap pos beserta target tabungan.
            </p>
          </div>

          <PlannerWizard />

          <p className="mt-4 text-center text-xs text-muted">
            Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
          </p>
        </div>
      </div>
    </ProfileGate>
  );
}
