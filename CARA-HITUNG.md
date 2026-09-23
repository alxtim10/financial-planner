# Cara Aplikasi Menghitung — Versi Sederhana

Dokumen ini menjelaskan **dari mana angka-angka di aplikasi berasal**, dengan
bahasa sehari-hari dan contoh nyata. Tidak perlu latar belakang matematika.

> Semua angka dihitung dari **3 data** yang kamu isi — pemasukan, pengeluaran,
> dan tabungan — ditambah **tujuan** (target dana & jangka waktu). Aplikasi tidak
> menebak dan tidak menyimpan angka rahasia. Tiap bagian menyertakan **rumus
> aslinya**; untuk versi teknis lengkap (sampai lokasi kode), lihat
> [`RUMUS.md`](./RUMUS.md).

Contoh yang dipakai di seluruh dokumen ini (biar konsisten):

| Data | Nilai |
|---|---|
| Pemasukan per bulan | Rp 10.000.000 |
| Pengeluaran per bulan | Rp 6.000.000 |
| Tabungan saat ini | Rp 20.000.000 |
| Tujuan | Rp 100.000.000 dalam 60 bulan (5 tahun) |

---

## 1. Dana Darurat — "Berapa bulan kamu bisa bertahan?"

**Pertanyaannya:** kalau pemasukan berhenti, berapa lama tabunganmu bisa menutup
biaya hidup?

**Cara hitungnya:**

```
Dana darurat (bulan) = tabungan ÷ pengeluaran per bulan
```

Contoh: `Rp 20.000.000 ÷ Rp 6.000.000 = 3,3 bulan`.

**Patokan yang dipakai:** dana darurat ideal adalah **6 bulan pengeluaran**.

```
Target dana darurat = pengeluaran per bulan × 6
Kekurangan          = target − tabungan   (0 kalau sudah cukup)
```

Contoh: `Rp 6.000.000 × 6 = Rp 36.000.000`, lalu `Rp 36.000.000 − Rp 20.000.000
= Rp 16.000.000` (masih kurang).

**Rumus aslinya:**

```text
coverage        = tabungan / pengeluaran
targetAmount    = pengeluaran × 6
shortfallAmount = max(0, targetAmount − tabungan)
coverageMonths  = coverage dibulatkan 1 desimal

coverage < 3        → VULNERABLE  (Perlu perhatian)
3 ≤ coverage ≤ 6    → ADEQUATE    (Memadai)
coverage > 6        → STRONG      (Kuat)
```

**Arti warnanya:**

| Hasil | Arti | Saran singkat |
|---|---|---|
| Kurang dari 3 bulan | **Perlu perhatian** | Dahulukan menabung di tempat yang mudah dicairkan |
| 3–6 bulan | **Memadai** | Seimbangkan menabung & investasi |
| Lebih dari 6 bulan | **Kuat** | Siap investasi lebih terukur |

---

## 2. Anggaran Bulanan — "Berapa yang harus disisihkan tiap bulan?"

**Tujuannya:** tahu berapa yang perlu kamu sisihkan tiap bulan agar target
tercapai, lalu lihat sisanya untuk kebutuhan & keinginan.

**Langkah 1 — hitung tabungan wajib per bulan:**

```
Tabungan wajib = (target − tabungan saat ini) ÷ jumlah bulan
```

Contoh: `(Rp 100.000.000 − Rp 20.000.000) ÷ 60 = Rp 1.333.333 per bulan`.

**Langkah 2 — bagi sisanya jadi tiga pos:**

```
Kebutuhan = pengeluaran bulananmu
Keinginan = pemasukan − tabungan wajib − kebutuhan
```

Contoh:
- Kebutuhan = Rp 6.000.000
- Keinginan = Rp 10.000.000 − Rp 1.333.333 − Rp 6.000.000 = **Rp 2.666.667**

Kalau pengeluaran belum diisi, aplikasi menaksir kebutuhan sebesar **65%** dari
sisa (pemasukan setelah tabungan).

**Langkah 3 — ubah jadi persentase** (supaya mudah dibandingkan):

```
Persentase tiap pos = pos ÷ pemasukan × 100%
```

Contoh: Ditabung 13,3% · Kebutuhan 60% · Keinginan 26,7%.

**Rumus aslinya:**

```text
ditabung  = max(0, target − tabungan) / jumlah bulan
kebutuhan = pengeluaran > 0 ? pengeluaran : round(0,65 × (pemasukan − ditabung))
keinginan = pemasukan − ditabung − kebutuhan
posPct    = pos / pemasukan × 100%

sudahTercapai = tabungan ≥ target
```

Statusnya:

```text
tidak realistis  iff  ditabung > pemasukan
selain itu, layak = (ditabung + kebutuhan ≤ pemasukan)
sehat            iff  layak DAN keinginan ≥ 0,05 × pemasukan
                         selain itu → "ketat"
```

**Kapan aplikasi memberi peringatan?**

| Status | Artinya |
|---|---|
| **Sehat** | Tabungan wajib + kebutuhan masih muat, dan ada sisa untuk keinginan |
| **Ketat** | Setelah kebutuhan & tabungan, sisa untuk keinginan sangat kecil (< 5% pemasukan) |
| **Tidak realistis** | Tabungan wajib saja sudah melebihi pemasukan bulanan |

Contoh "tidak realistis": target `Rp 150.000.000` dalam **12 bulan** →
`(150jt − 20jt) ÷ 12 = Rp 10.833.333` per bulan, padahal pemasukan hanya
`Rp 10.000.000`. Bukan mustahil secara matematis — hanya berarti target/waktunya
perlu disesuaikan.

---

## 3. Kalau Terasa Berat — 3 Pilihan (Trade-Off)

Saat anggaran **ketat** atau **tidak realistis**, aplikasi menawarkan 3 solusi
yang bisa langsung diterapkan. Semuanya berangkat dari **kapasitas aman**:

```
Kapasitas aman = pemasukan − kebutuhan − 5% pemasukan (sisihkan sedikit)
```

Contoh: `Rp 10.000.000 − Rp 6.000.000 − Rp 500.000 = Rp 3.500.000 per bulan`.

**Pilihan 1 — Perpanjang jangka waktu**

```
Jumlah bulan baru = (target − tabungan) ÷ kapasitas aman   (dibulatkan ke atas)
```

Contoh: `Rp 130.000.000 ÷ Rp 3.500.000 ≈ 37,1` → dibulatkan jadi **38 bulan**.
Setoran bulanannya turun jadi lebih ringan.

**Pilihan 2 — Sesuaikan nominal target**

```
Target baru = kapasitas aman × jumlah bulan + tabungan saat ini
```

Contoh: `Rp 3.500.000 × 12 + Rp 20.000.000 = Rp 62.000.000`.

**Pilihan 3 — Pangkas pengeluaran**

Kalau pengeluaran sudah lebih dari separuh pemasukan, aplikasi menyarankan
menekannya sampai kira-kira **35% pemasukan** agar target tetap bisa dikejar.

Contoh: dari kebutuhan `Rp 6.000.000` → disarankan `Rp 3.500.000`, hemat
`Rp 2.500.000` per bulan.

**Rumus aslinya:**

```text
buffer     = 0,05 × pemasukan
kapasitas  = max(0, pemasukan − kebutuhan − buffer)

Perpanjang waktu : bulanBaru  = ceil((target − tabungan) / kapasitas)
Sesuaikan target : targetBaru = max(1.000.000,
                                  floor((kapasitas × jumlahBulan + tabungan) / 500.000) × 500.000)
Pangkas belanja  : batasPengeluaran = max(0,35 × pemasukan,
                                  floor((pemasukan − ditabungPerBulan − buffer) / 100.000) × 100.000)
```

Setelah kamu klik **"Terapkan Solusi"**, angka-angka itu langsung dipakai ulang
untuk menghitung, dan kamu bisa lihat hasilnya seketika.

---

## 4. Investasi — "Taruh dananya di mana?"

Aplikasi memilih campuran (alokasi) berdasarkan **2 hal**: berapa lama dana
disimpan, dan seberapa berani kamu menerima naik-turun nilai.

Prinsipnya sederhana:
- **Makin panjang** jangka waktunya → makin besar porsi yang boleh naik-turun
  (saham), karena ada waktu untuk pulih.
- **Makin pendek** jangka waktunya → makin banyak yang harus aman & mudah
  dicairkan.
- **Makin konservatif** → makin banyak yang aman.

Contoh gambaran (versi ringkas):

| Jangka waktu | Kalau kamu... | Kira-kira isinya |
|---|---|---|
| Kurang dari 2 tahun | apa pun | 100% aman & Likuid |
| 2–5 tahun | hati-hati | mayoritas aman + sedikit emas/obligasi |
| 2–5 tahun | berani | campuran aman + obligasi + emas |
| Lebih dari 5 tahun | hati-hati | obligasi + emas + sedikit saham |
| Lebih dari 5 tahun | berani | mayoritas saham |

**Rumus & tabel aslinya:**

```
Kelompok jangka waktu (dalam bulan):
  < 24 bulan        → "<2"   (profil risiko diabaikan)
  24–60 bulan       → "2-5"
  > 60 bulan        → ">5"
```

Lalu dipetakan ke matriks berikut (angka = porsi dana):

| Jangka waktu | Profil risiko | Komposisi | Asumsi tumbuh/tahun |
|---|---|---|---|
| < 2 tahun | semua | 100% RDPU | 4,75% |
| 2–5 tahun | Konservatif | 70% RDPU + 30% SBN/Deposito | 5,5% |
| 2–5 tahun | Moderat | 50% RDPU + 50% Emas/SBN Ritel | 6,5% |
| 2–5 tahun | Agresif | 30% RDPU + 40% SBN/RDPT + 30% Emas | 7,5% |
| > 5 tahun | Konservatif | 50% SBN/RDPT + 30% Emas + 20% Saham | 7,0% |
| > 5 tahun | Moderat | 40% Saham/Indeks + 40% SBN + 20% Emas | 9,5% |
| > 5 tahun | Agresif | 70% Saham/Indeks + 20% SBN + 10% Emas | 11,0% |

---

## 5. Investasi — "Berapa nabung per bulan?"

Ini bagiannya "berbunga berbunga": uang yang kamu tabung **tumbuh**, dan hasil
tumbuhnya **ikut tumbuh** lagi setiap tahun. Jadi total yang perlu kamu setor
per bulan **lebih kecil** daripada kalau kamu menabung tanpa tumbuh.

**Cara berpikirnya:**

```
Setoran bulanan = (target − tabungan awal yang ikut tumbuh) ÷ faktor pertumbuhan
```

Kamu tidak perlu menghitung "faktor pertumbuhan" itu — aplikasi yang
menghitungnya. Yang penting memahami hasilnya:

Contoh: target `Rp 100.000.000`, tabungan awal `Rp 20.000.000`, 60 bulan, dan
asumsi tumbuh `6,5% per tahun`:

| Cara | Setoran per bulan |
|---|---|
| Tanpa tumbuh (dibagi rata saja) | Rp 1.333.333 |
| Dengan tumbuh 6,5% per tahun | **± Rp 1.024.000** |

Selisihnya (Rp 310.000/bulan) adalah "bantuan" dari hasil investasi itu sendiri.

Kalau asumsi tumbuhnya nol, aplikasi otomatis memakai cara sederhana:
`(target − tabungan) ÷ jumlah bulan`.

**Rumus aslinya (Future Value of Annuity):**

```text
i = asumsi tumbuh per tahun / 12      (tumbuh per bulan)
n = jumlah bulan

Jika i = 0 :  setoran = (target − tabungan) / n
Jika i > 0 :  setoran = (target − tabungan × (1+i)^n) × i / ((1+i)^n − 1)
setoran    = max(0, setoran)
```

> Catatan jujur: angka tumbuh (`6,5%`, `9,5%`, dst.) hanyalah **asumsi**. Hasil
> nyata bisa berbeda — bisa lebih tinggi, bisa lebih rendah.

---

## 6. Survei Risiko — "Seberapa berani kamu?"

Kamu menjawab **5 pertanyaan singkat**. Tiap jawaban bernilai **1** (paling
hati-hati), **2**, atau **3** (paling berani). Nilainya dijumlahkan:

```
Total skor = jumlah nilai 5 jawaban   (rentang 5–15)
```

Lalu:

| Total skor | Profil risiko |
|---|---|
| 5–8 | **Konservatif** (hati-hati) |
| 9–12 | **Moderat** (seimbang) |
| 13–15 | **Agresif** (berani) |

**Rumus aslinya:**

```text
skor = jawaban1 + jawaban2 + jawaban3 + jawaban4 + jawaban5

skor ≤ 8            → "Konservatif"
9 ≤ skor ≤ 12       → "Moderat"
skor ≥ 13           → "Agresif"
```

Profil inilah yang dipakai di bagian 4 untuk memilih campuran investasi.

---

## 7. Ringkasan — 3 Data Jadi Banyak Angka

```
Pemasukan  ┐
Pengeluaran├──► Dana darurat, anggaran (kebutuhan/keinginan/ditabung),
Tabungan   ┘    dan setoran investasi
Tujuan     ┘
```

Semua langkah di atas **deterministik**: dengan data yang sama, hasilnya selalu
sama. Tidak ada AI yang menebak angka — kecuali asumsi tumbuh investasi yang
memang disengaja sebagai perkiraan.

---

*Disclaimer: Simulasi ini bertujuan edukatif dan bukan merupakan nasihat
investasi/keuangan tersertifikasi.*
