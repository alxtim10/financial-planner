// Tipe untuk daftar konsultan keuangan (view-only, data statis — tanpa DB).

/** Metode kontak yang didukung tombol "Hubungi". */
export type ContactMethod = "whatsapp" | "email" | "phone";

export interface ConsultantContact {
  method: ContactMethod;
  /**
   * Nilai kontak sesuai metode:
   * - whatsapp: nomor format internasional tanpa "+" (mis. "6281234567890")
   * - email: alamat email
   * - phone: nomor telepon (mis. "+6281234567890")
   */
  value: string;
}

export interface FinancialConsultant {
  id: string;
  name: string;
  /** Jabatan/peran, mis. "Perencana Keuangan (CFP®)". */
  title: string;
  /** Bidang keahlian ringkas untuk ditampilkan sebagai tag. */
  specialties: string[];
  /** Deskripsi singkat ramah-pemula. */
  bio: string;
  location: string;
  /** Perkiraan pengalaman dalam tahun. */
  experienceYears: number;
  /** Rating 0..5 (satu desimal). */
  rating: number;
  /** Kontak utama yang dipakai tombol "Hubungi". */
  contact: ConsultantContact;
}
