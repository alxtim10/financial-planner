import { redirect } from "next/navigation";
import { getLatestProfile } from "@/lib/profileGate";

/**
 * Profile_Gate — guard server-side yang melindungi Investment_Scope.
 *
 * Perilaku (Requirements 1.3, 1.4):
 * - Bila belum ada Financial_Profile tersimpan (`getLatestProfile()` → null),
 *   arahkan pengguna ke `/profile` untuk mengisi profil terlebih dahulu.
 * - Bila profil sudah ada, izinkan akses dengan merender `children`.
 *
 * Ini adalah React Server Component (TANPA "use client") sehingga `redirect`
 * dari `next/navigation` dan query Prisma berjalan di server sebelum konten
 * dikirim ke klien — tidak ada flash konten Investment yang tak sah.
 *
 * Cara pakai (integrasi oleh task 7.1 yang memiliki app/investment/page.tsx):
 *
 *   // app/investment/page.tsx (server component)
 *   import ProfileGate from "@/components/profile/ProfileGate";
 *   import InvestmentClient from "@/components/investment/InvestmentClient";
 *
 *   export default function InvestmentPage() {
 *     return (
 *       <ProfileGate>
 *         <InvestmentClient />
 *       </ProfileGate>
 *     );
 *   }
 */
export default async function ProfileGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getLatestProfile();

  if (!profile) {
    redirect("/profile");
  }

  return <>{children}</>;
}
