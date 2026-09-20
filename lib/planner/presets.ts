// Planner presets — logika murni (pure functions) tanpa I/O, UI, atau DB.
// Mendefinisikan tepat 3 metode penganggaran preset (50/30/20, 70/20/10, 80/20)
// beserta kategori dan penanda Savings_Bucket (isSavings). Lihat design.md →
// "Components → presets.ts" dan "Data Models → Struktur Konstanta Preset",
// serta requirements.md Requirement 3 (Acceptance Criteria 3.1–3.5, 3.7).

import type { BudgetPreset, PresetId } from "@/types/planner";

/**
 * Konstanta terstruktur berisi 3 metode penganggaran preset.
 *
 * Invarian (Req 3.5): untuk setiap preset, jumlah `percentage` seluruh kategori
 * sama dengan 100. Kategori yang merepresentasikan Savings_Bucket ditandai
 * `isSavings: true`.
 */
export const BUDGET_PRESETS: Record<PresetId, BudgetPreset> = {
  "50/30/20": {
    id: "50/30/20",
    label: "50/30/20",
    categories: [
      { name: "Kebutuhan", percentage: 50, isSavings: false },
      { name: "Keinginan", percentage: 30, isSavings: false },
      { name: "Tabungan & Investasi", percentage: 20, isSavings: true },
    ],
  },
  "70/20/10": {
    id: "70/20/10",
    label: "70/20/10",
    categories: [
      { name: "Kebutuhan", percentage: 70, isSavings: false },
      { name: "Tabungan", percentage: 20, isSavings: true },
      { name: "Keinginan", percentage: 10, isSavings: false },
    ],
  },
  "80/20": {
    id: "80/20",
    label: "80/20",
    categories: [
      { name: "Pengeluaran", percentage: 80, isSavings: false },
      { name: "Tabungan", percentage: 20, isSavings: true },
    ],
  },
};

/**
 * Mengambil `BudgetPreset` berdasarkan `id`.
 *
 * Walaupun `PresetId` bertipe ketat, id bisa berasal dari API/JSON saat runtime,
 * sehingga tetap dijaga: melempar Error bila id bukan salah satu dari tiga preset
 * yang tersedia (Req 3.7).
 */
export function getPreset(id: PresetId): BudgetPreset {
  const preset = BUDGET_PRESETS[id];

  if (!preset) {
    throw new Error(
      `Preset tidak valid: harus salah satu dari ${Object.keys(
        BUDGET_PRESETS
      ).join(", ")}, diterima ${String(id)}.`
    );
  }

  return preset;
}
