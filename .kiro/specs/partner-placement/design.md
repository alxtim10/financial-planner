# Desain — Partner Placement (Monetisasi B2B)

> Status: PROPOSAL / snapshot desain. Sumber kebenaran arah produk tetap
> `dokumentasi.md`. Dokumen ini merinci fitur **placement partner keuangan**
> (mis. Bank Mandiri) di atas rekomendasi investasi deterministik.

## 1. Latar belakang & tujuan

Aplikasi sudah tahu konteks keuangan tiap pengguna: profil risiko, Tujuan Aktif,
horizon (bulan), dan **alokasi per instrumen** (`perInstrument[]` dari
`projectInvestment`). Ini membuka peluang monetisasi B2B berupa **placement
produk partner yang kontekstual** — bukan iklan banner acak.

Model bisnis: **affiliate / referral keuangan (CPA / revenue share)**, bukan
CPM. Contoh: pengguna Konservatif + horizon pendek → alokasi mengarah ke
`Deposito/SBN` → tampilkan tawaran "Buka Deposito di Livin' by Mandiri" dengan
link referral terukur.

### Yang diharapkan
- Placement **mengikuti** kategori instrumen yang sudah dihitung engine.
- Setiap klik terukur lewat analitik funnel (event kanonik baru).
- Nol dampak pada angka/alokasi rekomendasi.

### Non-goals
- Tidak ada integrasi pembayaran / pembukaan rekening in-app.
- Tidak ada feed harga/bunga real-time (data partner statis pada fase ini).
- Tidak mengubah `allocation.ts` / `projection.ts` / `riskScoring.ts`.

## 2. Prinsip wajib — NETRALITAS ENGINE

> Aturan domain: rekomendasi **deterministik, bukan LLM**, dihitung dari matriks
> Horizon × Risiko. Monetisasi **TIDAK BOLEH** menggeser angka.

- Placement adalah **lapisan tampil terpisah** yang berjalan *setelah* alokasi
  dihitung. Ia hanya membaca kategori instrumen hasil engine → memetakannya ke
  tawaran partner.
- Dilarang: "partner bayar lebih" memengaruhi persentase alokasi, urutan
  instrumen, atau estimasi return. Engine tidak tahu apa-apa soal partner.
- Seam teknis: `instrumentToCategory(label)` (sudah ada di `allocation.ts`)
  menerjemahkan label slice (mis. "SBN/Deposito") → `InstrumentCategory`
  kanonik. Placement memakai kategori ini sebagai kunci, read-only.

## 3. Pertimbangan kepatuhan (OJK) — WAJIB DIBACA

- Menampilkan/mengarahkan ke produk investasi spesifik ke publik menyentuh ranah
  OJK (potensi dianggap agen penjual / penawaran berizin). **Bukan nasihat
  hukum** — perlu review hukum/compliance sebelum produksi.
- Pada fase ini semua data partner bersifat **ILUSTRATIF/placeholder**
  (nama produk, link, bunga). Bukan penawaran resmi.
- Transparansi wajib: setiap placement ditandai `disclosure`
  ("Didukung partner. Bukan rekomendasi atau penawaran resmi.").
- Disclaimer edukatif `RecommendationCard` yang sudah ada tetap tampil.

## 4. Arsitektur

```
projectInvestment()  → perInstrument[] (label instrumen + angka)   [ENGINE, netral]
         │
         ▼  instrumentToCategory(label)  (read-only, sudah ada)
   InstrumentCategory
         │
         ▼  getPartnerOffers(category)   [LAYER BARU — lib/partners.ts, pure]
   PartnerOffer[]
         │
         ▼  render di RecommendationCard (di bawah tiap slice)      [UI, terpisah]
   klik → trackClientEvent("partner_placement_clicked", {...})      [ANALITIK]
```

### 4.1 Data & tipe — `lib/partners.ts` (pure)
Mengikuti pola `lib/consultants.ts`: data statis + pure helper, hanya impor tipe.

```ts
export interface PartnerOffer {
  id: string;
  partnerName: string;
  productLabel: string;   // teks ramah-pemula
  category: InstrumentCategory;
  ctaLabel: string;       // mis. "Buka Deposito di Livin'"
  referralUrl: string;    // link referral (placeholder)
  disclosure: string;     // tanda konten partner (wajib)
}

export const PARTNER_OFFERS: PartnerOffer[];           // data statis ilustratif
export function getPartnerOffers(c: InstrumentCategory): PartnerOffer[];
```

Pemetaan kategori → produk Bank Mandiri (contoh ilustratif):

| Kategori        | Produk (contoh)                     | CTA                              |
|-----------------|-------------------------------------|----------------------------------|
| `Deposito/SBN`  | Deposito / SBN via Livin'           | Buka Deposito di Livin'          |
| `RDPU`          | Reksa dana pasar uang (Livin')      | Mulai reksa dana di Livin'       |
| `RDPT`          | Reksa dana pendapatan tetap (Livin')| Mulai reksa dana di Livin'       |
| `Saham/Indeks`  | RDN / Mandiri Sekuritas (MOST)      | Buka rekening saham di MOST      |
| `Emas`          | — (kosong bila tak ada produk)      | —                                |

### 4.2 Analitik — event kanonik baru
Tambah `partner_placement_clicked` di `lib/analytics/events.ts`. Dicatat dari
klien via `trackClientEvent` (fire-and-forget) dengan metadata
`{ partnerId, category }`. Tidak boleh menggagalkan UX.

### 4.3 UI — `RecommendationCard.tsx`
- Di bawah tiap slice komposisi, bila `getPartnerOffers(kategori-slice)` tak
  kosong, tampilkan baris kecil "Didukung partner — <ctaLabel>" sebagai link
  (`target="_blank" rel="noopener noreferrer sponsored"`).
- Kategori slice diperoleh via `instrumentToCategory(slice.instrument)`.
- Dedupe: satu kategori hanya memunculkan satu set tawaran meski ada beberapa
  slice sekategori.
- Klik → `trackClientEvent("partner_placement_clicked", { partnerId, category })`.
- Ditandai jelas sebagai konten partner; disclaimer global tetap ada.

## 5. Dampak & keamanan
- Perubahan terbatas: 1 file baru (`lib/partners.ts`), 1 baris event, dan render
  tambahan di `RecommendationCard`. Tidak menyentuh engine/DB/API.
- Tanpa I/O di `lib/partners.ts` (pure, uji-able).
- Entitlement: placement bersifat gratis (menghasilkan revenue), tidak
  di-gate Pro. Bisa diubah lewat `lib/billing/plan.ts` bila perlu.

## 6. Verifikasi
- `npm run build` hijau.
- Manual: alur Investasi → rekomendasi menampilkan baris partner pada kategori
  yang punya tawaran; klik mengirim event (cek Network → /api/events).

## 7. Keputusan yang perlu pemilik produk
1. Konfirmasi review compliance sebelum data partner real dipakai.
2. Konfirmasi placement tetap gratis vs sebagian fitur Pro.
3. Sumber data partner (statis vs feed) untuk fase berikutnya.
