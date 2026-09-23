# Requirements Document: USP Enhancements (Trade-Off Optimizer & Context-Aware AI Copilot)

## Introduction

Dokumen ini mendefinisikan spesifikasi formal untuk peningkatan **Unique Selling Point (USP)** pada aplikasi **TabungOne**. Peningkatan ini berfokus pada dua diferensiasi utama yang membedakan TabungOne dari aplikasi pencatat keuangan maupun robo-advisor konvensional:

1. **Trade-Off Feasibility Optimizer (Deterministik):** Mengubah evaluasi kelayakan anggaran dari sekadar pesan peringatan pasif (`tight` / `impossible`) menjadi mesin rekomendasi aksi nyata dengan 3 solusi komparatif yang dapat diterapkan secara instan dengan 1 klik.
2. **Context-Aware Financial Twin (AI Copilot):** Mengubah asisten AI (ChatDrawer) dari chatbot tanya-jawab generik menjadi asisten perencana keuangan cerdas yang secara otomatis membaca seluruh snapshot data pengguna (Profil Finansial, Tujuan Aktif, Profil Risiko, dan Rencana Anggaran) tanpa mengharuskan pengguna mengetik ulang data mereka.
3. **Emergency Fund Waterfall Metric:** Indikator kesiapan dana darurat berbasis rasio likuiditas untuk mengedukasi alokasi prioritas sebelum instrumen berisiko tinggi.

---

## Glossary

- **Trade_Off_Optimizer**: Modul komputasi deterministik murni (`lib/planner/tradeoffs.ts`) yang menghitung alternatif realistis ketika alokasi tabungan berstatus `tight` atau `impossible`.
- **Trade_Off_Solution**: Satu opsi penyesuaian matematis yang terdiri dari tipe (`EXTEND_HORIZON`, `REDUCE_TARGET`, `REDUCE_WANTS`), label deskriptif, nilai baru, dan delta penghematan/perpanjangan waktu.
- **Financial_Twin_Context**: Payload terstruktur yang dibentuk di server (`lib/ai/financialContext.ts`) berisi data terkini dari `FinancialProfile`, `Goal`, `RiskAssessment`, dan `BudgetPlan`.
- **Emergency_Fund_Coverage**: Rasio kesiapan dana darurat dalam satuan bulan, dihitung dari $\frac{\text{currentSavings}}{\text{expense}}$.
- **Contextual_Quick_Prompts**: Daftar saran pertanyaan cepat di UI ChatDrawer yang disesuaikan dengan kondisi finansial spesifik pengguna saat ini.

---

## Requirements

### 1. Trade-Off Feasibility Optimizer

#### 1.1 Deteksi Status Kelayakan
- KETIKA hasil perhitungan anggaran menghasilkan status kelayakan `tight` ATAU `impossible`:
  - SISTEM HARUS secara otomatis menghitung minimal 3 opsi trade-off solusi realistis.
  - SISTEM HARUS mengembalikan daftar opsi tersebut dalam respons API `/api/budget` dan menampilkannya pada `BudgetResultCard`.

#### 1.2 Formula Solusi Trade-Off
- **Opsi 1: Perpanjang Horizon (`EXTEND_HORIZON`):**
  - Menghitung jumlah bulan baru ($H_{new}$) yang dibutuhkan agar setoran bulanan target sama dengan kapasitas surplus pemasukan ($\text{income} - \text{expense}$ atau sisa alokasi tabungan maksimum).
  - Formula: $H_{new} = \lceil \frac{\text{targetAmount}}{\text{maxMonthlySavings}} \rceil$.
- **Opsi 2: Sesuaikan Target Nominal (`REDUCE_TARGET`):**
  - Menghitung nominal target baru ($T_{new}$) yang dapat dicapai dalam jangka waktu $H$ yang sama menggunakan kapasitas tabungan saat ini.
  - Formula: $T_{new} = \text{maxMonthlySavings} \times \text{horizonMonths}$.
- **Opsi 3: Pangkas Pos Keinginan (`REDUCE_WANTS`):**
  - Jika pos Keinginan $> 0$ dan penghematan pada pos ini dapat menutupi defisit tabungan, sistem menghitung nominal pemangkasan pos Keinginan.

#### 1.3 Interaksi Terapkan Solusi (1-Click Apply)
- KETIKA pengguna menekan tombol "Terapkan Solusi" pada salah satu kartu trade-off:
  - Form planner HARUS otomatis memperbarui nilai input sesuai solusi yang dipilih dan melakukan kalkulasi ulang secara instan.
  - Notifikasi visual feedback singkat HARUS muncul mengonfirmasi penerapan parameter baru.

---

### 2. Context-Aware AI Copilot (Zero-Prompt Injection)

#### 2.1 Agregasi Konteks Finansial Otomatis
- KETIKA endpoint `/api/chat` menerima permintaan percakapan:
  - SISTEM HARUS mengambil snapshot data aktif pengguna secara asinkron:
    - `FinancialProfile` terbaru (pemasukan, pengeluaran, tabungan saat ini, rasio dana darurat).
    - `Goal` aktif terbaru (nama, target amount, horizon months).
    - `RiskAssessment` terbaru (profil risiko: Konservatif / Moderat / Agresif).
    - `BudgetPlan` terbaru (pos Ditabung, Kebutuhan, Keinginan, status kelayakan).
  - SISTEM HARUS memformat data tersebut ke dalam blok *System Instruction* Gemini secara terstruktur.

#### 2.2 Persona & Batasan AI Copilot
- Asisten AI HARUS mengadopsi persona **TabungOne** yang hangat, profesional, objektif, dan mengacu pada angka data pengguna yang tersedia.
- Asisten AI TIDAK BOLEH mengubah kalkulasi matematis deterministik yang telah dihasilkan oleh sistem, melainkan memberikan saran strategi, edukasi mitigasi, atau rekomendasi kebiasaan (*behavioral nudge*).
- Asisten AI HARUS selalu menyertakan disclaimer edukatif dan tidak memberikan jaminan keuntungan investasi tertentu.

#### 2.3 Contextual Quick Prompts di UI
- Komponen `ChatDrawer` HARUS menampilkan 3–4 tombol *Quick Prompt* yang relevan berdasarkan status profil pengguna, contoh:
  - Jika `feasibility === 'impossible'`: *"Bagaimana strategi terbaik mengatasi target tabungan saya yang defisit?"*
  - Jika `emergencyCoverage < 3`: *"Berapa dana darurat ideal untuk kondisi pengeluaran saya saat ini?"*
  - Jika sudah ada `Goal`: *"Apakah alokasi investasi saya sudah optimal untuk target [Nama Goal]?"*

---

### 3. Emergency Fund Waterfall Indicator

#### 3.1 Kalkulasi Rasio Dana Darurat
- SISTEM HARUS menghitung `emergencyFundCoverageMonths` $= \frac{\text{currentSavings}}{\text{expense}}$.
- KETIKA rasio $< 3.0$ bulan:
  - SISTEM HARUS menandai status likuiditas sebagai `VULNERABLE` dan menampilkan saran edukatif untuk memprioritaskan likuiditas sebelum instrumen berisiko tinggi.
- KETIKA rasio $3.0 \le \text{rasio} \le 6.0$ bulan:
  - SISTEM HARUS menandai status sebagai `ADEQUATE`.
- KETIKA rasio $> 6.0$ bulan:
  - SISTEM HARUS menandai status sebagai `STRONG`.

---

## Out of Scope (Untuk Iterasi Lanjutan)
- Multi-user authentication & OAuth login (tetap nullable `userId` untuk kesiapan auth).
- Parsing otomatis mutasi PDF e-statement (masuk ke roadmap Fase 3).
- Eksekusi transaksi pembelian reksadana/saham langsung (TabungOne adalah perencana dan penasihat edukatif murni).
