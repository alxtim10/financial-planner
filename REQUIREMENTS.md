# Acceptance Criteria & Requirements: TabungOne (Financial Planner)

> **Dokumen Terkait:** Dokumen arah produk lengkap yang otoritatif dapat dilihat pada [`dokumentasi.md`](./dokumentasi.md), dengan spesifikasi formal per modul pada folder [`.kiro/specs/`](./.kiro/specs/).

---

## 1. Profil Finansial & Gating (Epic 1)

### Requirement 1.1: Pengumpulan Profil Finansial
- Pengguna wajib dapat mengisi **Pemasukan Bulanan** (`income` > 0), **Pengeluaran Bulanan** (`expense` $\ge$ 0), dan **Tabungan Saat Ini** (`currentSavings` $\ge$ 0).
- Input nominal diformat secara visual dengan pemisah ribuan Rupiah (id-ID).

### Requirement 1.2: Profile Gate (Pembatasan Akses)
- **Given** pengguna belum memiliki `FinancialProfile` yang tersimpan
- **When** pengguna mencoba mengakses rute `/investment` atau `/planner`
- **Then** sistem harus mengarahkan (*redirect*) atau menampilkan pesan pemblokiran yang meminta pengisian profil terlebih dahulu di `/profile`.

---

## 2. Tujuan Aktif Tersentralisasi (Epic 2)

### Requirement 2.1: Pengelolaan Tujuan di Dashboard
- Dashboard (`/`) menampilkan kartu **Tujuan Aktif** dengan opsi:
  - CTA **Tetapkan tujuan** bila belum ada tujuan tersimpan.
  - Ringkasan nama (opsional), target dana (Rupiah), jangka waktu (bulan), serta tombol **Ubah tujuan** bila sudah ada tujuan.
- Dashboard adalah satu-satunya tempat pembuatan/pembaruan baris `Goal` baru.

### Requirement 2.2: Prefill & One-off Override
- **Given** pengguna memiliki Tujuan Aktif tersimpan
- **When** pengguna membuka form pada halaman `/investment` atau `/planner`
- **Then** field `targetAmount` dan `horizonMonths` harus otomatis terisi dari Tujuan Aktif.
- **And** pengguna diizinkan mengubah nilai pada form tersebut untuk simulasi saat itu (*one-off override*) tanpa mengubah data Tujuan Aktif di database.

---

## 3. Cakupan Investasi: Rekomendasi & Proyeksi (Epic 3)

### Requirement 3.1: Matriks Alokasi Aturan
Sistem menentukan alokasi aset berdasarkan kombinasi `horizonMonths` dan klasifikasi profil risiko:
- **Horizon < 24 bulan:** 100% RDPU (semua profil risiko, est. return 4.75%).
- **Horizon 24–60 bulan:**
  - *Konservatif:* 70% RDPU + 30% SBN/Deposito (5.5%).
  - *Moderat:* 50% RDPU + 50% Emas/SBN Ritel (6.5%).
  - *Agresif:* 30% RDPU + 40% SBN/RDPT + 30% Emas (7.5%).
- **Horizon > 60 bulan:**
  - *Konservatif:* 50% SBN/RDPT + 30% Emas + 20% Saham (7.0%).
  - *Moderat:* 40% Saham/Indeks + 40% SBN + 20% Emas (9.5%).
  - *Agresif:* 70% Saham/Indeks + 20% SBN + 10% Emas (11.0%).

### Requirement 3.2: Perhitungan Kontribusi Bulanan (FV of Annuity)
- Setoran bulanan dihitung dengan rumus:
  $$\text{PMT} = \frac{(\text{FV} - \text{PV} \cdot (1+i)^n) \cdot i}{(1+i)^n - 1}$$
  - $\text{FV}$ = `targetAmount`
  - $\text{PV}$ = `currentSavings` (dari Profil)
  - $i$ = $\text{estReturn} / 12$
  - $n$ = `horizonMonths`
- Jika tabungan $\text{PV} \ge \text{FV}$, $\text{PMT} = 0$.

---

## 4. Cakupan Planner: Goal-Driven Budget (Epic 4)

### Requirement 4.1: Alokasi Akumulasi Murni
- Nilai **Ditabung** bulanan dihitung secara akumulasi murni tanpa asumsi bunga:
  $$\text{Ditabung} = \max\left(0, \frac{\text{targetAmount} - \text{currentSavings}}{\text{horizonMonths}}\right)$$
- Nilai **Kebutuhan** diambil dari `expense` profil; jika tidak tersedia/0, digunakan rasio fallback:
  $$\text{Kebutuhan} = \text{round}(0.65 \times (\text{monthlyIncome} - \text{Ditabung}))$$
- Nilai **Keinginan** $= \text{monthlyIncome} - \text{Ditabung} - \text{Kebutuhan}$.
- Persentase pos merupakan nilai turunan (*derived output*): $\text{pos} / \text{monthlyIncome} \times 100$.

### Requirement 4.2: Penilaian Kelayakan (Feasibility Check)
- **`impossible`:** Bila $\text{Ditabung} > \text{monthlyIncome}$ (saran: turunkan target atau perpanjang jangka waktu).
- **`tight`:** Bila $\text{Ditabung} + \text{Kebutuhan} > \text{monthlyIncome}$ ATAU $\text{Keinginan} < 5\% \text{ dari pemasukan}$.
- **`ok`:** Bila kondisi di atas terpenuhi dan anggaran berjalan sehat.

---

## 5. Asisten AI TabungOne (Epic 5)

### Requirement 5.1: Drawer & Akses Global
- Chatbot tersedia di pojok kanan atas seluruh halaman aplikasi melalui komponen *drawer*.
- Riwayat pesan dipelihara selama sesi berlangsung (*in-memory*).

### Requirement 5.2: Format & Disclaimer Wajib
- Respons disajikan secara *streaming* dengan formatting Markdown yang rapi.
- Setiap kesimpulan rencana keuangan yang dihasilkan asisten AI wajib ditutup dengan disclaimer:
  > *Disclaimer: Simulasi ini bertujuan edukatif dan bukan merupakan nasihat investasi/keuangan tersertifikasi.*