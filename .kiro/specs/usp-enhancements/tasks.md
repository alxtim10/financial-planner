# Implementation Plan: USP Enhancements (Trade-Off Optimizer & Context-Aware AI Copilot)

## Overview

Rencana implementasi ini mengeksekusi fitur pembeda utama (**Unique Selling Point**) untuk **TabungOne**. Task disusun secara modular mengikuti metodologi Kiro: definisi tipe → logika murni berdasar TDD → endpoint API → komponen antarmuka (UI) → verifikasi terintegrasi.

---

## Tasks

- [x] 1. Definisikan tipe domain USP & modul finansial
  - Buat `types/usp.ts` berisi `TradeOffType`, `TradeOffOption`, `TradeOffInput`, dan `FinancialTwinSnapshot`.
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Modul logika murni Trade-Off Optimizer (TDD)
  - [x] 2.1 Implementasikan `lib/planner/tradeoffs.ts`: fungsi murni `computeTradeOffs(input: TradeOffInput)` yang menghasilkan opsi `EXTEND_HORIZON`, `REDUCE_TARGET`, dan `REDUCE_WANTS`.
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Buat unit test `lib/planner/tradeoffs.test.ts` menggunakan Vitest: uji kalkulasi horizon baru, target baru, handling input nol/negatif, dan kasus kelayakan ketat vs mustahil.
    - _Requirements: 1.2_

- [x] 3. Modul logika murni Emergency Fund Waterfall (TDD)
  - [x] 3.1 Implementasikan `lib/financial/emergencyFund.ts`: fungsi `evaluateEmergencyFund(currentSavings, expense)` untuk klasifikasi tier (`VULNERABLE`, `ADEQUATE`, `STRONG`) dan pesan edukasi.
    - _Requirements: 3.1_
  - [x] 3.2 Buat unit test `lib/financial/emergencyFund.test.ts` untuk menguji coverage threshold (<3 bulan, 3–6 bulan, >6 bulan, batas tepat 3/6, dan pengeluaran 0).
    - _Requirements: 3.1_

- [x] 4. Injeksi Konteks Finansial Cerdas pada AI Chatbot
  - [x] 4.1 Buat helper `lib/ai/financialContext.ts`: fungsi `getFinancialTwinContext()` yang membaca `FinancialProfile`, `Goal` aktif, `RiskAssessment`, dan `BudgetPlan` terbaru dari Prisma, lalu menyusun prompt naratif terstruktur.
    - _Requirements: 2.1_
  - [x] 4.2 Perbarui `app/api/chat/route.ts` untuk menyisipkan prompt konteks finansial pengguna ke dalam `systemInstruction` Gemini API secara asinkron sebelum streaming dimulai.
    - _Requirements: 2.1, 2.2_

- [x] 5. Integrasi API Planner `/api/budget` dengan Trade-Off Engine
  - [x] 5.1 Perbarui handler POST di `app/api/budget/route.ts` untuk memanggil `computeTradeOffs` saat status kelayakan `tight` atau `impossible`, dan sertakan array `tradeOffs` dalam JSON respons.
    - _Requirements: 1.1, 1.2_
  - [x] 5.2 Backward-compatible: `tradeOffs` hanya muncul saat `feasibility !== 'ok'`, konsumen existing tidak terpengaruh.

- [x] 6. Komponen UI Trade-Off Optimizer (1-Click Apply)
  - [x] 6.1 Buat `components/planner/TradeOffCards.tsx`: kartu interaktif per opsi dengan icon, badge dampak, dan tombol "Terapkan Solusi".
    - _Requirements: 1.1, 1.3_
  - [x] 6.2 Integrasikan ke `BudgetResultCard.tsx` dan `PlannerWizard.tsx` dengan callback `onApplySolution` yang memperbarui form dan kalkulasi ulang.
    - _Requirements: 1.3_

- [x] 7. Peningkatan UI ChatDrawer (Contextual Quick Prompts)
  - [x] 7.1 Tambahkan quick prompt kontekstual di `ChatInterface.tsx` (misal: "Dana darurat < 3 bulan", "Anggaran defisit", "Optimasi target goal").
    - _Requirements: 2.3_
  - [x] 7.2 Tambahkan badge pill "Data finansial terhubung" (dengan dot animasi) di header ChatInterface jika profil terdeteksi.
    - _Requirements: 2.1, 2.3_

- [x] 8. UI Indikator Dana Darurat (Emergency Fund Badge)
  - [x] 8.1 Buat komponen `components/profile/EmergencyFundCard.tsx` dengan visual tier warna (`VULNERABLE` merah, `ADEQUATE` amber, `STRONG` hijau), progres terhadap target 6 bulan, rincian perhitungan ("dari mana angka ini"), skala tier + penanda posisi, kekurangan nominal, dan saran edukatif (penjelasan "kenapa" collapsible).
    - _Requirements: 3.1_
  - [x] 8.2 Tampilkan kartu kesiapan dana darurat pada Dashboard utama (`app/page.tsx`) dan halaman Profil Finansial (`app/profile/page.tsx`).
    - _Requirements: 3.1_
  - [x] 8.3 Reuse `evaluateEmergencyFund` di `lib/ai/financialContext.ts` agar tier dana darurat pada konteks AI konsisten dengan UI.
    - _Requirements: 2.1, 3.1_

- [x] 9. Checkpoint & Pengujian End-to-End
  - [x] 9.1 `npm test` — **10 tests, 3 test files** passed 100% hijau.
  - [x] 9.2 `npx tsc --noEmit` — **0 error**, TypeScript type-check lulus bersih.
