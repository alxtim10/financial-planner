/**
 * Helper format input Rupiah (bilangan bulat) dengan pemisah ribuan gaya
 * Indonesia (titik setiap 3 digit). Murni, tanpa dependensi eksternal.
 * Dipakai untuk menampilkan nilai bergrup saat pengguna mengetik dan
 * mem-parsing kembali menjadi angka saat submit.
 */

/**
 * Ubah teks mentah dari pengguna menjadi string bergrup ribuan.
 * - Semua karakter non-digit dibuang.
 * - Leading zero dirapikan (mis. "007" → "7"), tetapi "0" tetap "0"
 *   jika hanya itu yang tersisa.
 * - Kosong / tanpa digit → "".
 * Contoh: "100000000" → "100.000.000".
 */
export function formatThousands(raw: string): string {
  // Buang semua karakter selain angka.
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";

  // Rapikan leading zero: "007" → "7", tetapi pertahankan "0" tunggal.
  const normalized = digits.replace(/^0+(?=\d)/, "");

  // Sisipkan titik setiap 3 digit dari kanan.
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Kebalikan dari formatThousands: buang titik (dan karakter non-digit lain)
 * lalu kembalikan bilangan bulat, atau null bila kosong/tidak valid.
 */
export function parseThousands(display: string): number | null {
  const digits = display.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
