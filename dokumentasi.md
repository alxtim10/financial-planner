# Dokumentasi Financial Planner

> **Dokumen otoritatif arah produk.** File ini adalah sumber kebenaran utama untuk arah produk Financial Planner saat ini. Dokumen lama (`PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md`) mendeskripsikan **fitur chatbot pelengkap** dari fase PoC dan tetap valid untuk bagian tersebut, tetapi tidak lagi merepresentasikan arah keseluruhan produk.

---

## 1. Ringkasan Produk

**Financial Planner** adalah aplikasi web (Next.js App Router) untuk perencanaan keuangan personal yang terstruktur. Arah produk telah bergeser:

- **Dulu (PoC):** aplikasi = chatbot konsultasi keuangan berbasis Gemini (halaman penuh).
- **Sekarang:** aplikasi utama = **perencana keuangan terstruktur**. Chatbot menjadi **fitur pelengkap (complementary)** yang dikemas sebagai panel drawer geser dari kanan, tersedia di semua halaman.

**Fokus MVP: cakupan Investasi (Investment scope) saja.** Alur berpandu membawa pengguna dari kondisi keuangan mereka menuju rekomendasi alokasi investasi yang konkret dan proyeksi kontribusi bulanan.

### Alur inti MVP
1. **Profil Finansial** (gate wajib): pengguna mengisi pemasukan bulanan, pengeluaran bulanan, dan tabungan saat ini. Tanpa profil ini, cakupan Investasi terkunci.
2. **Tujuan (Goal):** nominal target + jangka waktu **dalam bulan** (mis. Rp 100.000.000 dalam 60 bulan). Horizon diturunkan dari jangka waktu.
3. **Profil Risiko:** survei singkat → skor → klasifikasi `Konservatif` / `Moderat` / `Agresif`.
4. **Rekomendasi:** sistem menghitung alokasi berbasis aturan (matriks Horizon × Profil Risiko) + kontribusi bulanan yang diperlukan (Future Value of Annuity).

Rekomendasi angka bersifat **rule-based dan deterministik** — bukan hasil LLM. Chatbot AI hanya untuk konsultasi naratif.

---

## 2. Arsitektur

```mermaid
flowchart TD
    subgraph Client
        Dash[app/page.tsx - Dashboard]
        Prof[app/profile - Financial Profile]
        Inv[app/investment - Goal > Survei > Rekomendasi]
        Drawer[ChatDrawer - di layout, semua halaman]
    end

    subgraph API
        AProf[/api/profile/]
        AGoal[/api/goal/]
        ARec[/api/recommendation/]
        AChat[/api/chat - TIDAK BERUBAH/]
    end

    subgraph Logic[lib/investment - pure functions]
        Alloc[allocation.ts]
        Proj[projection.ts]
        Risk[riskScoring.ts]
    end

    Prof --> AProf --> DB[(PostgreSQL / Prisma)]
    Inv --> AGoal --> DB
    Inv --> ARec
    ARec --> Risk
    ARec --> Alloc
    ARec --> Proj
    ARec --> DB
    Drawer --> AChat --> Gemini[Gemini API - streaming]
    Gate{{Profile Gate}} -.blokir tanpa profil.-> Inv
```

### Stack teknologi (dipertahankan)
- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4.
- **AI (chatbot):** `@google/genai` (streaming, runtime Node.js).
- **UI utilitas:** `lucide-react`, `react-markdown`, `remark-gfm`.

### Tambahan untuk arah baru
- **Database:** Supabase (PostgreSQL ter-host).
- **ORM:** Prisma (`prisma`, `@prisma/client`), singleton client di `lib/db.ts`.
- **Test runner:** Vitest (untuk logika murni `lib/investment/*`, TDD + property-based testing).

### Asumsi Database
Database di-host di **Supabase**. Prisma memakai dua koneksi (pola standar Supabase):
```
# Pooled (PgBouncer, port 6543) — runtime aplikasi
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
# Langsung (port 5432) — migrasi Prisma
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```
- Datasource Prisma memakai `url = env("DATABASE_URL")` (pooled) + `directUrl = env("DIRECT_URL")` (langsung untuk migrasi).
- String koneksi diambil dari Supabase Dashboard → Project Settings → Database → Connection string; ganti `[PROJECT-REF]`, `[PASSWORD]`, `[REGION]`.
- Skema & tabel dibuat lewat Prisma `migrate deploy` (produksi) / `migrate dev` (pengembangan) — bukan `createdb` lokal lagi.
- Bila koneksi gagal karena kredensial/izin, hentikan dan konfirmasi ke pemilik proyek — jangan memaksa.

---

## 3. Model Data

Empat model Prisma. Semua menyertakan `userId` **nullable** sebagai placeholder autentikasi masa depan (MVP tidak memakai auth).

| Model | Field inti | Peran |
|---|---|---|
| `FinancialProfile` | `income`, `expense`, `currentSavings` | Sumber kebenaran kondisi keuangan; gate wajib. |
| `Goal` | `targetAmount`, `horizonMonths` | Target + jangka waktu (bulan); sumber Horizon. |
| `RiskAssessment` | `answers`, `score`, `profile` | Hasil survei risiko + klasifikasi. |
| `InvestmentRecommendation` | `riskProfile`, `composition` (Json), `annualReturn`, `monthlyContribution` | Rekomendasi akhir yang dipersistensi. |

`FinancialProfile` adalah model terpusat: fitur roadmap (Planner, integrasi chatbot) akan membacanya sebagai konteks pengguna.

---

## 4. Cakupan Investasi (MVP) — Detail

### 4.1 Matriks Alokasi (inti mesin aturan)

| Horizon | Profil Risiko | Komposisi | Est. Return Tahunan |
|---|---|---|---|
| < 2 Tahun | Semua | 100% RDPU | 4,75% |
| 2–5 Tahun | Konservatif | 70% RDPU + 30% SBN/Deposito | 5,5% |
| 2–5 Tahun | Moderat | 50% RDPU + 50% Emas/SBN Ritel | 6,5% |
| 2–5 Tahun | Agresif | 30% RDPU + 40% SBN/RDPT + 30% Emas | 7,5% |
| > 5 Tahun | Konservatif | 50% SBN/RDPT + 30% Emas + 20% Saham | 7,0% |
| > 5 Tahun | Moderat | 40% Saham/Indeks + 40% SBN + 20% Emas | 9,5% |
| > 5 Tahun | Agresif | 70% Saham/Indeks + 20% SBN + 10% Emas | 11,0% |

**Aturan bucket horizon** (jangka waktu dinyatakan dalam **bulan**; ambang setara aturan tahun × 12):
- `horizonMonths < 24` → bucket `<2` (**mengabaikan** profil risiko).
- `24 ≤ horizonMonths ≤ 60` → bucket `2-5`.
- `horizonMonths > 60` → bucket `>5`.

Implementasi: `lib/investment/allocation.ts` → `getAllocation(horizonMonths, riskProfile)`. Total persentase komposisi selalu 100%. Input tidak valid (profil di luar himpunan atau horizon non-positif) melempar error.

### 4.2 Kontribusi Bulanan (Future Value of Annuity)

```
PMT = (FV − PV·(1+i)^n) · i / ((1+i)^n − 1)
```
- `FV` = nominal target Goal.
- `PV` = tabungan saat ini (dari Financial Profile).
- `i` = estimasi return tahunan / 12 (bunga bulanan).
- `n` = horizon dalam bulan (`= horizonMonths`).
- **Fallback:** saat `i = 0`, gunakan linear `(FV − PV) / n`.
- Hasil dibatasi minimum `0` (bila tabungan sudah cukup).

Implementasi: `lib/investment/projection.ts` → `calculateMonthlyContribution(input)`.

**Contoh:** Target FV = Rp 100.000.000, tabungan PV = Rp 10.000.000, horizon 60 bulan, profil Moderat 2–5 tahun (return 6,5%).
- `i = 0,065 / 12 ≈ 0,0054167`
- `n = 60` (bulan)
- `(1+i)^n ≈ 1,3829`
- `PV·(1+i)^n ≈ 10.000.000 × 1,3829 ≈ 13.829.000`
- Pembilang: `(100.000.000 − 13.829.000) × 0,0054167 ≈ 466.760`
- Penyebut: `1,3829 − 1 = 0,3829`
- `PMT ≈ 466.760 / 0,3829 ≈ Rp 1.219.000 per bulan` (perkiraan; angka pasti diverifikasi oleh test).

Sebagai perbandingan, tanpa pertumbuhan (`i = 0`): `(100.000.000 − 10.000.000) / 60 = Rp 1.500.000 per bulan`. Pertumbuhan investasi menurunkan setoran bulanan yang diperlukan.

### 4.3 Chatbot Pelengkap (Drawer)

Chatbot Gemini yang ada tetap sama secara logika (`POST /api/chat`, `lib/prompt.ts`, `types/chat.ts`, streaming, sentinel `[[STREAM_ERROR]]`). Perubahannya hanya **pengemasan UI**: dari halaman penuh menjadi panel drawer geser dari kanan (`components/ChatDrawer.tsx`), dipicu ikon di sudut kanan atas, di-mount di `app/layout.tsx` sehingga tersedia di semua halaman. Detail lengkap fitur chatbot ada di `DESIGN.md` dan `REQUIREMENTS.md`.

---

## 5. Roadmap & Cakupan Berikutnya

Bagian ini adalah arah setelah MVP. Fondasinya sudah disiapkan agar mudah dibangun tanpa duplikasi.

### 5.1 Planner — Goal-Driven Budget Planner (arah aktif; model preset/persentase disuperseksi)
Cakupan **Planner** memiliki spesifikasi formal di `.kiro/specs/budget-planner/` (requirements, design, tasks). **Arah aktif saat ini: model _goal-driven_ (berbasis tujuan), Requirements 17–21.** Pengguna memberi tujuan dan sistem menghitung berapa yang harus ditabung — kebalikan dari model lama.

> **Pivot arah (Iterasi Goal-Driven).** Model lama **preset/persentase-driven** (Requirements 1–16: pilih preset 50/30/20 · 70/20/10 · 80/20 · Custom, mode terpisah/kombinasi + shortfall, proyeksi target tabungan Arah A/B, present value/Include_Savings) **DISUPERSEKSI** dan tidak lagi menjadi arah aktif. Dulu pengguna memilih **persentase** dan target hanya efek samping; sekarang alurnya **dibalik**: pengguna memberi tujuan, sistem menghitung tabungan bulanan, dan **persentase menjadi OUTPUT**.

Keputusan cakupan goal-driven (final):
- **Input (semua wajib):** `monthlyIncome` (default dari `income` `FinancialProfile`, dapat ditimpa), `currentSavings` (dari `FinancialProfile`, **selalu** dihitung sebagai saldo awal — tanpa toggle), `targetAmount` (nominal target), dan `horizonMonths` (jangka waktu dalam bulan, **wajib**).
- **Perhitungan (akumulasi murni, tanpa bunga/pertumbuhan):**
  - `monthsN = horizonMonths`.
  - **`ditabung` (dihitung sistem)** `= max(0, (targetAmount − currentSavings)) ÷ monthsN`. Bila `currentSavings ≥ targetAmount` → **sudah tercapai** (`ditabung = 0`, status `alreadyReached`).
  - **`kebutuhan`** dari `expense` `FinancialProfile`; bila `expense` 0/tidak valid/tidak ada → **rasio fallback** `round(0.65 × (monthlyIncome − ditabung))`.
  - **`keinginan`** `= monthlyIncome − ditabung − kebutuhan`.
  - **Persentase turunan (OUTPUT):** tiap pos `÷ monthlyIncome × 100` (kebutuhan% / keinginan% / ditabung%). Bukan input.
- **Penilaian kelayakan (feasibility):** `impossible` bila `ditabung` saja melebihi `monthlyIncome` (peringatan terkuat); `tight` bila `ditabung + kebutuhan > monthlyIncome` atau `keinginan` sangat kecil (< 5% pemasukan) — dengan saran memperpanjang jangka waktu atau menurunkan target; `ok` bila sehat (tampilkan tiga pos tanpa peringatan).
- **Dihapus dari alur (dibanding model lama):** 3 preset tetap, mode persentase Custom, `PresetPicker`, mode `terpisah`/`kombinasi` + shortfall, toggle `Include_Savings` (tabungan saat ini kini selalu saldo awal), dan cabang "Arah A time-to-goal" (horizon kini selalu diberikan). Persentase tidak pernah menjadi input. Catatan: komponen/modul lama tersebut **dipensiunkan tetapi masih ada di repo** (tidak dipakai alur goal-driven) — tidak dihapus fisik agar tidak perlu migrasi/pembersihan destruktif.
- **Logika murni** di `lib/planner/goalBudget.ts` (`computeGoalBudget`) — akumulasi murni, diuji PBT (`fast-check`). Modul lama `presets.ts`/`budget.ts`/`savingsProjection.ts` dan komponen `PresetPicker.tsx` **dipensiunkan tetapi dipertahankan** di repo (tak dipakai UI/API goal-driven).
- **Persistensi** ke `BudgetPlan` dengan **reuse kolom** yang sudah ada — **tanpa migrasi Prisma**: `presetId = "goal"` (penanda), `baseAmount = monthlyIncome`, `savingsTargetAmount = targetAmount`, `savingsHorizonMonths = horizonMonths`, `breakdown` = ketiga pos (Json); `mode`/`includeSavings`/`investmentContribution` null. Endpoint `GET /api/budget` mengembalikan `defaultMonthlyIncome` + `currentSavings` + `monthlyExpense`; `POST /api/budget` menerima `{ monthlyIncome, targetAmount, horizonYears, userId? }`.
- **Reuse pola yang ada:** `Profile_Gate` (gate wajib), Prisma singleton (`lib/db.ts`), helper input Rupiah (`lib/format/rupiahInput.ts`), pola visual `RecommendationCard`, token warna Miami blue, format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`, dan disclaimer edukatif. UI disederhanakan menjadi form (Tujuan & Pendapatan) → hasil.

**Kontrak data yang dikonsumsi:** `income`, `expense`, dan `currentSavings` dari `FinancialProfile` terbaru menjadi masukan `computeGoalBudget` (income sebagai default `monthlyIncome`; expense sebagai `kebutuhan`; currentSavings sebagai saldo awal).

**Sisa roadmap Planner:** pencatatan transaksi harian, cash-flow bulanan, dan riwayat multi-anggaran.

### 5.1.1 Tujuan Aktif Tersentralisasi (Active Goal) — masukan bersama Investasi & Planner
Cakupan **Active Goal** memiliki spesifikasi formal di `.kiro/specs/active-goal/` (requirements, design, tasks). Fitur ini **menyentralisasi satu tujuan keuangan** agar dipakai bersama oleh cakupan Investasi dan Planner (kini goal-driven), menggantikan input "target + jangka waktu" yang sebelumnya diminta terpisah di masing-masing cakupan.

Keputusan cakupan (final):
- **Satu Tujuan Aktif (bukan multi-goal).** `Active_Goal` = baris `Goal` **terbaru** (`createdAt` desc) — pola "latest wins" yang sama dengan `getLatestProfile()`.
- **Dikelola dari dashboard.** `app/page.tsx` menampilkan kartu **"Tujuan aktif"** (`components/goal/ActiveGoalCard.tsx`) berisi nama (opsional) + `targetAmount` (Rupiah) + `horizonMonths`, dengan aksi **Ubah tujuan**; bila belum ada → CTA **Tetapkan tujuan**. Editor (`components/goal/GoalEditor.tsx`) mem-`POST /api/goal`. Dashboard adalah **satu-satunya tempat `Goal` dibuat**.
- **Migrasi aditif `name`.** Model `Goal` diperluas dengan `name String?` (nullable) lewat migrasi tambahan `add_goal_name` — **tanpa reset**. Baris lama memperoleh `name = null` (tampilan memakai label fallback, mis. "Tujuan").
- **Satuan jangka waktu = BULAN.** Sejak migrasi `horizon_years_to_months`, kolom `Goal.horizonYears`→`Goal.horizonMonths` dan `BudgetPlan.savingsHorizonYears`→`BudgetPlan.savingsHorizonMonths` (data lama dikonversi ×12). Seluruh input, penyimpanan, perhitungan, dan tampilan kini memakai **bulan**; ambang bucket alokasi menjadi `<24` / `24..60` / `>60` bulan (setara `<2` / `2–5` / `>5` tahun).
- **Prefill + override satu kali (one-off).** Investasi dan Planner **memprefill** `targetAmount` + `horizonMonths` dari Tujuan Aktif; pengguna boleh **menimpa** nilai di dalam cakupan sebagai **skenario satu kali** yang **tidak** mengubah Tujuan Aktif yang tersimpan.
- **Investasi tidak lagi membuat `Goal`.** `GoalForm` cakupan Investasi **berhenti** mem-`POST /api/goal`; alur hanya membaca Tujuan Aktif untuk prefill lalu meneruskan `targetAmount`/`horizonMonths` efektif (prefilled/di-override) + `goalId` opsional langsung ke `POST /api/recommendation` **tanpa** mempersistensi `Goal` baru.
- **Planner memprefill via `GET /api/budget`.** `GET /api/budget` diperluas mengembalikan `goalTargetAmount`/`goalHorizonMonths`/`goalName` dari Tujuan Aktif untuk memprefill `BudgetForm`. `POST /api/budget` tidak berubah; Planner tetap menyimpan ke `BudgetPlan` (bukan `Goal`); override tetap satu kali.
- **Kontrak API:** `POST /api/goal` menerima `name` opsional (di-trim; kosong → null) dan mempertahankan validasi lama (`targetAmount` > 0; `horizonMonths` bilangan bulat > 0), mengembalikan `name` pada respons. `GET /api/goal` mengembalikan tujuan terbaru termasuk `name`. Pembaca server-side baru `getActiveGoal()` di `lib/goal.ts` (pola `getLatestProfile()`) dipakai dashboard.
- **Sifat fitur:** integrasi/persistensi — divalidasi via integration/component test, **bukan** property-based test.
- **Reuse pola yang ada:** model `Goal`, endpoint `/api/goal`, Prisma singleton (`lib/db.ts`), helper input Rupiah (`lib/format/rupiahInput.ts`), token Miami blue, format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`, `Profile_Gate`, dan disclaimer edukatif.

**Kedua cakupan tetap berfungsi tanpa Tujuan Aktif:** bila belum ada, form Investasi/Planner memulai kosong dan mengizinkan input manual (tidak diblokir keras).

### 5.2 Integrasi Chatbot ke Data Pengguna
Chatbot membaca konteks pengguna untuk konsultasi yang personal. **Kontrak data yang akan dikonsumsi:** `FinancialProfile` (income/expense/savings) + `InvestmentRecommendation` (komposisi, return, kontribusi bulanan) disuntikkan sebagai konteks ke prompt, sehingga jawaban chatbot selaras dengan rencana investasi pengguna.

### 5.3 Autentikasi
Field `userId` (nullable) sudah ada di semua model sejak awal, sehingga penambahan auth tidak memerlukan migrasi skema besar.

### Prinsip ekstensibilitas
Semua logika investasi berada di `lib/investment/*` sebagai **pure function** yang dapat diimpor independen (tanpa dependensi UI/API/DB). Ini memastikan Planner dan integrasi chatbot dapat memakai ulang mesin aturan dan kalkulator proyeksi. Cakupan Planner mengikuti pola yang sama: logika penganggaran murni akan berada di `lib/planner/*` (`presets.ts`, `budget.ts`), hanya mengimpor tipe dari `@/types/planner`.

---

## 6. Peta Dokumen

| Dokumen | Isi |
|---|---|
| `dokumentasi.md` (ini) | Arah produk keseluruhan (otoritatif). |
| `.kiro/specs/financial-planner/requirements.md` | Kebutuhan formal MVP cakupan Investasi (EARS). |
| `.kiro/specs/financial-planner/design.md` | Desain teknis Investasi: matriks, properti korektnes, testing. |
| `.kiro/specs/financial-planner/tasks.md` | Rencana implementasi Investasi (10 langkah, selesai). |
| `.kiro/specs/budget-planner/requirements.md` | Kebutuhan formal cakupan Planner (EARS) — alokasi (Req 1–10) terimplementasi + proyeksi target tabungan opsional (Req 11–12) + opsi sertakan tabungan saat ini/present value (Req 13–14) + preset penganggaran Custom (Req 15–16) sebagai delta. |
| `.kiro/specs/budget-planner/design.md` | Desain teknis Planner: preset, `computeBudget`/`computeBudgetFromPreset`/`buildCustomPreset`/`evaluateShortfall`, `savingsProjection` (FV annuity + present value opsional), model `BudgetPlan`, properti korektnes (1–16), testing. |
| `.kiro/specs/budget-planner/tasks.md` | Rencana implementasi Planner: alokasi (Task 1–8, selesai) + delta proyeksi target tabungan (Task 9–14, selesai) + delta 2 sertakan tabungan saat ini/present value (Task 15–20) + delta 3 preset Custom (Task 21–26). |
| `.kiro/specs/active-goal/requirements.md` | Kebutuhan formal Tujuan Aktif tersentralisasi (EARS): migrasi `Goal.name`, `POST/GET /api/goal` + `getActiveGoal`, kartu dashboard + editor, prefill + override satu kali di Investasi & Planner. |
| `.kiro/specs/active-goal/design.md` | Desain teknis Tujuan Aktif: arsitektur (dashboard sebagai sumber tujuan), `Goal + name` (migrasi aditif), `getActiveGoal`, perubahan `GET/POST /api/goal` & `GET /api/budget`, komponen `ActiveGoalCard`/`GoalEditor` + prefill Investasi/Planner, testing (integrasi/komponen). |
| `.kiro/specs/active-goal/tasks.md` | Rencana implementasi Tujuan Aktif (7 langkah): migrasi → `getActiveGoal` + endpoint → dashboard → prefill Investasi → prefill Planner → checkpoint. |
| `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md` | **Fitur chatbot pelengkap (fase PoC)** — lihat catatan pengarah di puncak masing-masing. |
