// Planner presets — logika murni (pure functions) tanpa I/O, UI, atau DB.
// Mendefinisikan tepat 3 metode penganggaran preset (50/30/20, 70/20/10, 80/20)
// beserta kategori dan penanda Savings_Bucket (isSavings). Lihat design.md →
// "Components → presets.ts" dan "Data Models → Struktur Konstanta Preset",
// serta requirements.md Requirement 3 (Acceptance Criteria 3.1–3.5, 3.7).

import type {
  BudgetPreset,
  CustomAllocation,
  FixedPresetId,
  PresetId,
} from "@/types/planner";

/**
 * Konstanta terstruktur berisi 3 metode penganggaran preset TETAP.
 *
 * Bertipe `Record<FixedPresetId, BudgetPreset>` (Req 15.1) sehingga record ini
 * tetap memuat tepat 3 preset tetap dan TIDAK memuat kunci `"custom"` — preset
 * kustom dibangun lewat `buildCustomPreset`, bukan lewat record ini.
 *
 * Invarian (Req 3.5): untuk setiap preset, jumlah `percentage` seluruh kategori
 * sama dengan 100. Kategori yang merepresentasikan Savings_Bucket ditandai
 * `isSavings: true`.
 */
export const BUDGET_PRESETS: Record<FixedPresetId, BudgetPreset> = {
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
 * TETAP yang tersedia (Req 3.7).
 *
 * Catatan (Req 15.9): `getPreset` TIDAK dipakai untuk id `"custom"`. Karena
 * `BUDGET_PRESETS` hanya memuat preset tetap, `getPreset("custom")` (atau id tak
 * dikenal lainnya) akan melempar — jalur custom memakai `buildCustomPreset`.
 */
export function getPreset(id: PresetId): BudgetPreset {
  const preset = (BUDGET_PRESETS as Record<string, BudgetPreset | undefined>)[
    id
  ];

  if (!preset) {
    throw new Error(
      `Preset tidak valid: harus salah satu dari ${Object.keys(
        BUDGET_PRESETS
      ).join(", ")}, diterima ${String(id)}.`
    );
  }

  return preset;
}

/**
 * Membangun `BudgetPreset` untuk metode penganggaran KUSTOM (Req 15.2–15.4).
 *
 * Kategori tetap tiga dan berurutan: Kebutuhan, Keinginan, Ditabung — dengan
 * **Ditabung** sebagai Savings_Bucket (`isSavings: true`). Persentase diambil
 * dari `pct` (Custom_Allocation).
 *
 * Guard (fungsi tetap murni, tanpa I/O):
 * - Setiap persentase harus angka berhingga >= 0, else melempar Error (Req 15.7).
 * - Jumlah ketiga persentase harus tepat 100 dalam toleransi epsilon
 *   `abs(sum - 100) < 1e-9`, else melempar Error (Req 15.8).
 */
export function buildCustomPreset(pct: CustomAllocation): BudgetPreset {
  const { kebutuhan, keinginan, ditabung } = pct;

  const entries: ReadonlyArray<readonly [string, number]> = [
    ["Kebutuhan", kebutuhan],
    ["Keinginan", keinginan],
    ["Ditabung", ditabung],
  ];

  for (const [name, value] of entries) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Persentase ${name} tidak valid: harus angka berhingga >= 0, diterima ${String(
          value
        )}.`
      );
    }
  }

  const sum = kebutuhan + keinginan + ditabung;
  if (Math.abs(sum - 100) >= 1e-9) {
    throw new Error(
      `Total persentase kustom harus tepat 100, diterima ${sum}.`
    );
  }

  return {
    id: "custom",
    label: "Custom",
    categories: [
      { name: "Kebutuhan", percentage: kebutuhan, isSavings: false },
      { name: "Keinginan", percentage: keinginan, isSavings: false },
      { name: "Ditabung", percentage: ditabung, isSavings: true },
    ],
  };
}
