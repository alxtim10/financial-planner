# Requirements Document

## Introduction

**Financial Planner** adalah aplikasi web berbasis Next.js yang membantu pengguna merencanakan keuangan secara terstruktur. Arah produk bergeser dari sekadar chatbot menjadi **aplikasi perencana keuangan terstruktur** sebagai fitur utama, dengan **chatbot AI sebagai fitur pelengkap (complementary)**.

MVP (Minimum Viable Product) berfokus **hanya pada cakupan Investasi (Investment scope)**. Alur utama: pengguna mengisi Profil Finansial (gate wajib) → menetapkan Tujuan (Goal) → mengisi survei Profil Risiko → sistem menghitung rekomendasi alokasi investasi berbasis aturan (rule-based) beserta proyeksi kontribusi bulanan yang diperlukan.

Chatbot yang sudah ada (proxy streaming Gemini di `POST /api/chat`) tetap dipertahankan apa adanya, namun **dikemas ulang** dari halaman penuh menjadi **panel drawer geser dari kanan** yang tersedia di semua halaman.

Dokumen naratif utama untuk arah produk baru berada di `dokumentasi.md` (root proyek). Dokumen ini (requirements) mendefinisikan kebutuhan fungsional dan non-fungsional untuk MVP cakupan Investasi.

### Tujuan MVP (kriteria validasi)
- Pengguna dapat menyelesaikan alur end-to-end: Profil Finansial → Goal → Survei Risiko → Rekomendasi Alokasi + Proyeksi Kontribusi Bulanan.
- Rekomendasi alokasi ditentukan oleh mesin aturan (matriks Horizon × Profil Risiko) yang deterministik dan teruji.
- Proyeksi kontribusi bulanan dihitung dengan rumus Future Value of Annuity yang akurat.
- Data profil, goal, penilaian risiko, dan rekomendasi dipersistensi ke PostgreSQL via Prisma.
- Chatbot pelengkap tersedia sebagai drawer di semua halaman tanpa mengubah kontrak `/api/chat`.

### Out of Scope (MVP) / Roadmap
- **Autentikasi & akun pengguna.** Tidak diperlukan untuk MVP. Skema database tetap menyertakan field `userId` (nullable) sebagai placeholder untuk pengembangan auth di masa depan.
- **Planner (penganggaran harian/bulanan).** Fitur budgeting 50/30/20 terstruktur, pencatatan transaksi harian, dan cash-flow adalah **roadmap**, tidak diimplementasikan di MVP.
- **Integrasi chatbot ke data pengguna** (chatbot membaca profil + rekomendasi sebagai konteks) adalah **roadmap**, tidak diimplementasikan di MVP.
- Export PDF/CSV, visualisasi chart lanjutan, dan multi-goal.

---

## Glossary

- **Financial_Planner**: Aplikasi web utama yang memfasilitasi perencanaan keuangan terstruktur.
- **Investment_Scope**: Cakupan MVP yang menangani rekomendasi alokasi investasi berbasis tujuan dan profil risiko.
- **Financial_Profile**: Data dasar keuangan pengguna: pemasukan bulanan (income), pengeluaran bulanan (expense), dan tabungan saat ini (current savings). Menjadi gate wajib sebelum mengakses Investment_Scope.
- **Goal**: Target keuangan pengguna berupa nominal target (target amount) dan horizon waktu (time horizon), mis. Rp 100.000.000 dalam 5 tahun.
- **Horizon**: Jangka waktu tujuan dalam tahun, diturunkan dari Goal. Dikelompokkan ke bucket: `< 2 tahun`, `2–5 tahun`, `> 5 tahun`.
- **Risk_Profile**: Klasifikasi toleransi risiko pengguna hasil survei, bernilai salah satu dari `Konservatif`, `Moderat`, atau `Agresif`.
- **Risk_Assessment**: Kumpulan jawaban survei risiko beserta skor dan Risk_Profile hasil klasifikasi.
- **Allocation_Engine**: Mesin aturan yang memetakan (Horizon × Risk_Profile) ke komposisi alokasi dan estimasi return tahunan berdasarkan Allocation_Matrix.
- **Allocation_Matrix**: Tabel 2-dimensi (Horizon × Risk_Profile) yang mendefinisikan komposisi instrumen dan estimasi return tahunan.
- **Investment_Recommendation**: Hasil akhir berisi komposisi alokasi, estimasi return tahunan, dan proyeksi kontribusi bulanan yang dipersistensi.
- **Monthly_Contribution**: Kontribusi bulanan yang diperlukan untuk mencapai Goal, dihitung dengan Future Value of Annuity.
- **Chatbot**: Fitur pelengkap konsultasi keuangan berbasis Gemini yang dikemas sebagai drawer geser dari kanan.
- **Profile_Gate**: Mekanisme guard yang memblokir akses Investment_Scope bila Financial_Profile belum diisi.

---

## Requirements

### Requirement 1: Profil Finansial sebagai Gate Wajib

**User Story:** Sebagai pengguna, saya ingin mengisi profil finansial dasar terlebih dahulu, sehingga rekomendasi investasi yang saya terima berdasarkan kondisi keuangan saya yang sebenarnya.

#### Acceptance Criteria
1. WHEN pengguna mengirim Financial_Profile berisi pemasukan bulanan, pengeluaran bulanan, dan tabungan saat ini, THE Financial_Planner SHALL menyimpan Financial_Profile ke database.
2. IF pemasukan bulanan, pengeluaran bulanan, atau tabungan saat ini bernilai negatif, THEN THE Financial_Planner SHALL menolak penyimpanan dan mengembalikan pesan validasi.
3. WHEN pengguna mencoba mengakses Investment_Scope tanpa Financial_Profile tersimpan, THE Profile_Gate SHALL mengarahkan pengguna ke halaman pengisian Financial_Profile.
4. WHEN Financial_Profile sudah tersimpan, THE Profile_Gate SHALL mengizinkan akses ke Investment_Scope.
5. THE Financial_Profile SHALL menyimpan field `userId` yang boleh bernilai null pada MVP.

### Requirement 2: Penetapan Tujuan (Goal)

**User Story:** Sebagai pengguna, saya ingin menetapkan target nominal dan jangka waktu, sehingga sistem tahu berapa banyak yang harus saya kumpulkan dan dalam berapa lama.

#### Acceptance Criteria
1. WHEN pengguna mengirim Goal berisi nominal target dan jangka waktu dalam tahun, THE Financial_Planner SHALL menyimpan Goal ke database.
2. THE Financial_Planner SHALL menurunkan Horizon dari jangka waktu Goal dalam satuan tahun.
3. IF nominal target Goal bernilai kurang dari atau sama dengan nol, THEN THE Financial_Planner SHALL menolak penyimpanan dan mengembalikan pesan validasi.
4. IF jangka waktu Goal bernilai kurang dari atau sama dengan nol, THEN THE Financial_Planner SHALL menolak penyimpanan dan mengembalikan pesan validasi.
5. THE Goal SHALL menyimpan field `userId` yang boleh bernilai null pada MVP.

### Requirement 3: Survei dan Skoring Profil Risiko

**User Story:** Sebagai pengguna, saya ingin mengisi survei singkat, sehingga sistem dapat menentukan profil risiko saya secara objektif.

#### Acceptance Criteria
1. WHEN pengguna menyelesaikan survei Risk_Assessment, THE Financial_Planner SHALL menghitung skor total dari jawaban survei.
2. WHEN skor total dihitung, THE Financial_Planner SHALL mengklasifikasikan Risk_Profile ke salah satu dari `Konservatif`, `Moderat`, atau `Agresif`.
3. THE Financial_Planner SHALL memetakan skor total ke Risk_Profile secara deterministik berdasarkan ambang batas skor yang tetap.
4. WHEN Risk_Assessment selesai dihitung, THE Financial_Planner SHALL menyimpan Risk_Assessment beserta Risk_Profile hasil klasifikasi ke database.
5. THE Risk_Assessment SHALL menyimpan field `userId` yang boleh bernilai null pada MVP.

### Requirement 4: Rekomendasi Alokasi Investasi Berbasis Aturan

**User Story:** Sebagai pengguna, saya ingin mendapat komposisi alokasi investasi yang sesuai dengan horizon dan profil risiko saya, sehingga saya tahu instrumen apa yang cocok.

#### Acceptance Criteria
1. WHEN Horizon dan Risk_Profile tersedia, THE Allocation_Engine SHALL menentukan komposisi alokasi dan estimasi return tahunan dari Allocation_Matrix.
2. WHERE Horizon bernilai kurang dari 2 tahun, THE Allocation_Engine SHALL mengembalikan komposisi 100% RDPU dengan estimasi return tahunan 4,75% tanpa memperhatikan Risk_Profile.
3. WHERE Horizon bernilai antara 2 sampai 5 tahun DAN Risk_Profile adalah `Konservatif`, THE Allocation_Engine SHALL mengembalikan komposisi 70% RDPU + 30% SBN/Deposito dengan estimasi return tahunan 5,5%.
4. WHERE Horizon bernilai antara 2 sampai 5 tahun DAN Risk_Profile adalah `Moderat`, THE Allocation_Engine SHALL mengembalikan komposisi 50% RDPU + 50% Emas/SBN Ritel dengan estimasi return tahunan 6,5%.
5. WHERE Horizon bernilai antara 2 sampai 5 tahun DAN Risk_Profile adalah `Agresif`, THE Allocation_Engine SHALL mengembalikan komposisi 30% RDPU + 40% SBN/RDPT + 30% Emas dengan estimasi return tahunan 7,5%.
6. WHERE Horizon bernilai lebih dari 5 tahun DAN Risk_Profile adalah `Konservatif`, THE Allocation_Engine SHALL mengembalikan komposisi 50% SBN/RDPT + 30% Emas + 20% Saham dengan estimasi return tahunan 7,0%.
7. WHERE Horizon bernilai lebih dari 5 tahun DAN Risk_Profile adalah `Moderat`, THE Allocation_Engine SHALL mengembalikan komposisi 40% Saham/Indeks + 40% SBN + 20% Emas dengan estimasi return tahunan 9,5%.
8. WHERE Horizon bernilai lebih dari 5 tahun DAN Risk_Profile adalah `Agresif`, THE Allocation_Engine SHALL mengembalikan komposisi 70% Saham/Indeks + 20% SBN + 10% Emas dengan estimasi return tahunan 11,0%.
9. IF Risk_Profile bukan salah satu dari `Konservatif`, `Moderat`, atau `Agresif`, THEN THE Allocation_Engine SHALL menandai input tidak valid dan mengembalikan error.
10. THE Allocation_Engine SHALL mengembalikan komposisi yang total persentase alokasinya sama dengan 100%.

### Requirement 5: Proyeksi Kontribusi Bulanan

**User Story:** Sebagai pengguna, saya ingin tahu berapa yang perlu saya sisihkan tiap bulan, sehingga saya bisa menilai apakah tujuan saya realistis.

#### Acceptance Criteria
1. WHEN nominal target, jangka waktu, tabungan saat ini, dan estimasi return tahunan tersedia, THE Financial_Planner SHALL menghitung Monthly_Contribution menggunakan rumus Future Value of Annuity.
2. THE Financial_Planner SHALL menggunakan tingkat bunga bulanan `i` sama dengan estimasi return tahunan dibagi 12 dan jumlah periode `n` sama dengan jangka waktu dalam bulan.
3. IF estimasi return tahunan bernilai nol, THEN THE Financial_Planner SHALL menghitung Monthly_Contribution menggunakan pembagian linear yaitu selisih nominal target dan tabungan saat ini dibagi jumlah bulan.
4. WHEN hasil Monthly_Contribution bernilai negatif karena tabungan saat ini sudah cukup, THE Financial_Planner SHALL membatasi nilai minimum Monthly_Contribution ke nol.
5. WHEN Investment_Recommendation dihasilkan, THE Financial_Planner SHALL menyimpan komposisi alokasi, estimasi return tahunan, dan Monthly_Contribution ke database sebagai Investment_Recommendation.
6. THE Investment_Recommendation SHALL menyimpan field `userId` yang boleh bernilai null pada MVP.

### Requirement 6: Tampilan Rekomendasi Investasi

**User Story:** Sebagai pengguna, saya ingin melihat rekomendasi saya secara jelas beserta disclaimer, sehingga saya memahami hasil dan batasannya.

#### Acceptance Criteria
1. WHEN Investment_Recommendation tersedia, THE Financial_Planner SHALL menampilkan komposisi alokasi, estimasi return tahunan, dan Monthly_Contribution.
2. WHEN Investment_Recommendation ditampilkan, THE Financial_Planner SHALL menyertakan disclaimer edukatif bahwa rekomendasi bersifat edukatif dan bukan nasihat investasi tersertifikasi.
3. WHEN aplikasi dibuka di viewport mobile, THE Financial_Planner SHALL menjaga tampilan rekomendasi tetap terbaca.

### Requirement 7: Persistensi Data via PostgreSQL

**User Story:** Sebagai pemilik proyek, saya ingin data pengguna tersimpan permanen, sehingga rekomendasi dapat ditinjau kembali dan menjadi fondasi fitur lanjutan.

#### Acceptance Criteria
1. THE Financial_Planner SHALL menyimpan Financial_Profile, Goal, Risk_Assessment, dan Investment_Recommendation ke database PostgreSQL melalui Prisma.
2. THE Financial_Planner SHALL membaca koneksi database dari environment variable `DATABASE_URL`.
3. IF operasi database gagal, THEN THE Financial_Planner SHALL mengembalikan respons error yang ramah pengguna tanpa mengekspos detail internal.
4. THE Financial_Planner SHALL menggunakan satu instance Prisma Client tunggal (singleton) untuk seluruh operasi database.

### Requirement 8: Chatbot Pelengkap sebagai Drawer

**User Story:** Sebagai pengguna, saya ingin membuka asisten AI kapan saja dari sudut layar, sehingga saya bisa bertanya tanpa meninggalkan halaman yang sedang saya buka.

#### Acceptance Criteria
1. THE Financial_Planner SHALL menampilkan tombol ikon pembuka Chatbot di sudut kanan atas pada semua halaman.
2. WHEN pengguna menekan tombol pembuka Chatbot, THE Financial_Planner SHALL menampilkan panel drawer yang meluncur masuk dari sisi kanan.
3. WHEN pengguna menekan tombol tutup, area backdrop, atau tombol Escape, THE Financial_Planner SHALL menutup panel drawer.
4. WHILE panel drawer terbuka, THE Chatbot SHALL mengirim pesan ke endpoint `POST /api/chat` tanpa perubahan kontrak API.
5. THE Financial_Planner SHALL mempertahankan perilaku streaming, penanganan error, dan sentinel `[[STREAM_ERROR]]` yang sudah ada pada Chatbot.

### Requirement 9: Ekstensibilitas Logika Investasi (Fondasi Roadmap)

**User Story:** Sebagai pengembang, saya ingin logika investasi terisolasi dan dapat dipakai ulang, sehingga fitur Planner dan integrasi Chatbot di masa depan dapat mengonsumsinya tanpa duplikasi.

#### Acceptance Criteria
1. THE Financial_Planner SHALL menempatkan Allocation_Engine, kalkulator Monthly_Contribution, dan skoring risiko sebagai modul pure function terpisah di `lib/investment/`.
2. THE modul di `lib/investment/` SHALL dapat diimpor secara independen tanpa bergantung pada lapisan UI atau lapisan API.
3. THE dokumentasi SHALL mencantumkan kontrak data yang akan dikonsumsi fitur Planner (Monthly_Contribution) dan Chatbot (konteks profil + rekomendasi) di masa depan.

---

## Referensi Fitur yang Sudah Ada (Chatbot Pelengkap)

Kebutuhan berikut sudah terpenuhi oleh implementasi Chatbot yang ada dan tetap berlaku sebagai fitur pelengkap. Detail lengkap ada di `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, dan `TASKS.md` (lihat catatan pengarah di puncak masing-masing dokumen):

- Konsultasi keuangan via chat streaming dengan render Markdown.
- Guardrails input finansial (minta 3 data inti bila kurang) dan acuan 50/30/20 di dalam prompt.
- Disclaimer edukatif wajib pada setiap ringkasan.
- Keamanan API key di sisi server (`GEMINI_API_KEY` tanpa prefix `NEXT_PUBLIC_`).
- Penanganan error inisiasi (HTTP 500/429) dan mid-stream (sentinel `[[STREAM_ERROR]]`).
- Manajemen riwayat sesi (20 pesan terakhir, format flat `{ role, content }`).

Perubahan satu-satunya terhadap Chatbot pada fase ini adalah **pengemasan UI** dari halaman penuh menjadi drawer (Requirement 8). Kontrak `POST /api/chat`, `lib/prompt.ts`, dan `types/chat.ts` tidak berubah.
