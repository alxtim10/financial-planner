# Requirements Document

## Perubahan Arah (Iterasi Goal-Driven) — OTORITATIF

> **Pivot arah Planner.** Iterasi ini mengubah arah Planner secara mendasar dari **preset/persentase-driven** menjadi **goal-driven (berbasis tujuan)**. Sebelumnya pengguna memilih persentase (preset 50/30/20, 70/20/10, 80/20, atau Custom) dan target tabungan hanya efek samping. Sekarang alurnya **dibalik**: pengguna memberi **pemasukan bulanan, tabungan saat ini, nominal target, dan jangka waktu**, lalu sistem **MENGHITUNG berapa yang harus ditabung per bulan** — dan **persentase menjadi OUTPUT turunan**, bukan input.
>
> **Yang menjadi otoritatif:** **Requirement 17–21** (bagian "Model Goal-Driven" di bawah) adalah **sumber kebenaran** untuk perilaku Planner mulai iterasi ini. Model perhitungan inti: **akumulasi murni (plain accumulation) tanpa bunga/pertumbuhan**.
>
> **Yang disuperseksi (SUPERSEDED):** **Requirement 1–16** yang mendeskripsikan model **preset/persentase** (termasuk proyeksi target tabungan Arah A/B, present value/Include_Savings, dan preset Custom) **tidak lagi menjadi arah aktif Planner**. Nomor & teksnya **dipertahankan sebagai catatan historis** untuk keterlacakan, tetapi **tidak boleh diimplementasikan ulang** pada iterasi goal-driven.
>
> **Yang DIHAPUS dari alur Planner (goal-driven):**
> - **3 preset tetap** (50/30/20, 70/20/10, 80/20) dan **mode persentase Custom** — persentase kini murni OUTPUT.
> - **`PresetPicker`** dan seluruh UI pemilihan preset/persentase.
> - **Mode tabungan `terpisah`/`kombinasi`** dan penandaan `Savings_Shortfall` berbasis kontribusi investasi.
> - **Toggle `Include_Savings`** — `currentSavings` **selalu** dihitung sebagai saldo awal (starting balance), karena kini inti dari model.
> - **Cabang "Arah A" (Time_To_Goal)** — `Savings_Horizon`/`horizonYears` kini **selalu wajib** (bukan opsional).
> - **Persentase sebagai input** — dalam bentuk apa pun.
>
> **Catatan implementasi:** iterasi goal-driven **tidak memerlukan migrasi Prisma** — memakai ulang kolom `BudgetPlan` yang sudah ada (lihat Requirement 20) dengan penanda `presetId = "goal"`.

---

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
- Pengguna dapat **opsional** mengisi target nominal tabungan (`Savings_Target_Amount`) dan **opsional** jangka waktunya (`Savings_Horizon`): tanpa target → perilaku alokasi seperti biasa; target tanpa horizon → estimasi waktu tercapai (Arah A); target dengan horizon → tabungan bulanan yang diperlukan beserta penilaian cukup/kurang (Arah B). Perhitungan menyesuaikan `Savings_Mode` (terpisah tanpa bunga vs kombinasi berbasis pertumbuhan).

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
- **Savings_Target_Amount**: Nominal Rupiah yang ingin dikumpulkan pengguna melalui `Savings_Bucket` bulanan (opsional). Menjadi *pemicu* proyeksi target tabungan; bila tidak diisi, Planner berperilaku alokasi saja tanpa proyeksi.
- **Savings_Horizon**: Jangka waktu (dalam tahun) yang opsional dan menyertai `Savings_Target_Amount`. Kehadiran/ketiadaan field ini menentukan *arah* proyeksi (lihat `Time_To_Goal` vs `Required_Monthly_Saving`).
- **Monthly_Saving_Rate**: Laju tabungan bulanan yang dipakai untuk proyeksi target. Didefinisikan sebagai jumlah alokasi `Savings_Bucket` preset per bulan (hasil `savingsBucketAmount(breakdown)`), independen dari `Manual_Savings_Target`.
- **Time_To_Goal** (Arah A / output): Estimasi berapa bulan (dan tahun) yang diperlukan untuk mencapai `Savings_Target_Amount` pada `Monthly_Saving_Rate` tertentu, dihitung ketika `Savings_Target_Amount` diisi tetapi `Savings_Horizon` **tidak** diisi.
- **Required_Monthly_Saving** (Arah B / input): Nominal tabungan bulanan yang diperlukan untuk mencapai `Savings_Target_Amount` dalam `Savings_Horizon` yang diberikan, dihitung ketika `Savings_Target_Amount` **dan** `Savings_Horizon` sama-sama diisi.
- **Savings_Projection**: Hasil proyeksi target tabungan — salah satu dari `Time_To_Goal` (Arah A) atau `Required_Monthly_Saving` beserta pembandingnya terhadap `Monthly_Saving_Rate` (Arah B), termasuk status "tidak akan tercapai" saat laju tabungan efektif nol tanpa pertumbuhan.
- **Growth_Rate**: Tingkat imbal hasil tahunan (`annualReturn`, desimal) dari `Investment_Recommendation` terbaru, dipakai pada mode `kombinasi` untuk proyeksi berbasis pertumbuhan (Future Value of Annuity). Bernilai 0/tidak ada → proyeksi jatuh ke perhitungan tanpa pertumbuhan.
- **Include_Savings**: Toggle opsional (boolean) pada form anggaran yang menentukan apakah `currentSavings` dari `Financial_Profile` terbaru diperhitungkan sebagai saldo awal (`Present_Value`) dalam `Savings_Projection`. Default **mati** (`false`) sehingga perilaku proyeksi identik dengan akumulasi murni dari 0 seperti sebelumnya.
- **Present_Value**: Saldo awal tabungan yang dipakai proyeksi ketika `Include_Savings` aktif. Bernilai `currentSavings` dari `Financial_Profile` terbaru (atau 0 bila profil/nilai tidak tersedia). Ketika `Include_Savings` mati, `Present_Value` bernilai 0.
- **Already_Reached**: Status `Savings_Projection` ketika `Present_Value` sudah lebih besar dari atau sama dengan `Savings_Target_Amount`, sehingga target tercapai tanpa perlu menabung lagi (Arah A → `months` 0; Arah B → `Required_Monthly_Saving` 0).
- **Custom_Preset**: Opsi penganggaran keempat (di luar 3 preset tetap) yang memakai persentase yang ditentukan sendiri oleh pengguna untuk tiga kategori tetap **Kebutuhan**, **Keinginan**, dan **Ditabung**. Diidentifikasi dengan `presetId` bernilai `"custom"`. Berbeda dari `Budget_Preset` tetap, komposisinya dibangun saat runtime dari `Custom_Allocation` (bukan konstanta di `BUDGET_PRESETS`).
- **Custom_Allocation**: Kumpulan tiga persentase yang diisi pengguna untuk `Custom_Preset` — `{ kebutuhan, keinginan, ditabung }` — masing-masing angka berhingga tidak negatif yang totalnya harus tepat 100. Menjadi input pembentuk `Custom_Preset`.

### Glosarium Goal-Driven (OTORITATIF, Iterasi Goal-Driven)

- **Goal_Budget**: Model penganggaran berbasis tujuan yang menjadi arah aktif Planner. Diberi `Monthly_Income`, `Current_Savings`, `Target_Amount`, dan `Horizon_Years`, sistem menghitung nominal `Ditabung` per bulan (akumulasi murni tanpa bunga) beserta `Kebutuhan` dan `Keinginan`, lalu menurunkan `Derived_Percentage` tiap pos sebagai OUTPUT.
- **Monthly_Income**: Pemasukan bulanan (Rupiah) yang menjadi dasar `Goal_Budget`. Default dari `income` `Financial_Profile` terbaru; dapat ditimpa manual oleh pengguna. Wajib, angka berhingga > 0.
- **Current_Savings**: Saldo tabungan pengguna saat ini (Rupiah), diambil dari `currentSavings` `Financial_Profile` terbaru. Diperlakukan sebagai **saldo awal (starting balance)** yang **selalu** dikurangkan dari `Target_Amount` (tanpa toggle). Angka berhingga ≥ 0.
- **Target_Amount**: Nominal tabungan yang ingin dicapai pengguna (Rupiah). Wajib, angka berhingga > 0.
- **Horizon_Years**: Jangka waktu untuk mencapai `Target_Amount`, dalam **tahun** (bilangan bulat positif). **Wajib** pada model goal-driven. `Months_N = Horizon_Years × 12`.
- **Ditabung**: Nominal tabungan bulanan yang **dihitung** sistem: `max(0, Target_Amount − Current_Savings) ÷ Months_N`. Pos ini adalah `Savings_Bucket` goal-driven (`isSavings: true`).
- **Kebutuhan**: Pos pengeluaran esensial bulanan (Rupiah). Diambil dari `expense` `Financial_Profile`; bila `expense` 0/tidak valid/tidak ada, memakai **rasio fallback** `round(0.65 × (Monthly_Income − Ditabung))` (rasio atas sisa pemasukan setelah `Ditabung`).
- **Keinginan**: Pos sisa (Rupiah), didefinisikan sebagai `Monthly_Income − Ditabung − Kebutuhan`. Bisa bernilai negatif secara matematis pada kondisi tidak layak (dipakai untuk penilaian `Feasibility`).
- **Derived_Percentage**: Persentase tiap pos sebagai **OUTPUT** turunan untuk tampilan: `pos ÷ Monthly_Income × 100` (Kebutuhan%, Keinginan%, Ditabung%). **Bukan** input pengguna.
- **Already_Reached (Goal-Driven)**: Status saat `Current_Savings ≥ Target_Amount` sehingga `Ditabung = 0` — target sudah tercapai tanpa perlu menabung lagi.
- **Feasibility**: Penilaian kelayakan `Goal_Budget` dengan tiga tingkat `severity`: `"ok"` (sehat), `"tight"` (ketat — sedikit/tidak ada sisa untuk `Keinginan`), dan `"impossible"` (mustahil — `Ditabung` saja melampaui `Monthly_Income`). Menyertakan `feasible: boolean` dan saran (memperpanjang `Horizon_Years` atau menurunkan `Target_Amount`).
- **Goal_Budget_Result**: Objek hasil `computeGoalBudget` — memuat `Ditabung`, `Kebutuhan`, `Keinginan` (presisi Rupiah, pembulatan hanya di tampilan), `Derived_Percentage` tiap pos, `alreadyReached`, dan objek `feasibility`.

> **Catatan supersession glosarium:** Istilah preset/persentase — `Budget_Preset`, `Custom_Preset`, `Custom_Allocation`, `Savings_Mode`, `Savings_Shortfall`, `Manual_Savings_Target`, `Include_Savings`, `Present_Value`, `Time_To_Goal`, `Required_Monthly_Saving`, `Savings_Projection`, `Growth_Rate` — **DISUPERSEKSI** pada iterasi goal-driven dan dipertahankan hanya sebagai konteks historis (Requirement 1–16). `Base_Amount` digantikan oleh `Monthly_Income`; `Savings_Bucket` kini selalu pos **Ditabung**.

---

## Requirements

> **⚠️ SUPERSEDED — Requirement 1–16 (model preset/persentase).** Bagian berikut (Requirement 1 sampai 16) mendeskripsikan **arah lama** Planner berbasis preset/persentase (alokasi preset, mode terpisah/kombinasi + shortfall, proyeksi target tabungan Arah A/B, present value/Include_Savings, dan preset Custom). Mulai **Iterasi Goal-Driven**, bagian ini **DISUPERSEKSI** oleh **Requirement 17–21 (Model Goal-Driven)** di akhir dokumen dan **tidak lagi menjadi arah aktif**. Teks dipertahankan **hanya sebagai catatan historis/keterlacakan**; jangan mengimplementasikan ulang pada iterasi goal-driven. Requirement 1 (Profile_Gate), Requirement 8/9 (format Rupiah, disclaimer, gaya visual, tautan dashboard), dan Requirement 10 (pure function di `lib/planner/*`) tetap relevan secara prinsip dan **dinyatakan ulang** dalam Requirement 17–21.

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

### Requirement 11: Proyeksi Target Tabungan Opsional dengan Horizon Adaptif

**User Story:** Sebagai pengguna, saya ingin menambahkan target nominal tabungan opsional dan (opsional) jangka waktunya, sehingga saya tahu berapa lama target tercapai atau berapa tabungan bulanan yang diperlukan — tanpa mengubah cara Planner bekerja bila saya tidak mengisinya.

Field proyeksi bersifat **tambahan** dan **opsional** di atas alur alokasi yang sudah ada (Requirement 1–10). `Monthly_Saving_Rate` yang dipakai untuk proyeksi adalah jumlah alokasi `Savings_Bucket` preset per bulan (`savingsBucketAmount(breakdown)`), agar proyeksi tetap murni turunan dari alokasi anggaran dan terpisah dari `Manual_Savings_Target`.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menyediakan field opsional `Savings_Target_Amount` (Rupiah) dan field opsional `Savings_Horizon` (tahun) pada form anggaran.
2. IF `Savings_Target_Amount` tidak diisi, THEN THE Budget_Planner SHALL tidak menghitung `Savings_Projection` dan berperilaku seperti alokasi saja (Requirement 4 dan 8) tanpa perubahan.
3. WHERE `Savings_Target_Amount` diisi DAN `Savings_Horizon` tidak diisi, THE Budget_Planner SHALL menghitung `Time_To_Goal` (Arah A): estimasi jumlah bulan untuk mencapai `Savings_Target_Amount` pada `Monthly_Saving_Rate`.
4. WHERE `Savings_Target_Amount` diisi DAN `Savings_Horizon` diisi, THE Budget_Planner SHALL menghitung `Required_Monthly_Saving` (Arah B): nominal tabungan bulanan yang diperlukan untuk mencapai `Savings_Target_Amount` dalam `Savings_Horizon`, lalu membandingkannya dengan `Monthly_Saving_Rate` dan menandai apakah alokasi preset saat ini cukup atau kurang beserta selisihnya.
5. THE Budget_Planner SHALL menggunakan `Monthly_Saving_Rate` yang sama dengan jumlah alokasi `Savings_Bucket` preset (`savingsBucketAmount`) sebagai laju tabungan bulanan untuk seluruh proyeksi.
6. THE Budget_Planner SHALL menempatkan logika proyeksi sebagai pure function di `lib/planner/savingsProjection.ts` yang hanya mengimpor tipe dari `@/types/planner`, tanpa dependensi UI, API, atau database.
7. IF `Savings_Target_Amount` diisi tetapi bukan angka berhingga yang lebih besar dari 0, THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.
8. IF `Savings_Horizon` diisi tetapi bukan bilangan bulat positif berhingga, THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.

### Requirement 12: Metode Perhitungan Proyeksi Berdasarkan Savings_Mode

**User Story:** Sebagai pengguna, saya ingin proyeksi target tabungan menyesuaikan mode saya (terpisah vs kombinasi), sehingga estimasinya realistis terhadap apakah dana tumbuh berbunga atau tidak.

#### Acceptance Criteria
1. WHERE `Savings_Mode` adalah `terpisah`, THE Budget_Planner SHALL menghitung proyeksi tanpa pertumbuhan (tanpa bunga): Arah A `months = ceil(Savings_Target_Amount ÷ Monthly_Saving_Rate)`; Arah B `Required_Monthly_Saving = Savings_Target_Amount ÷ (Savings_Horizon × 12)`.
2. WHERE `Savings_Mode` adalah `terpisah`, THE Budget_Planner SHALL memperlakukan proyeksi sebagai akumulasi murni mulai dari 0 (tidak mengurangi `currentSavings` profil), agar proyeksi tetap murni turunan alokasi anggaran.
3. WHERE `Savings_Mode` adalah `kombinasi`, THE Budget_Planner SHALL menghitung proyeksi berbasis pertumbuhan memakai `Growth_Rate` (`annualReturn`) dari `Investment_Recommendation` terbaru dengan rumus Future Value of Annuity yang sama dengan `lib/investment/projection.ts`: Arah B menyelesaikan PMT, Arah A menyelesaikan jumlah periode `n`.
4. IF `Savings_Mode` adalah `kombinasi` DAN `Growth_Rate` bernilai 0 atau tidak tersedia, THEN THE Budget_Planner SHALL jatuh ke perhitungan tanpa pertumbuhan yang sama dengan mode `terpisah`.
5. THE Budget_Planner SHALL menampilkan hasil proyeksi apa adanya termasuk nilai yang sangat besar (mis. ratusan tahun), tanpa membatasi atau memberi peringatan pada nilai berhingga yang besar.
6. IF `Monthly_Saving_Rate` efektif bernilai 0 (dan tanpa pertumbuhan) sehingga target secara matematis tidak akan tercapai, THEN THE Budget_Planner SHALL menandai status "tidak akan tercapai dengan alokasi saat ini" alih-alih menampilkan nilai tak hingga.
7. WHEN pengguna menyimpan rencana anggaran dengan `Savings_Target_Amount`, THE Budget_Planner SHALL mempersistensi `Savings_Target_Amount` dan (bila ada) `Savings_Horizon` pada `Budget_Plan`.
8. WHEN `Savings_Projection` tersedia, THE Budget_Planner SHALL menampilkan hasilnya pada tampilan hasil: Arah A sebagai "tercapai dalam ~X bulan (~Y tahun)"; Arah B sebagai nominal tabungan bulanan yang diperlukan beserta status alokasi preset cukup/kurang; dan status "tidak akan tercapai" pada kasus laju tabungan nol.
9. THE Budget_Planner SHALL memformat seluruh nilai uang proyeksi sebagai Rupiah gaya Indonesia dengan pola `Rp ${Math.round(v).toLocaleString("id-ID")}` dan menjaga gaya visual Miami blue yang konsisten.

### Requirement 13: Opsi Sertakan Tabungan Saat Ini pada Proyeksi (Present Value)

**User Story:** Sebagai pengguna, saya ingin dapat memperhitungkan tabungan saya saat ini sebagai saldo awal proyeksi target tabungan, sehingga estimasi waktu tercapai atau tabungan bulanan yang diperlukan menjadi lebih realistis — tanpa mengubah perilaku default bila saya tidak mengaktifkannya.

Kapabilitas ini bersifat **tambahan** dan **opsional** di atas proyeksi target tabungan (Requirement 11–12). `Include_Savings` adalah toggle boolean dengan default **mati**. Ketika mati, `Present_Value` bernilai 0 dan seluruh perhitungan proyeksi identik dengan perilaku akumulasi murni dari 0 yang sudah ada. Ketika hidup, `currentSavings` dari `Financial_Profile` terbaru diperlakukan sebagai `Present_Value` (saldo awal) dalam rumus Future Value of Annuity yang sama dengan `lib/investment/projection.ts` (yang sudah memakai `presentValue`).

#### Acceptance Criteria
1. THE Budget_Planner SHALL menyediakan toggle opsional `Include_Savings` (boolean) yang menentukan apakah `Present_Value` diperhitungkan dalam `Savings_Projection`, dengan nilai default `false` (mati).
2. IF `Include_Savings` bernilai `false` atau tidak diberikan, THEN THE Budget_Planner SHALL menggunakan `Present_Value` bernilai 0 sehingga hasil proyeksi identik dengan perilaku akumulasi murni dari 0 (Requirement 11–12) tanpa perubahan.
3. WHERE `Include_Savings` bernilai `true`, THE Budget_Planner SHALL menggunakan `currentSavings` dari `Financial_Profile` terbaru sebagai `Present_Value` (atau 0 bila profil atau nilainya tidak tersedia).
4. WHERE `Include_Savings` bernilai `true` DAN `Savings_Horizon` tidak diisi (Arah A), THE Budget_Planner SHALL menghitung jumlah bulan `n` dari akumulasi dengan saldo awal `Present_Value`: tanpa pertumbuhan `months = ceil(max(0, Savings_Target_Amount − Present_Value) ÷ Monthly_Saving_Rate)`; dengan pertumbuhan `n = ln((Savings_Target_Amount × i + Monthly_Saving_Rate) ÷ (Present_Value × i + Monthly_Saving_Rate)) ÷ ln(1 + i)` dengan `i` tingkat bunga bulanan.
5. WHERE `Include_Savings` bernilai `true` DAN `Savings_Horizon` diisi (Arah B), THE Budget_Planner SHALL menghitung `Required_Monthly_Saving` dengan saldo awal `Present_Value`: tanpa pertumbuhan `(Savings_Target_Amount − Present_Value) ÷ (Savings_Horizon × 12)`; dengan pertumbuhan `(Savings_Target_Amount − Present_Value × (1 + i)^n) × i ÷ ((1 + i)^n − 1)`, lalu di-clamp minimum 0.
6. IF `Present_Value` lebih besar dari atau sama dengan `Savings_Target_Amount`, THEN THE Budget_Planner SHALL menandai status `Already_Reached` (target sudah tercapai) dengan `reachable` benar, `months` bernilai 0 (Arah A), dan `Required_Monthly_Saving` bernilai 0 (Arah B).
7. IF `Monthly_Saving_Rate` efektif bernilai 0 (dan tanpa pertumbuhan) DAN `Present_Value` lebih kecil dari `Savings_Target_Amount`, THEN THE Budget_Planner SHALL tetap menandai status "tidak akan tercapai dengan alokasi saat ini" (`reachable` salah) seperti perilaku sebelumnya.
8. THE Budget_Planner SHALL menempatkan logika present value sebagai parameter opsional `presentValue` (default 0) pada pure function `monthsToReachTarget` dan `requiredMonthlySaving` di `lib/planner/savingsProjection.ts`, tanpa dependensi UI, API, atau database, dan tetap hanya mengimpor tipe dari `@/types/planner`.
9. IF `presentValue` diberikan tetapi bukan angka berhingga yang tidak negatif, THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.

### Requirement 14: Persistensi, Kontrak API, dan Tampilan Include_Savings

**User Story:** Sebagai pengguna, saya ingin pilihan menyertakan tabungan saat ini tercatat dan terlihat jelas pada hasil, sehingga saya paham bahwa saldo awal ikut diperhitungkan dan pilihan saya tersimpan.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menerima field opsional boolean `includeSavings` pada `POST /api/budget` dengan default `false` bila tidak diberikan.
2. WHERE `includeSavings` bernilai `true`, THE Budget_Planner SHALL mengambil `Financial_Profile` terbaru melalui `getLatestProfile()` dan menggunakan `currentSavings` (atau 0 bila tidak ada) sebagai `Present_Value` yang diteruskan ke fungsi proyeksi; bila `false`, `Present_Value` bernilai 0.
3. WHEN pengguna menyimpan rencana anggaran, THE Budget_Planner SHALL mempersistensi pilihan `includeSavings` pada field nullable `includeSavings` di `Budget_Plan` melalui migrasi Prisma aditif tanpa reset database.
4. WHEN `Savings_Projection` dikembalikan, THE Budget_Planner SHALL menyertakan `includeSavings` (boolean), `presentValue` (angka), dan `alreadyReached` (boolean) di dalam objek `Savings_Projection` pada respons.
5. THE `GET /api/budget` SHALL mengembalikan `currentSavings` (angka atau null) dari `Financial_Profile` terbaru bersama `defaultBaseAmount`, sehingga form dapat menampilkan nominal tabungan saat ini dan mengaktifkan toggle.
6. WHERE sebuah `Savings_Target_Amount` telah diisi DAN `Financial_Profile` memiliki `currentSavings` lebih besar dari 0, THE Budget_Planner SHALL menampilkan toggle `Include_Savings` beserta nominal `currentSavings` pada form anggaran.
7. WHERE `includeSavings` aktif pada hasil, THE Budget_Planner SHALL menampilkan catatan bahwa tabungan saat ini dihitung sebagai saldo awal, dan menampilkan status "sudah tercapai" ketika `Already_Reached`; selain itu tampilan Arah A/B SHALL mencerminkan sisa target yang berkurang.
### Requirement 15: Preset Penganggaran Kustom (Custom)

**User Story:** Sebagai pengguna, saya ingin memilih opsi penganggaran "Custom" dan menentukan sendiri persentase untuk tiga kategori tetap (Kebutuhan, Keinginan, Ditabung), sehingga saya dapat menyesuaikan alokasi anggaran dengan kebutuhan pribadi saya di luar tiga preset baku.

Kapabilitas ini bersifat **tambahan** di atas pemilihan preset tetap (Requirement 3). `Custom_Preset` menambah opsi keempat berdampingan dengan `50/30/20`, `70/20/10`, dan `80/20`. Kategorinya **tetap** (tiga: Kebutuhan, Keinginan, Ditabung); yang dikustomisasi hanya persentasenya (`Custom_Allocation`). Kategori **Ditabung** berperan sebagai `Savings_Bucket` sehingga seluruh alur tabungan (shortfall, proyeksi target tabungan, present value) bekerja identik dengan preset tetap.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menyediakan opsi keempat `Custom_Preset` dengan `presetId` bernilai `"custom"` di samping tiga preset tetap `50/30/20`, `70/20/10`, dan `80/20`.
2. THE Custom_Preset SHALL mendefinisikan tepat tiga `Budget_Category` tetap dengan nama Kebutuhan, Keinginan, dan Ditabung.
3. THE Custom_Preset SHALL menandai kategori Ditabung sebagai `Savings_Bucket` (`isSavings` benar) dan kategori Kebutuhan serta Keinginan sebagai bukan `Savings_Bucket` (`isSavings` salah).
4. WHEN pengguna memilih `Custom_Preset` dan memberikan `Custom_Allocation`, THE Budget_Planner SHALL membangun sebuah `Budget_Preset` beridentitas `"custom"` berlabel "Custom" menggunakan persentase yang diberikan untuk ketiga kategori.
5. THE Budget_Planner SHALL menghitung `Budget_Breakdown` untuk `Custom_Preset` dengan metode yang sama dengan preset tetap: jumlah tiap kategori sama dengan `Base_Amount` dikali persentase kategori dibagi 100, dan total seluruh kategori sama dengan `Base_Amount` dalam toleransi pembulatan kecil.
6. WHERE `Custom_Preset` dipilih, THE Budget_Planner SHALL menggunakan jumlah alokasi kategori Ditabung sebagai `Monthly_Saving_Rate` untuk proyeksi target tabungan, identik dengan `Savings_Bucket` preset tetap.
7. IF salah satu persentase pada `Custom_Allocation` bukan angka berhingga yang tidak negatif, THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.
8. IF jumlah ketiga persentase pada `Custom_Allocation` tidak sama dengan 100 (dalam toleransi epsilon kecil, mis. `abs(sum − 100) < 1e-9`), THEN THE Budget_Planner SHALL menolak perhitungan dan mengembalikan pesan validasi.
9. THE fungsi pembentuk `Custom_Preset` dan perhitungan `Budget_Breakdown` dari sebuah `Budget_Preset` SHALL berupa pure function di `lib/planner/` tanpa dependensi UI, API, atau database, dan hanya mengimpor tipe dari `@/types/planner`.

### Requirement 16: Kontrak API, Persistensi, dan Tampilan Custom Preset

**User Story:** Sebagai pengguna, saya ingin memilih Custom pada antarmuka, mengisi tiga persentase dengan umpan balik total langsung, lalu melihat dan menyimpan hasilnya seperti preset lain, sehingga pengalaman kustomisasi terasa mulus dan konsisten.

Kapabilitas ini melengkapi Requirement 15 dengan lapisan API, persistensi, dan UI. Komposisi kustom **tidak** dipersistensi secara rinci: `presetId` disimpan sebagai penanda `"custom"` dan komposisi terekam secara implisit di dalam `breakdown` Json yang memang sudah disimpan. **Tidak ada** kolom database baru dan **tidak ada** migrasi untuk Delta ini.

#### Acceptance Criteria
1. THE Budget_Planner SHALL menerima field opsional `customAllocation` (`{ kebutuhan, keinginan, ditabung }`) pada `POST /api/budget`.
2. WHERE `presetId` bernilai `"custom"`, THE Budget_Planner SHALL mewajibkan `customAllocation` hadir; IF `customAllocation` tidak diberikan, THEN THE Budget_Planner SHALL menolak permintaan dengan HTTP 400 dan pesan validasi.
3. WHERE `presetId` bernilai `"custom"`, THE Budget_Planner SHALL memvalidasi setiap persentase `customAllocation` sebagai angka berhingga tidak negatif dan jumlah ketiganya sama dengan 100 (toleransi epsilon), dan IF validasi gagal, THEN mengembalikan HTTP 400 dengan pesan validasi.
4. WHERE `presetId` bernilai `"custom"` dan `customAllocation` valid, THE Budget_Planner SHALL membangun `Custom_Preset` lalu menghitung `Budget_Breakdown` darinya, kemudian melanjutkan alur shortfall dan proyeksi target tabungan seperti preset tetap.
5. WHERE `presetId` adalah salah satu preset tetap, THE Budget_Planner SHALL mempertahankan perilaku yang sudah ada tanpa perubahan dan mengabaikan `customAllocation` bila terkirim.
6. THE validasi `presetId` pada `POST /api/budget` SHALL mengizinkan nilai `"custom"` selain tiga preset tetap.
7. WHEN pengguna menyimpan rencana anggaran `Custom_Preset`, THE Budget_Planner SHALL mempersistensi `presetId` bernilai `"custom"` sebagai penanda dan `breakdown` Json hasil perhitungan pada `Budget_Plan`, tanpa menambah kolom database dan tanpa migrasi.
8. THE Budget_Planner SHALL menampilkan kartu keempat "Custom" pada pemilih preset; WHEN kartu Custom dipilih, THE Budget_Planner SHALL menampilkan tiga input persentase (Kebutuhan, Keinginan, Ditabung) beserta indikator total berjalan.
9. WHILE jumlah tiga input persentase Custom tidak sama dengan 100, THE Budget_Planner SHALL menandai kondisi tersebut pada form dan mencegah pengiriman perhitungan (validasi sisi klien) hingga totalnya tepat 100.
10. WHEN `Budget_Breakdown` untuk `Custom_Preset` tersedia, THE Budget_Planner SHALL menampilkan rincian per pos dengan label "Custom" mengikuti pola tampilan hasil yang sama dengan preset tetap.

---

## Requirements — Model Goal-Driven (OTORITATIF, Iterasi Goal-Driven)

> Requirement 17–21 adalah **sumber kebenaran** untuk perilaku Planner mulai iterasi ini dan **menggantikan** Requirement 1–16. Model perhitungan inti: **akumulasi murni (plain accumulation) tanpa bunga/pertumbuhan**. Pembulatan Rupiah hanya di lapisan tampilan.

### Requirement 17: Input Goal-Driven Wajib

**User Story:** Sebagai pengguna, saya ingin memberi pemasukan bulanan, tabungan saat ini, nominal target, dan jangka waktu, sehingga sistem dapat menghitung berapa yang harus saya tabung tiap bulan untuk mencapai target itu.

#### Acceptance Criteria
1. THE Goal_Budget SHALL menerima empat input: `Monthly_Income` (Rupiah), `Current_Savings` (Rupiah), `Target_Amount` (Rupiah), dan `Horizon_Years` (bilangan bulat tahun), yang seluruhnya wajib pada model goal-driven.
2. WHEN halaman Planner dimuat DAN `Financial_Profile` terbaru tersedia, THE Goal_Budget SHALL menggunakan `income` dari `Financial_Profile` terbaru sebagai nilai default `Monthly_Income`.
3. WHEN pengguna memasukkan nilai `Monthly_Income` manual, THE Goal_Budget SHALL menggunakan nilai manual tersebut untuk perhitungan alih-alih `income` profil.
4. THE Goal_Budget SHALL mengambil `Current_Savings` dari `currentSavings` `Financial_Profile` terbaru (atau 0 bila tidak tersedia) dan memperlakukannya sebagai saldo awal secara tetap, tanpa toggle apa pun.
5. THE Goal_Budget SHALL mengambil `Kebutuhan` dasar dari `expense` `Financial_Profile` terbaru sebagai pengeluaran esensial bulanan pengguna.
6. IF `Monthly_Income` bukan angka berhingga yang lebih besar dari 0, THEN THE Goal_Budget SHALL menolak perhitungan dan mengembalikan pesan validasi.
7. IF `Target_Amount` bukan angka berhingga yang lebih besar dari 0, THEN THE Goal_Budget SHALL menolak perhitungan dan mengembalikan pesan validasi.
8. IF `Horizon_Years` bukan bilangan bulat positif berhingga, THEN THE Goal_Budget SHALL menolak perhitungan dan mengembalikan pesan validasi.
9. IF `Current_Savings` bukan angka berhingga yang tidak negatif, THEN THE Goal_Budget SHALL menolak perhitungan dan mengembalikan pesan validasi.
10. IF `monthlyExpense` (input `Kebutuhan` dasar) bukan angka berhingga yang tidak negatif, THEN THE Goal_Budget SHALL menolak perhitungan dan mengembalikan pesan validasi.

### Requirement 18: Perhitungan Ditabung dan Pos (Akumulasi Murni)

**User Story:** Sebagai pengguna, saya ingin sistem menghitung nominal tabungan bulanan, kebutuhan, dan keinginan secara pasti dari input saya, sehingga saya tahu berapa Rupiah tiap pos tanpa harus menebak persentase.

#### Acceptance Criteria
1. THE Goal_Budget SHALL menghitung `Months_N` sebagai `Horizon_Years × 12`.
2. THE Goal_Budget SHALL menghitung `Ditabung` sebagai `max(0, (Target_Amount − Current_Savings)) ÷ Months_N` (akumulasi murni tanpa bunga atau pertumbuhan).
3. IF `Current_Savings` lebih besar dari atau sama dengan `Target_Amount`, THEN THE Goal_Budget SHALL menetapkan `Ditabung` bernilai 0 dan menandai status `Already_Reached` bernilai benar.
4. WHERE `expense` `Financial_Profile` bernilai angka berhingga lebih besar dari 0, THE Goal_Budget SHALL menggunakan nilai `expense` tersebut sebagai `Kebutuhan`.
5. IF `expense` `Financial_Profile` bernilai 0, tidak valid, atau tidak tersedia, THEN THE Goal_Budget SHALL menghitung `Kebutuhan` sebagai `round(0.65 × (Monthly_Income − Ditabung))` (rasio fallback atas sisa pemasukan setelah `Ditabung`).
6. THE Goal_Budget SHALL menghitung `Keinginan` sebagai `Monthly_Income − Ditabung − Kebutuhan`.
7. THE Goal_Budget SHALL mempertahankan nilai `Ditabung`, `Kebutuhan`, dan `Keinginan` secara presisi (tanpa pembulatan) di dalam hasil perhitungan; pembulatan ke Rupiah dilakukan hanya di lapisan tampilan.
8. THE fungsi perhitungan goal-driven SHALL berupa pure function di `lib/planner/` (mis. `goalBudget.ts`) tanpa dependensi UI, API, atau database, dan hanya mengimpor tipe dari `@/types/planner`.

### Requirement 19: Persentase Turunan sebagai Output

**User Story:** Sebagai pengguna, saya ingin melihat persentase tiap pos sebagai hasil dari rencana saya, sehingga saya memahami proporsi anggaran tanpa harus menentukannya sendiri.

#### Acceptance Criteria
1. THE Goal_Budget SHALL menurunkan `Derived_Percentage` tiap pos sebagai `pos ÷ Monthly_Income × 100` untuk `Kebutuhan`, `Keinginan`, dan `Ditabung`.
2. THE Goal_Budget SHALL memperlakukan `Derived_Percentage` sebagai OUTPUT tampilan dan SHALL NOT menerima persentase apa pun sebagai input pengguna.
3. WHEN hasil `Goal_Budget` layak (`feasibility.severity` bernilai `"ok"`), THE Goal_Budget SHALL memastikan jumlah nominal ketiga pos sama dengan `Monthly_Income` dalam toleransi pembulatan kecil, dan jumlah ketiga `Derived_Percentage` sama dengan 100 dalam toleransi pembulatan kecil.
4. THE Goal_Budget SHALL menampilkan ketiga pos beserta nominal Rupiah dan `Derived_Percentage` masing-masing pada tampilan hasil, dengan sebuah bar proporsi.

### Requirement 20: Penilaian Kelayakan (Feasibility)

**User Story:** Sebagai pengguna, saya ingin diberi tahu bila target dan jangka waktu saya tidak realistis terhadap pemasukan saya, sehingga saya dapat menyesuaikan rencana.

#### Acceptance Criteria
1. IF `Ditabung + Kebutuhan` lebih besar dari `Monthly_Income`, THEN THE Goal_Budget SHALL menandai target tidak layak (`feasible` salah) dan menyertakan saran untuk memperpanjang `Horizon_Years` atau menurunkan `Target_Amount`.
2. IF `Ditabung` saja lebih besar dari `Monthly_Income`, THEN THE Goal_Budget SHALL menetapkan `feasibility.severity` bernilai `"impossible"` sebagai peringatan terkuat.
3. WHERE `Ditabung` tidak melampaui `Monthly_Income` TETAPI `Keinginan` lebih kecil dari ambang kecil (mis. lebih kecil dari 5% dari `Monthly_Income`, termasuk nilai negatif), THE Goal_Budget SHALL menetapkan `feasibility.severity` bernilai `"tight"` dan memperingatkan bahwa sedikit atau tidak ada sisa untuk `Keinginan` beserta saran penyesuaian.
4. WHERE `Ditabung + Kebutuhan` tidak melampaui `Monthly_Income` DAN `Keinginan` tidak lebih kecil dari ambang kecil, THE Goal_Budget SHALL menetapkan `feasibility.severity` bernilai `"ok"` (`feasible` benar) dan menampilkan ketiga pos tanpa peringatan.
5. THE Goal_Budget SHALL menyertakan objek `feasibility` (`{ feasible, severity, reason }`) di dalam `Goal_Budget_Result` sehingga tampilan hasil dapat merender peringatan dan saran yang sesuai.
6. THE tampilan hasil SHALL memformat seluruh nilai uang sebagai Rupiah gaya Indonesia dengan pola `Rp ${Math.round(v).toLocaleString("id-ID")}`, menyertakan disclaimer edukatif, menggunakan token warna Miami blue (`--accent`, `--accent-2`, `--accent-soft`), dan tetap terbaca pada viewport mobile.

### Requirement 21: Kontrak API dan Persistensi Goal-Driven (Reuse Kolom)

**User Story:** Sebagai pengguna, saya ingin rencana goal-driven saya dihitung di server dan tersimpan, sehingga saya dapat meninjau kembali dan sistem tetap konsisten dengan profil saya.

#### Acceptance Criteria
1. THE Planner SHALL tetap dilindungi `Profile_Gate` server-side yang sama; WHEN pengguna mengakses `/planner` tanpa `Financial_Profile`, THE Profile_Gate SHALL mengarahkan ke halaman pengisian profil.
2. THE `GET /api/budget` SHALL mengembalikan `defaultMonthlyIncome` (dari `income` profil terbaru atau null), `currentSavings` (dari profil atau null), dan `monthlyExpense` (dari `expense` profil atau null), sehingga form dapat menampilkan pemasukan, tabungan saat ini, dan pengeluaran esensial.
3. THE `POST /api/budget` SHALL menerima body `{ monthlyIncome, targetAmount, horizonYears, userId? }`, sementara `Current_Savings` dan `monthlyExpense` diambil dari `Financial_Profile` terbaru di sisi server; `monthlyIncome` dapat ditimpa dari body dengan default `income` profil.
4. IF `monthlyIncome` bukan angka berhingga > 0, ATAU `targetAmount` bukan angka berhingga > 0, ATAU `horizonYears` bukan bilangan bulat positif, THEN THE `POST /api/budget` SHALL mengembalikan HTTP 400 dengan pesan validasi ramah Bahasa Indonesia.
5. WHEN input valid, THE `POST /api/budget` SHALL menghitung hasil melalui `computeGoalBudget` (mengambil `expense` dan `currentSavings` dari profil) dan mengembalikan `Goal_Budget_Result` (tiga pos + `Derived_Percentage` + `feasibility` + `alreadyReached`) dengan HTTP 200.
6. WHEN menyimpan rencana, THE `POST /api/budget` SHALL mempersistensi ke `BudgetPlan` dengan memakai ulang kolom yang sudah ada: `baseAmount = monthlyIncome`, `savingsTargetAmount = targetAmount`, `savingsHorizonYears = horizonYears`, `breakdown = ketiga baris pos hasil perhitungan (Json)`, dan `presetId = "goal"` sebagai penanda, tanpa migrasi Prisma.
7. THE `POST /api/budget` SHALL mengizinkan kolom `mode`, `includeSavings`, dan `investmentContribution` bernilai null/diomit pada penyimpanan rencana goal-driven.
8. THE API route SHALL mempertahankan `runtime = "nodejs"`, penanganan error database dengan HTTP 500 berpesan ramah tanpa mengekspos detail internal, dan penggunaan Prisma Client singleton (`lib/db.ts`).
