# Product Requirement Document (PRD): TabungOne (Financial Planner)

> **Dokumen Terkait:** Dokumen arah produk lengkap yang otoritatif dapat dilihat pada [`dokumentasi.md`](./dokumentasi.md), dengan spesifikasi formal per modul pada folder [`.kiro/specs/`](./.kiro/specs/).

---

## 1. Overview & Objectives

**TabungOne** adalah aplikasi web perencana keuangan personal terstruktur berbasis Next.js App Router. Aplikasi ini membimbing pengguna memahami kondisi keuangan mereka, menetapkan tujuan finansial, memperoleh rekomendasi alokasi investasi berbasis aturan (*rule-based*), menyusun perencanaan anggaran bulanan yang digerakkan oleh tujuan (*goal-driven*), serta berkonsultasi secara interaktif melalui asisten AI (Gemini).

- **Target Audiens:** Individu yang ingin merencanakan keuangan personal secara praktis, terstruktur, dan edukatif, baik pemula maupun yang ingin mensimulasikan pencapaian target dana tertentu.
- **Tujuan Produk:**
  1. **Struktur & Disiplin Finansial:** Mewajibkan profil keuangan (*gating*) sebagai landasan kalkulasi realistis.
  2. **Tujuan Terpusat (Active Goal):** Mengintegrasikan satu tujuan keuangan bersama yang dipakai oleh modul Investasi dan Planner.
  3. **Rekomendasi Deterministik & Transparan:** Memberikan alokasi aset dan proyeksi setoran bulanan (Future Value of Annuity) menggunakan kalkulasi matematika murni dan aturan terstandarisasi (bukan hasil halusinasi AI).
  4. **Perencanaan Anggaran Goal-Driven:** Menghitung jumlah yang harus ditabung untuk mencapai target, lalu menurunkan alokasi kebutuhan dan keinginan secara realistis beserta peringatan kelayakan (*feasibility*).
  5. **Konsultasi AI Fleksibel:** Menyediakan asisten AI yang dapat diakses kapan saja melalui panel *drawer* di seluruh halaman aplikasi.

---

## 2. Fitur Utama & Alur Pengguna

```mermaid
flowchart LR
    A[1. Profil Finansial\nGate Wajib] --> B[2. Tujuan Aktif\nDashboard]
    B --> C[3. Cakupan Investasi\nAlokasi & FV Annuity]
    B --> D[4. Cakupan Planner\nGoal-Driven Budget]
    E[5. Asisten AI TabungOne\nGlobal Drawer] -.Tersedia di semua halaman.-> A & B & C & D
```

### 2.1 Profil Finansial (Financial Profile - Gate Wajib)
- Mengumpulkan 3 data inti: **Pemasukan Bulanan**, **Pengeluaran Bulanan**, dan **Tabungan Saat Ini**.
- Pengeluaran mencakup cicilan utang dan pembagian rata pengeluaran tahunan/non-bulanan.
- Menjadi gerbang wajib (*Profile Gate*): modul Investasi dan Planner terkunci sebelum profil ini diisi.

### 2.2 Tujuan Aktif Tersentralisasi (Centralized Active Goal)
- Dikelola langsung dari Dashboard (`/`).
- Terdiri dari: Nama tujuan (opsional), Nominal Target Dana (Rupiah), dan Jangka Waktu (**dalam satuan bulan** `horizonMonths`).
- Bersifat *latest wins* (baris `Goal` terbaru).
- Nilai target dan jangka waktu otomatis di-*prefill* ke modul Investasi dan Planner, dengan dukungan *one-off override* tanpa mengubah tujuan tersimpan.

### 2.3 Cakupan Investasi (Investment Scope)
- **Alur 3 Langkah (Wizard):**
  1. **Tujuan:** Menentukan nominal target dan jangka waktu bulan (ter-*prefill* dari Tujuan Aktif).
  2. **Survei Profil Risiko:** 5 pertanyaan survei singkat $\rightarrow$ klasifikasi `Konservatif`, `Moderat`, atau `Agresif`.
  3. **Rekomendasi:** Menampilkan alokasi instrumen (RDPU, SBN/Deposito, Emas, Saham/Indeks) berdasarkan matriks Horizon $\times$ Profil Risiko, estimasi return tahunan, serta setoran bulanan yang diperlukan menggunakan rumus *Future Value of Annuity*.

### 2.4 Cakupan Planner Anggaran Goal-Driven (Budget Planner)
- **Alur 2 Langkah (Wizard):**
  1. **Form Tujuan & Pemasukan:** Menentukan target, jangka waktu, pemasukan bulanan, dan pengeluaran (ter-*prefill* dari profil & tujuan aktif).
  2. **Hasil Anggaran:** Sistem menghitung pos **Ditabung** secara akumulasi murni, pos **Kebutuhan**, dan pos **Keinginan**, lalu menghasilkan persentase alokasi sebagai *output*.
- **Evaluasi Kelayakan (Feasibility Check):** Memberikan status `ok`, `tight` (anggaran sangat ketat), atau `impossible` (setoran tabungan melebihi total pemasukan) beserta saran perbaikan.

### 2.5 Asisten AI TabungOne (Chatbot Drawer)
- Asisten konsultasi keuangan yang dikemas dalam panel *drawer* geser dari kanan (`components/ChatDrawer.tsx`), dipicu melalui tombol sudut kanan atas di seluruh halaman.
- Didukung model Google Gemini dengan *streaming response* dan persona perencana keuangan yang ramah, objektif, dan edukatif.

---

## 3. Technical Stack & Dependencies

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS v4, `lucide-react`, `react-markdown`, `remark-gfm`
- **Database:** Supabase (PostgreSQL ter-host)
- **ORM:** Prisma (`prisma`, `@prisma/client`) dengan pola singleton di `lib/db.ts`
- **AI Engine:** `@google/genai` (Node.js runtime, streaming)
- **Testing:** Vitest

---

## 4. Setup & Konfigurasi Lingkungan

File `.env.local` di root proyek membutuhkan konfigurasi berikut:

```env
# Koneksi Database Supabase Pooled (PgBouncer, port 6543) untuk runtime aplikasi
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Koneksi Database Supabase Langsung (Direct, port 5432) untuk migrasi Prisma
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Kredensial Gemini API dari Google AI Studio
GEMINI_API_KEY="AIzaSy..."

# Model Gemini (opsional, default: gemini-flash-lite-latest)
GEMINI_MODEL="gemini-flash-lite-latest"
```

---

## 5. Non-Functional & Operational Requirements

1. **Deterministik & Presisi Finansial:** Seluruh perhitungan alokasi investasi, proyeksi FV annuity, dan pembagian pos anggaran berada di modul logika murni (`lib/investment/*`, `lib/planner/*`) tanpa ketergantungan DB/UI, dengan pembulatan tampilan hanya di level komponen UI.
2. **Kesiapan Autentikasi Masa Depan:** Semua model tabel database menyertakan kolom `userId` (nullable) sehingga siap dihubungkan dengan modul autentikasi tanpa migrasi skema destruktif.
3. **Resiliensi & Error Handling:** 
   - Transaksi database yang gagal menampilkan pesan ramah Bahasa Indonesia.
   - Streaming chatbot menangani error koneksi dan API rate limiting secara *graceful*.
4. **Disclaimer Hukum:** Seluruh simulasi dan rekomendasi dilengkapi pernyataan bahwa aplikasi bersifat edukatif dan bukan merupakan nasihat keuangan/investasi tersertifikasi.