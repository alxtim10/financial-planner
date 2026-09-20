# Requirements Document

## Introduction

**Budget Planner** (cakupan **Planner**) adalah fitur baru pada aplikasi Financial Planner yang membantu pengguna **mengalokasikan pemasukan bulanan** ke dalam beberapa ember (bucket) pengeluaran dan tabungan berdasarkan **metode penganggaran preset** yang sudah teruji (mis. 50/30/20). Fitur ini melengkapi cakupan Investasi yang sudah ada dengan menjawab pertanyaan: *"Setiap bulan, berapa yang sebaiknya saya alokasikan untuk kebutuhan, keinginan, dan tabungan?"*

Budget Planner **berintegrasi** dengan komponen yang sudah dibangun:
- Mengambil `income` dari `FinancialProfile` terbaru sebagai jumlah dasar default (boleh ditimpa manual).
- Dilindungi oleh `Profile_Gate` yang sama seperti cakupan Investasi — profil finansial wajib diisi lebih dulu.
- Dalam mode **kombinasi**, menarik `monthlyContribution` dari `InvestmentRecommendation` terbaru sebagai pos "Investasi" otomatis di dalam ember tabungan, lalu membandingkannya dengan alokasi tabungan preset.
- Memakai ulang pola arsitektur yang sudah ada: pure function terisolasi di `lib/planner/*`, Prisma Client singleton (`lib/db.ts`), API route runtime Node.js dengan penanganan error ramah, dan pola visual `RecommendationCard` (bar proporsi + rincian per pos + format Rupiah + disclaimer).

### Fokus & Batasan (penting)

Cakupan Planner pada iterasi ini **hanya penganggaran alokasi (allocation budgeting)** — membagi jumlah pemasukan bulanan ke pos-pos menurut persentase preset. Metode penganggaran dipilih dari **preset yang telah ditentukan** (bukan kategori kustom penuh).

### Out of Scope / Roadmap
- **Pencatatan transaksi harian** dan **pelacakan arus kas (cash-flow)** bulanan **TIDAK** termasuk dalam iterasi ini; keduanya tetap menjadi roadmap.
- **Kategori anggaran kustom penuh** (pengguna membuat pos & persentase sendiri dari nol) tidak termasuk; pengguna memilih dari 3 preset.
- **Autentikasi.** Field `userId` (nullable) tetap disertakan sebagai placeholder, konsisten dengan model lain.
- Export PDF/CSV, riwayat multi-anggaran, dan visualisasi tren.

### Kriteria Validasi
- Pengguna yang sudah memiliki `FinancialProfile` dapat membuka `/planner`, memilih salah satu dari 3 preset, memakai/menimpa jumlah dasar, memilih mode target tabungan, lalu melihat rincian alokasi per pos dalam Rupiah.
- Perhitungan anggaran bersifat **pure, deterministik, dan teruji**: persentase tiap preset berjumlah 100%, jumlah per pos presisi terhadap jumlah dasar.
- Mode **kombinasi** menarik `monthlyContribution` dari rekomendasi investasi terbaru dan menandai *shortfall* bila ember tabungan preset lebih kecil dari kontribusi investasi yang diperlukan.
- Rencana anggaran dipersistensi ke model `BudgetPlan` baru dan dapat diambil kembali.

---

## Glossary

- **Budget_Planner**: Fitur/cakupan Planner yang mengalokasikan pemasukan bulanan ke pos-pos anggaran berbasis preset.
- **Financial_Profile**: Data dasar keuangan pengguna yang sudah ada (income, expense, currentSavings). Menjadi gate wajib dan sumber default `Base_Amount`.
- **Profile_Gate**: Mekanisme guard server-side (sudah ada) yang mengarahkan pengguna ke `/profile` bila `Financial_Profile` belum ada.
- **Base_Amount**: Jumlah pemasukan bulanan yang menjadi dasar alokasi anggaran. Default diambil dari `income` `Financial_Profile` terbaru; dapat ditimpa nilai manual oleh pengguna.
- **Budget_Preset**: Metode penganggaran preset yang mendefinisikan sekumpulan kategori bernama dengan persentase tetap yang berjumlah 100%. Terdapat tepat 3 preset: `50/30/20`, `70/20/10`, `80/20`.
- **Budget_Category**: Satu pos di dalam sebuah `Budget_Preset`, memiliki nama (mis. "Kebutuhan") dan persentase (mis. 50).
- **Budget_Breakdown**: Hasil perhitungan berupa daftar `{ category, percentage, amount }` di mana `amount` adalah jumlah Rupiah pos tersebut dari `Base_Amount`.
- **Savings_Bucket**: Pos dalam preset yang merepresentasikan tabungan/investasi (mis. "Tabungan & Investasi" pada 50/30/20, "Tabungan" pada 70/20/10 dan 80/20).
- **Savings_Mode**: Cara target tabungan ditentukan. Bernilai `terpisah` (manual, independen dari Investasi) atau `kombinasi` (menarik `monthlyContribution` dari `Investment_Recommendation`).
- **Investment_Recommendation**: Model rekomendasi investasi yang sudah ada; field `monthlyContribution` menjadi kontrak data untuk mode `kombinasi`.
- **Investment_Contribution**: Nilai `monthlyContribution` dari `Investment_Recommendation` terbaru, dipakai sebagai pos "Investasi" otomatis dalam mode `kombinasi`.
- **Manual_Savings_Target**: Target tabungan bulanan yang diisi pengguna secara manual (opsional).
- **Savings_Shortfall**: Kondisi di mode `kombinasi` ketika alokasi `Savings_Bucket` preset lebih kecil dari `Investment_Contribution` yang diperlukan, sehingga anggaran belum mendanai tujuan investasi.
- **Budget_Plan**: Entitas persistensi yang menyimpan preset terpilih, `Base_Amount`, `Savings_Mode`, target tabungan/investasi, dan `Budget_Breakdown` hasil perhitungan.

---

## Requirements

### Requirement 1: Akses Planner Dilindungi Profil Finansial

**User Story:** Sebagai pengguna, saya ingin cakupan Planner hanya bisa diakses setelah profil finansial saya terisi, sehingga alokasi anggaran didasarkan pada kondisi keuangan saya yang sebenarnya.

#### Acceptance Criteria
1. WHEN pengguna mengakses halaman `/planner` tanpa `Financial_Profile` tersimpan, THE Profile_Gate SHALL mengarahkan pengguna ke halaman pengisian `Financial_Profile`.
2. WHEN `Financial_Profile` sudah tersimpan, THE Profile_Gate SHALL mengizinkan akses ke Budget_Planner.
3. THE Budget_Planner SHALL memakai ulang `Profile_Gate` server-side yang sama dengan cakupan Investasi tanpa menduplikasi logika guard.

### Requirement 2: Jumlah Dasar dari Profil dengan Opsi Timpa Manual

**User Story:** Sebagai pengguna, saya ingin jumlah dasar anggaran otomatis terisi dari pemasukan profil saya namun tetap bisa saya ubah, sehingga saya dapat menganggarkan skenario pemasukan yang berbeda.

#### Acceptance Criteria
1. WHEN halaman Planner dimuat DAN `Financial_Profile` terbaru tersedia, THE Budget_Planner SHALL menggunakan `income` dari `Financial_Profile` terbaru sebagai nilai default `Base_Amount`.
2. WHEN pengguna memasukkan nilai `Base_Amount` manual, THE Budget_Planner SHALL menggunakan nilai manual tersebut untuk perhitungan alih-alih `income` profil.
3. IF `Base_Amount` yang digunakan bernilai negatif, THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.

### Requirement 3: Pemilihan Metode Penganggaran Preset

**User Story:** Sebagai pengguna, saya ingin memilih metode penganggaran dari beberapa preset yang sudah teruji, sehingga saya tidak perlu menyusun kategori dari nol.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menyediakan tepat tiga `Budget_Preset`: `50/30/20`, `70/20/10`, dan `80/20`.
2. THE Budget_Preset `50/30/20` SHALL mendefinisikan kategori Kebutuhan 50%, Keinginan 30%, dan Tabungan & Investasi 20%.
3. THE Budget_Preset `70/20/10` SHALL mendefinisikan kategori Kebutuhan 70%, Tabungan 20%, dan Keinginan 10%.
4. THE Budget_Preset `80/20` SHALL mendefinisikan kategori Pengeluaran 80% dan Tabungan 20%.
5. THE setiap Budget_Preset SHALL memiliki kategori yang total persentasenya sama dengan 100%.
6. WHEN pengguna memilih sebuah `Budget_Preset`, THE Budget_Planner SHALL menggunakan kategori dan persentase preset tersebut untuk perhitungan.
7. IF pengidentifikasi preset yang diminta bukan salah satu dari tiga preset yang tersedia, THEN THE Budget_Planner SHALL menandai input tidak valid dan mengembalikan error.

### Requirement 4: Perhitungan Alokasi Anggaran (Pure & Deterministik)

**User Story:** Sebagai pengguna, saya ingin melihat jumlah Rupiah persis untuk setiap pos anggaran, sehingga saya tahu batas pengeluaran tiap kategori.

#### Acceptance Criteria
1. WHEN sebuah `Budget_Preset` dan `Base_Amount` yang valid tersedia, THE Budget_Planner SHALL menghitung `Budget_Breakdown` berisi jumlah Rupiah untuk setiap `Budget_Category`.
2. THE Budget_Planner SHALL menghitung jumlah tiap kategori sebagai `Base_Amount` dikali persentase kategori dibagi 100.
3. THE total jumlah seluruh kategori dalam `Budget_Breakdown` SHALL sama dengan `Base_Amount` dalam toleransi pembulatan kecil.
4. THE fungsi perhitungan anggaran SHALL berupa pure function di `lib/planner/` tanpa dependensi UI, API, atau database.
5. IF `Base_Amount` bukan angka berhingga yang tidak negatif, THEN THE fungsi perhitungan SHALL melempar error alih-alih mengembalikan hasil.

### Requirement 5: Mode Target Tabungan — Terpisah vs Kombinasi

**User Story:** Sebagai pengguna, saya ingin memilih apakah target tabungan saya berdiri sendiri atau terhubung dengan rencana investasi saya, sehingga anggaran saya selaras dengan tujuan investasi bila diinginkan.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menyediakan dua `Savings_Mode`: `terpisah` dan `kombinasi`.
2. WHERE `Savings_Mode` adalah `terpisah`, THE Budget_Planner SHALL menggunakan `Manual_Savings_Target` yang diisi pengguna sebagai target tabungan, independen dari cakupan Investasi.
3. WHERE `Savings_Mode` adalah `kombinasi`, THE Budget_Planner SHALL menarik `monthlyContribution` dari `Investment_Recommendation` terbaru sebagai `Investment_Contribution` dan menampilkannya sebagai pos "Investasi" di dalam `Savings_Bucket`.
4. WHERE `Savings_Mode` adalah `kombinasi`, THE Budget_Planner SHALL tetap mengizinkan pengguna menambahkan `Manual_Savings_Target` di samping `Investment_Contribution` otomatis.
5. IF `Savings_Mode` adalah `kombinasi` DAN belum ada `Investment_Recommendation` tersimpan, THEN THE Budget_Planner SHALL memberi tahu pengguna bahwa kontribusi investasi belum tersedia dan memperlakukan `Investment_Contribution` sebagai nol.

### Requirement 6: Penandaan Kekurangan Dana Investasi (Kombinasi)

**User Story:** Sebagai pengguna, saya ingin diberi tahu bila alokasi tabungan preset saya tidak cukup untuk mendanai kontribusi investasi bulanan, sehingga saya bisa menyesuaikan anggaran atau tujuan.

#### Acceptance Criteria
1. WHILE `Savings_Mode` adalah `kombinasi`, THE Budget_Planner SHALL membandingkan jumlah `Savings_Bucket` preset dengan `Investment_Contribution` yang diperlukan.
2. IF jumlah `Savings_Bucket` preset lebih kecil dari `Investment_Contribution`, THEN THE Budget_Planner SHALL menandai `Savings_Shortfall` dan menampilkan peringatan bahwa anggaran belum mendanai tujuan investasi.
3. WHILE jumlah `Savings_Bucket` preset lebih besar dari atau sama dengan `Investment_Contribution`, THE Budget_Planner SHALL menandai tidak ada `Savings_Shortfall`.
4. THE logika perbandingan `Savings_Shortfall` SHALL berupa pure function di `lib/planner/` yang dapat diuji secara independen.

### Requirement 7: Persistensi Rencana Anggaran

**User Story:** Sebagai pemilik proyek, saya ingin rencana anggaran tersimpan permanen, sehingga pengguna dapat meninjaunya kembali dan fitur lanjutan dapat mengonsumsinya.

#### Acceptance Criteria
1. WHEN pengguna menyimpan rencana anggaran, THE Budget_Planner SHALL menyimpan `Budget_Plan` berisi `presetId`, `baseAmount`, `mode`, `manualSavingsTarget` (opsional), `investmentContribution` (opsional), dan `breakdown` ke database PostgreSQL melalui Prisma.
2. WHERE `Savings_Mode` adalah `kombinasi`, THE Budget_Planner SHALL menyimpan snapshot `Investment_Contribution` pada field `investmentContribution` `Budget_Plan`.
3. WHEN pengguna membuka Planner kembali, THE Budget_Planner SHALL dapat mengambil `Budget_Plan` terbaru dari database.
4. THE Budget_Planner SHALL menggunakan Prisma Client singleton (`lib/db.ts`) yang sama untuk seluruh operasi database.
5. IF operasi database gagal, THEN THE Budget_Planner SHALL mengembalikan respons error yang ramah pengguna tanpa mengekspos detail internal.
6. THE Budget_Plan SHALL menyimpan field `userId` yang boleh bernilai null pada iterasi ini.

### Requirement 8: Tampilan Hasil Anggaran

**User Story:** Sebagai pengguna, saya ingin melihat hasil alokasi anggaran secara jelas beserta disclaimer, sehingga saya memahami rincian dan batasannya.

#### Acceptance Criteria
1. WHEN `Budget_Breakdown` tersedia, THE Budget_Planner SHALL menampilkan rincian setiap `Budget_Category` beserta persentase dan jumlah Rupiah.
2. WHEN `Budget_Breakdown` ditampilkan, THE Budget_Planner SHALL menampilkan bar proporsi yang merepresentasikan porsi tiap kategori, mengikuti pola visual `RecommendationCard`.
3. THE Budget_Planner SHALL memformat seluruh nilai uang sebagai Rupiah gaya Indonesia dengan pola `Rp ${Math.round(v).toLocaleString("id-ID")}`.
4. WHEN hasil anggaran ditampilkan, THE Budget_Planner SHALL menyertakan disclaimer edukatif bahwa hasil bersifat edukatif dan bukan nasihat keuangan tersertifikasi.
5. WHERE `Savings_Shortfall` ditandai, THE Budget_Planner SHALL menampilkan peringatan kekurangan dana investasi pada tampilan hasil.
6. WHEN aplikasi dibuka di viewport mobile, THE Budget_Planner SHALL menjaga tampilan hasil tetap terbaca.

### Requirement 9: Konsistensi Gaya Visual dan Navigasi

**User Story:** Sebagai pengguna, saya ingin Planner terasa menyatu dengan aplikasi, sehingga pengalaman tetap konsisten.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menggunakan token warna aksen Miami blue yang sudah ada (`--accent`, `--accent-2`, `--accent-soft`) dari `app/globals.css`.
2. THE dashboard (`app/page.tsx`) SHALL menampilkan tautan menuju `/planner`.
3. THE Budget_Planner SHALL memakai ulang pola komponen visual dan format Rupiah yang konsisten dengan cakupan Investasi.

### Requirement 10: Ekstensibilitas Logika Planner (Pure Function)

**User Story:** Sebagai pengembang, saya ingin logika Planner terisolasi sebagai pure function, sehingga mudah diuji dan dipakai ulang tanpa duplikasi.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menempatkan definisi preset dan fungsi perhitungan anggaran sebagai modul pure function di `lib/planner/` (`presets.ts`, `budget.ts`).
2. THE modul di `lib/planner/` SHALL dapat diimpor secara independen tanpa bergantung pada lapisan UI, API, atau database.
3. THE modul di `lib/planner/` SHALL hanya mengimpor tipe dari `@/types/planner` (mengikuti pola `lib/investment/*` yang mengimpor dari `@/types/finance`).
