import type {
  FinancialConsultant,
  ConsultantContact,
} from "@/types/consultant";

/**
 * Daftar konsultan keuangan — DATA STATIS untuk tampilan (view-only).
 *
 * MVP tanpa DB/booking: menu ini hanya menampilkan daftar + tombol "Hubungi"
 * yang membuka kanal eksternal (WhatsApp/email/telepon). Data placeholder;
 * ganti dengan konsultan nyata saat tersedia.
 *
 * Catatan kepatuhan: nomor/alamat di bawah adalah contoh/placeholder, bukan
 * data pribadi nyata.
 */
export const CONSULTANTS: FinancialConsultant[] = [
  {
    id: "rina-pratiwi",
    name: "Rina Pratiwi",
    title: "Perencana Keuangan (CFP®)",
    specialties: ["Dana darurat", "Perencanaan tujuan", "Reksa dana"],
    bio: "Membantu pemula menata arus kas dan membangun dana darurat sebelum masuk ke investasi.",
    location: "Jakarta",
    experienceYears: 8,
    rating: 4.8,
    contact: { method: "whatsapp", value: "6281200000001" },
  },
  {
    id: "budi-santoso",
    name: "Budi Santoso",
    title: "Advisor Investasi",
    specialties: ["Alokasi aset", "Saham & indeks", "Pensiun"],
    bio: "Fokus pada strategi investasi jangka panjang dan diversifikasi portofolio sesuai profil risiko.",
    location: "Bandung",
    experienceYears: 12,
    rating: 4.6,
    contact: { method: "email", value: "budi.santoso@example.com" },
  },
  {
    id: "siti-hamidah",
    name: "Siti Hamidah",
    title: "Perencana Keuangan Syariah",
    specialties: ["Keuangan syariah", "Sukuk", "Zakat & wakaf"],
    bio: "Pendampingan perencanaan keuangan berbasis prinsip syariah untuk tujuan keluarga.",
    location: "Surabaya",
    experienceYears: 6,
    rating: 4.9,
    contact: { method: "whatsapp", value: "6281200000003" },
  },
  {
    id: "andi-wijaya",
    name: "Andi Wijaya",
    title: "Konsultan Manajemen Utang",
    specialties: ["Pelunasan utang", "Anggaran", "Kredit"],
    bio: "Membantu menyusun strategi pelunasan utang dan menyehatkan anggaran bulanan.",
    location: "Yogyakarta",
    experienceYears: 10,
    rating: 4.5,
    contact: { method: "phone", value: "+6281200000004" },
  },
];

/**
 * Membangun URL/href untuk tombol "Hubungi" sesuai metode kontak.
 * Pure function — tidak melakukan I/O.
 *
 * - whatsapp → https://wa.me/<nomor>?text=<pesan terenkode>
 * - email    → mailto:<alamat>?subject=<subjek terenkode>
 * - phone    → tel:<nomor>
 */
export function buildContactHref(contact: ConsultantContact): string {
  switch (contact.method) {
    case "whatsapp": {
      const sapaan =
        "Halo, saya menemukan Anda lewat Tabungin dan ingin berkonsultasi soal perencanaan keuangan.";
      return `https://wa.me/${contact.value}?text=${encodeURIComponent(sapaan)}`;
    }
    case "email": {
      const subjek = "Konsultasi keuangan via Tabungin";
      return `mailto:${contact.value}?subject=${encodeURIComponent(subjek)}`;
    }
    case "phone":
      return `tel:${contact.value}`;
  }
}

/** Label metode kontak untuk ditampilkan di tombol. */
export function contactLabel(method: ConsultantContact["method"]): string {
  switch (method) {
    case "whatsapp":
      return "Hubungi via WhatsApp";
    case "email":
      return "Hubungi via Email";
    case "phone":
      return "Hubungi via Telepon";
  }
}
