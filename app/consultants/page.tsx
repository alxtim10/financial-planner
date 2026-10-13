import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import ConsultantCard from "@/components/consultant/ConsultantCard";
import { CONSULTANTS } from "@/lib/consultants";

export const metadata = {
  title: "Konsultan Keuangan — TabungOne",
  description:
    "Daftar konsultan keuangan yang bisa Anda hubungi untuk berkonsultasi lebih lanjut.",
};

/**
 * Halaman Konsultan Keuangan (view-only). Menampilkan daftar konsultan dari
 * data statis (`lib/consultants.ts`) beserta tombol "Hubungi" yang membuka
 * kanal eksternal (WhatsApp/email/telepon). Tanpa DB, tanpa booking.
 *
 * Tidak dilindungi Profile_Gate: menu ini informatif dan boleh diakses kapan
 * saja. Karena hanya data statis, halaman bisa dirender statis.
 */
export default function ConsultantsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </Link>

        <div className="mb-6 flex flex-col gap-3 pr-16">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Users className="h-3.5 w-3.5" />
            Konsultan keuangan
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Butuh pendampingan lebih lanjut?
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Berikut daftar konsultan keuangan yang bisa Anda hubungi langsung
            untuk berdiskusi sesuai kebutuhan. Pilih yang paling cocok, lalu
            tekan tombol untuk menghubungi.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONSULTANTS.map((c) => (
            <ConsultantCard key={c.id} consultant={c} />
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Daftar ini bersifat informatif. TabungOne tidak memungut biaya dan
          bukan merupakan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
