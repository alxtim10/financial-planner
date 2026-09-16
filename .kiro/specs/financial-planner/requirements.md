# Requirements Document

## Introduction

Financial Planner AI adalah aplikasi web PoC berbasis Next.js yang menyediakan chatbot konsultasi keuangan personal. Pengguna dapat berkonsultasi tentang alokasi anggaran, dana darurat, dan strategi keuangan melalui antarmuka chat interaktif. Sistem memanfaatkan Google Gemini API di sisi server (agar API key tidak bocor ke klien) dengan respons yang dialirkan secara streaming.

Dokumen ini mendefinisikan kebutuhan fungsional dan non-fungsional untuk PoC. Scope PoC sengaja dibatasi: tanpa autentikasi, tanpa persistensi database, dan riwayat hanya bertahan selama sesi peramban.

### Tujuan PoC (kriteria validasi)
- Gemini API dapat menganalisis data keuangan personal dan menghasilkan simulasi anggaran yang koheren.
- Respons streaming muncul progresif di UI (bukan menunggu balasan penuh).
- API key aman di sisi server, tidak pernah terekspos ke bundle klien.

### Out of Scope (PoC)
- Autentikasi & akun pengguna.
- Persistensi riwayat ke database.
- Sanitasi/proteksi prompt injection.
- Export PDF/CSV dan visualisasi chart.

---

## Requirements

### Requirement 1: Konsultasi Keuangan via Chat

**User Story:** Sebagai pengguna, saya ingin mengetik pertanyaan keuangan dan menerima jawaban dari asisten AI, sehingga saya bisa mendapatkan saran perencanaan keuangan secara interaktif.

#### Acceptance Criteria
1. WHEN pengguna mengirim pesan teks THEN sistem SHALL meneruskan pesan tersebut beserta riwayat percakapan ke Gemini API melalui endpoint server internal.
2. WHEN Gemini API mengembalikan respons THEN sistem SHALL menampilkan balasan asisten di area percakapan.
3. WHEN balasan asisten mengandung format Markdown (tabel, bullet, bold) THEN sistem SHALL merender balasan tersebut sebagai Markdown, bukan teks mentah.
4. WHILE sistem sedang memproses balasan THE SYSTEM SHALL menonaktifkan tombol kirim dan menampilkan indikator loading.

### Requirement 2: Streaming Respons

**User Story:** Sebagai pengguna, saya ingin melihat jawaban muncul bertahap saat sedang dihasilkan, sehingga saya tidak menunggu lama tanpa umpan balik.

#### Acceptance Criteria
1. WHEN Gemini API mulai menghasilkan token THEN sistem SHALL mengalirkan potongan teks (chunk) ke UI secara progresif.
2. WHEN chunk baru diterima THEN sistem SHALL menambahkan teks ke bubble balasan yang sedang aktif (efek typewriter).
3. WHEN chunk baru dirender THEN sistem SHALL melakukan auto-scroll ke bagian bawah area percakapan.
4. WHILE streaming berlangsung THE SYSTEM SHALL menjaga UI tetap responsif (non-blocking).

### Requirement 3: Panduan Input Finansial (Guardrails)

**User Story:** Sebagai pengguna baru, saya ingin dituntun memberikan data yang relevan ketika input saya kurang lengkap, sehingga saran yang saya terima akurat dan bukan tebakan acak.

#### Acceptance Criteria
1. WHEN pengguna memberikan permintaan umum tanpa data finansial (mis. "Bantu atur keuangan saya") THEN asisten SHALL meminta minimal 3 data inti: pemasukan bulanan, pengeluaran/cicilan tetap, dan tujuan keuangan.
2. IF data pemasukan atau pengeluaran belum disebutkan THEN asisten SHALL TIDAK memberikan alokasi angka nominal secara acak.
3. WHEN pengguna menyediakan nominal pemasukan tanpa detail utang THEN asisten SHALL menerapkan acuan alokasi 50/30/20 sebagai dasar rekomendasi.
4. WHEN asisten menghasilkan kalkulasi alokasi 50/30/20 atas nominal tertentu THEN nilai setiap kategori SHALL dihitung tepat secara matematis (50%, 30%, 20% dari nominal).

### Requirement 4: Disclaimer Wajib

**User Story:** Sebagai penyedia PoC, saya ingin setiap saran keuangan disertai disclaimer, sehingga pengguna memahami ini bukan nasihat finansial tersertifikasi.

#### Acceptance Criteria
1. WHEN asisten menghasilkan ringkasan atau kesimpulan rencana keuangan THEN balasan SHALL diakhiri dengan pernyataan disclaimer bahwa simulasi bersifat edukatif dan bukan nasihat investasi/keuangan tersertifikasi.

### Requirement 5: Quick Prompts

**User Story:** Sebagai pengguna, saya ingin tombol preset skenario umum, sehingga saya bisa memulai konsultasi tanpa mengetik dari nol.

#### Acceptance Criteria
1. WHEN halaman chat dimuat THEN sistem SHALL menampilkan beberapa tombol quick prompt (mis. alokasi gaji bulanan, hitung dana darurat, strategi pelunasan utang).
2. WHEN pengguna menekan sebuah quick prompt THEN sistem SHALL mengisi/mengirim teks prompt tersebut sebagai pesan pengguna.

### Requirement 6: Keamanan API Key

**User Story:** Sebagai pemilik proyek, saya ingin API key Gemini tetap rahasia, sehingga tidak disalahgunakan pihak lain.

#### Acceptance Criteria
1. WHERE pemanggilan Gemini API dilakukan THE SYSTEM SHALL menjalankannya hanya di sisi server (route handler), tidak pernah dari klien.
2. THE SYSTEM SHALL membaca API key dari environment variable `GEMINI_API_KEY` tanpa prefix `NEXT_PUBLIC_`.
3. THE SYSTEM SHALL TIDAK menyertakan API key dalam respons apa pun yang dikirim ke klien.

### Requirement 7: Penanganan Error

**User Story:** Sebagai pengguna, saya ingin mendapat pesan yang jelas ketika terjadi kegagalan, sehingga saya tahu harus mencoba lagi dan tidak menunggu tanpa kepastian.

#### Acceptance Criteria
1. IF pemanggilan Gemini API gagal sebelum stream dimulai (mis. rate limit, koneksi) THEN sistem SHALL mengembalikan respons error HTTP dengan pesan yang ramah pengguna, dan UI SHALL menampilkannya di area chat.
2. IF terjadi kegagalan di tengah streaming THEN sistem SHALL menghentikan indikator loading dan menampilkan penanda error ke pengguna sehingga UI tidak menggantung.
3. WHEN error ditampilkan THE SYSTEM SHALL mengembalikan kontrol input ke pengguna (tombol kirim aktif kembali).

### Requirement 8: Manajemen Riwayat Sesi

**User Story:** Sebagai pengguna, saya ingin asisten mengingat konteks percakapan dalam sesi berjalan, sehingga saran menyambung dari pesan sebelumnya.

#### Acceptance Criteria
1. WHEN pengguna mengirim pesan lanjutan THEN sistem SHALL menyertakan riwayat percakapan sebelumnya dalam permintaan ke Gemini API.
2. WHEN riwayat percakapan melebihi 20 pesan THEN sistem SHALL hanya menyertakan 20 pesan terbaru ke server untuk mengontrol biaya token dan latensi.
3. WHEN pengguna memuat ulang (refresh) halaman THEN riwayat sesi SHALL hilang (tidak ada persistensi).
4. THE SYSTEM SHALL merepresentasikan riwayat di klien/API dalam format flat `{ role, content }` dengan `role` hanya bernilai `"user"` atau `"model"`.

### Requirement 9: Antarmuka Responsif

**User Story:** Sebagai pengguna mobile, saya ingin antarmuka chat nyaman di layar kecil, sehingga saya bisa berkonsultasi dari ponsel.

#### Acceptance Criteria
1. WHEN aplikasi dibuka di viewport mobile THEN layout chat SHALL tetap terbaca dan input tetap dapat diakses.
2. THE SYSTEM SHALL menyediakan area percakapan yang dapat di-scroll dengan pemisah visual yang jelas antara pesan pengguna dan asisten.
3. THE SYSTEM SHALL membungkus konten chat dalam container dengan lebar maksimum ~768px (`max-w-3xl`) yang di-tengah-kan pada layar lebar (desktop), dan mengisi penuh lebar dengan padding tepi pada mobile.
4. THE SYSTEM SHALL membatasi lebar bubble pesan hingga ~80% lebar container agar percakapan terlihat seperti antarmuka chat AI pada umumnya.
