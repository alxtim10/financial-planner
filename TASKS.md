# Future Enhancements & Roadmap Backlog: TabungOne

> **Dokumen Terkait:** Gambaran arah produk keseluruhan dapat dilihat pada [`dokumentasi.md`](./dokumentasi.md). File ini berfungsi sebagai *backlog* rencana fitur dan peningkatan teknis berikutnya.

---

## 1. Integrasi Konteks Data Pengguna ke Chatbot AI (Priority: High)
- [ ] **Injeksi Data Finansial ke Prompt:**
  - Ambil data `FinancialProfile` (pemasukan, pengeluaran, tabungan), `Goal` aktif, dan `InvestmentRecommendation` / `BudgetPlan` terbaru dari server.
  - Suntikkan data tersebut sebagai konteks awal ke `FINANCIAL_PLANNER_PROMPT` saat membuka sesi chat di `ChatDrawer`.
- [ ] **Konsultasi Selaras Rencana:**
  - Pastikan asisten AI dapat langsung mengomentari dan memberi saran berdasarkan alokasi instrumen atau anggaran yang telah dibuat pengguna tanpa perlu meminta data ulang.

---

## 2. Pengujian Menyeluruh (Testing & Reliability) (Priority: High)
- [ ] **Unit Testing & Property-Based Testing (PBT):**
  - Buat suite pengujian logika murni di `lib/investment/` (`allocation.test.ts`, `projection.test.ts`, `riskScoring.test.ts`) menggunakan `vitest` dan `fast-check`.
  - Buat pengujian untuk `lib/planner/goalBudget.test.ts` untuk memvalidasi guard input, keakuratan akumulasi murni, persentase turunan, dan evaluasi *feasibility* (`impossible`, `tight`, `ok`).
- [ ] **Integration & Component Testing:**
  - Pengujian alur Wizard Investasi dan Planner dari awal hingga penyimpanan hasil.
  - Pengujian verifikasi perilaku `ProfileGate` dan *one-off override*.

---

## 3. Autentikasi Pengguna & Multi-User (Priority: Medium)
- [ ] **Integrasi Auth (Supabase Auth / NextAuth):**
  - Implementasi login/register (Email OTP / Google OAuth).
  - Hubungkan `session.user.id` ke kolom `userId` yang sudah tersedia di semua model database (`FinancialProfile`, `Goal`, `RiskAssessment`, `InvestmentRecommendation`, `BudgetPlan`).
- [ ] **Manajemen Sesi & Data Privat:**
  - Isolasi data per pengguna pada seluruh query Prisma (`where: { userId }`).

---

## 4. Dukungan Multi-Goal (Banyak Tujuan Keuangan) (Priority: Medium)
- [ ] **Daftar & Prioritas Tujuan:**
  - Ubah pengelolaan tujuan tunggal (*single active goal*) menjadi multi-goal (misal: *Dana Darurat*, *Beli Rumah*, *Dana Pendidikan*, *Pensiun*).
  - Tambahkan alokasi tabungan bulanan yang didistribusikan ke beberapa tujuan sekaligus.
- [ ] **Manajemen Portofolio per Tujuan:**
  - Rekomendasi alokasi investasi yang terpisah dan disesuaikan untuk masing-masing tujuan sesuai horizon waktunya.

---

## 5. Pelacak Arus Kas & Realisasi Transaksi (Priority: Low)
- [ ] **Pencatatan Transaksi Harian:**
  - Fitur catat pengeluaran harian dan pengelompokan ke pos Kebutuhan atau Keinginan.
- [ ] **Monitoring Realisasi vs Rencana Anggaran:**
  - Dashboard visual perbandingan antara anggaran yang direncanakan (`BudgetPlan`) dengan realisasi pengeluaran aktual bulan berjalan.

---

## 6. Ekspor Laporan & Visualisasi (Priority: Low)
- [ ] **Export ke PDF / Gambar:**
  - Opsi unduh ringkasan rencana keuangan dan alokasi portofolio investasi dalam format PDF atau gambar yang mudah disimpan/dibagikan.
- [ ] **Grafik Interaktif:**
  - Visualisasi grafik proyeksi pertumbuhan dana investasi dari waktu ke waktu (*growth chart*).