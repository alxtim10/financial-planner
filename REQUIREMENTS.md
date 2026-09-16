# Acceptance Criteria & Requirements

## Functional Acceptance Criteria (Gherkin Scenarios)

### Scenario 1: Input Finansial Tidak Lengkap
**Given** pengguna memberikan input kueri umum seperti "Bantu atur keuangan saya"
**When** pesan dikirim ke sistem
**Then** asisten harus merespons dengan meminta 3 data utama:
  1. Pemasukan bulanan
  2. Pengeluaran / cicilan tetap
  3. Tujuan keuangan
**And** asisten tidak boleh memberikan simulasi alokasi angka acak tanpa data tersebut.

### Scenario 2: Perhitungan Alokasi 50/30/20
**Given** pengguna memiliki gaji Rp 10.000.000 tanpa utang spesifik
**When** pengguna meminta pembagian anggaran dasar
**Then** asisten harus menghitung dengan presisi:
  - Rp 5.000.000 untuk Kebutuhan Pokok (50%)
  - Rp 3.000.000 untuk Keinginan (30%)
  - Rp 2.000.000 untuk Tabungan/Investasi (20%)
**And** menampilkan rincian dalam format *bullet point* atau tabel.

### Scenario 3: Kewajiban Disclaimer
**Given** asisten telah selesai merumuskan rincian rencana keuangan
**When** asisten menghasilkan ringkasan atau kesimpulan
**Then** bagian akhir pesan harus selalu ditutup dengan pernyataan:
  *"Disclaimer: Simulasi ini bertujuan edukatif dan bukan merupakan nasihat investasi/keuangan tersertifikasi."*

### Scenario 4: Error Handling pada API/Stream
**Given** terjadi kendala koneksi atau *rate limit* dari Google API
**When** asisten gagal memproses input pengguna
**Then** sistem harus menampilkan pesan *error* "Gagal memulai sesi" (jika di awal stream) atau pesan error yang memadai jika stream terputus di tengah proses.