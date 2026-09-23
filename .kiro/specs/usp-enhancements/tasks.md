# Implementation Plan: USP Enhancements (Trade-Off Optimizer & Context-Aware AI Copilot)

## Overview

Rencana implementasi ini mengeksekusi fitur pembeda utama (**Unique Selling Point**) untuk **TabungOne**. Task disusun secara modular mengikuti metodologi Kiro: definisi tipe $\rightarrow$ logika murni berdasar TDD $\rightarrow$ endpoint API $\rightarrow$ komponen antarmuka (UI) $\rightarrow$ verifikasi terintegrasi.

---

## Tasks

- [ ] 1. Definisikan tipe domain USP & modul finansial
  - Buat `types/usp.ts` berisi `TradeOffType`, `TradeOffOption`, `TradeOffInput`, `EmergencyFundTier`, `EmergencyFundAnalysis`, dan `FinancialTwinSnapshot`.
  - Export tipe dari index jika relevan agar konsisten dengan `types/planner.ts` dan `types/investment.ts`.
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Modul logika murni Trade-Off Optimizer (TDD)
  - [ ] 2.1 Implementasikan `lib/planner/tradeoffs.ts`: fungsi murni `computeTradeOffs(input: TradeOffInput)` yang menghasilkan opsi `EXTEND_HORIZON`, `REDUCE_TARGET`, dan `REDUCE_WANTS`.
    - _Requirements: 1.1, 1.2_
  - [ ] 2.2 Buat unit test `lib/planner/tradeoffs.test.ts` menggunakan Vitest: uji kalkulasi horizon baru, target baru, handling input nol/negatif, dan kasus kelayakan ketat vs mustahil.
    - _Requirements: 1.2_

- [ ] 3. Modul logika murni Emergency Fund Waterfall (TDD)
  - [ ] 3.1 Implementasikan `lib/financial/emergencyFund.ts`: fungsi `evaluateEmergencyFund(currentSavings: number, expense: number)` untuk klasifikasi tier (`VULNERABLE`, `ADEQUATE`, `STRONG`) dan pesan edukasi.
    - _Requirements: 3.1_
  - [ ] 3.2 Buat unit test `lib/financial/emergencyFund.test.ts` untuk menguji coverage threshold (<3 bulan, 3-6 bulan, >6 bulan, dan pengeluaran 0).
    - _Requirements: 3.1_

- [ ] 4. Injeksi Konteks Finansial Cerdas pada AI Chatbot
  - [ ] 4.1 Buat helper `lib/ai/financialContext.ts`: fungsi `getFinancialTwinContext()` yang membaca `FinancialProfile`, `Goal` aktif, `RiskAssessment`, dan `BudgetPlan` terbaru dari Prisma, lalu menyusun prompt naratif terstruktur.
    - _Requirements: 2.1_
  - [ ] 4.2 Perbarui `app/api/chat/route.ts` untuk menyisipkan prompt konteks finansial pengguna ke dalam `systemInstruction` Gemini API secara asinkron sebelum streaming dimulai.
    - _Requirements: 2.1, 2.2_

- [ ] 5. Integrasi API Planner `/api/budget` dengan Trade-Off Engine
  - [ ] 5.1 Perbarui handler POST di `app/api/budget/route.ts` untuk memanggil `computeTradeOffs` saat status kelayakan `tight` atau `impossible`, dan sertakan array `tradeOffs` dalam JSON respons.
    - _Requirements: 1.1, 1.2_
  - [ ] 5.2 Pastikan backward compatibility pada respons API `/api/budget` bagi pemanggil yang sudah ada.
    - _Requirements: 1.1_

- [ ] 6. Komponen UI Trade-Off Optimizer (1-Click Apply)
  - [ ] 6.1 Buat `components/planner/TradeOffCards.tsx`: kartu interaktif dengan styling Tailwind, perbandingan nilai lama vs baru, dan tombol aksi "Terapkan Solusi".
    - _Requirements: 1.1, 1.3_
  - [ ] 6.2 Integrasikan `TradeOffCards` ke dalam `components/planner/BudgetResultCard.tsx` dan `components/planner/PlannerWizard.tsx` untuk menghubungkan callback `onApplySolution` yang memicu pembaruan input form dan kalkulasi ulang.
    - _Requirements: 1.3_

- [ ] 7. Peningkatan UI ChatDrawer (Contextual Quick Prompts)
  - [ ] 7.1 Tambahkan baris tombol *Quick Prompt* pintar di `components/ChatDrawer.tsx` yang secara dinamis menyarankan pertanyaan kontekstual (misal evaluasi dana darurat, optimasi budget, atau strategi investasi).
    - _Requirements: 2.3_
  - [ ] 7.2 Tambahkan visual badge status *"Financial Context Synced"* pada header ChatDrawer agar pengguna mengetahui bahwa data aktif mereka telah terhubung.
    - _Requirements: 2.1, 2.3_

- [ ] 8. UI Indikator Dana Darurat (Emergency Fund Badge)
  - [ ] 8.1 Buat komponen `components/profile/EmergencyFundCard.tsx` atau badge indikator kesiapan dana darurat dengan visual tier warna yang jelas.
    - _Requirements: 3.1_
  - [ ] 8.2 Tampilkan ringkasan kesiapan dana darurat pada Dashboard utama (`app/page.tsx`) dan halaman Profil Finansial (`app/profile/page.tsx`).
    - _Requirements: 3.1_

- [ ] 9. Checkpoint & Pengujian End-to-End
  - [ ] 9.1 Jalankan seluruh unit test dengan `npm test` untuk memastikan semua modul logika murni hijau 100%.
  - [ ] 9.2 Lakukan verifikasi build dan alur UI interaktif: simulasi status budget impossible $\rightarrow$ pilih trade-off $\rightarrow$ pastikan form ter-update dan kalkulasi ulang berjalan mulus; uji tanya-jawab kontekstual di ChatDrawer.
