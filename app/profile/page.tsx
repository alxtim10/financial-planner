import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ProfileForm from "@/components/profile/ProfileForm";
import EmergencyFundCard from "@/components/profile/EmergencyFundCard";
import { getLatestProfile } from "@/lib/profileGate";

// Halaman ini membaca Financial_Profile dari DB (Prisma) saat request untuk
// menampilkan indikator dana darurat; paksa render dinamis.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profil Finansial — TabungOne",
  description: "Isi profil finansial dasar sebelum memulai perencanaan investasi.",
};

/**
 * Halaman onboarding Financial_Profile. Merupakan langkah wajib (gate) sebelum
 * mengakses Investment_Scope: pengguna mengisi pemasukan, pengeluaran, dan
 * tabungan saat ini terlebih dahulu. Bila profil sudah ada, tampilkan juga
 * indikator kesiapan dana darurat (Requirement 3.1).
 */
export default async function ProfilePage() {
  const profile = await getLatestProfile();

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

        <div className="mb-6 flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Langkah wajib
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Profil Finansial
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Isi kondisi keuangan dasar Anda terlebih dahulu. Data ini menjadi
            dasar rekomendasi investasi dan wajib diisi sebelum melanjutkan ke
            tahap perencanaan investasi.
          </p>
        </div>

        {profile && (
          <EmergencyFundCard
            currentSavings={profile.currentSavings}
            expense={profile.expense}
          />
        )}

        <ProfileForm />

        <p className="mt-4 text-center text-xs text-muted">
          Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
