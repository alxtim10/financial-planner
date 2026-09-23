// Planner goal-driven — logika murni (pure function) tanpa I/O, UI, atau DB.
// Menghitung alokasi Ditabung/Kebutuhan/Keinginan + persentase turunan +
// alreadyReached + feasibility dari input goal-driven. Akumulasi murni
// (tanpa bunga/pertumbuhan): Ditabung = max(0, Target − Savings) / Months_N.
//
// Lihat design.md → "Fungsi Murni lib/planner/goalBudget.ts" dan
// requirements.md Requirement 17 (17.6–17.10), Requirement 18 (18.1–18.8),
// Requirement 19 (19.1), dan Requirement 20 (20.1–20.5).
//
// TIPE SAJA yang diimpor dari `@/types/planner`. Modul ini SENGAJA TIDAK
// mengimpor `presets.ts`/`budget.ts`/`savingsProjection.ts` (disuperseksi).

import type {
  BudgetLine,
  GoalBudgetInput,
  GoalBudgetResult,
  GoalFeasibility,
} from "@/types/planner";

/**
 * Menghitung `GoalBudgetResult` dari input goal-driven (`GoalBudgetInput`).
 *
 * Model akumulasi murni (no growth): pengguna memberi `monthlyIncome`,
 * `targetAmount`, `horizonMonths`, dan profil menyuplai `currentSavings` +
 * `monthlyExpense`. Sistem menghitung `Ditabung` yang harus disisihkan tiap
 * bulan, lalu menurunkan persentase (`Derived_Percentage`) sebagai OUTPUT.
 *
 * Guard (throw Error, pesan Bahasa Indonesia) — Req 17.6–17.10:
 * - `monthlyIncome` berhingga > 0
 * - `currentSavings` berhingga >= 0
 * - `targetAmount` berhingga > 0
 * - `horizonMonths` bilangan bulat (`Number.isInteger`) & > 0
 * - `monthlyExpense` berhingga >= 0
 *
 * Nilai hasil disimpan presisi; pembulatan hanya di lapisan tampilan (Req
 * 18.7, 19.3). Satu-satunya pembulatan di sini adalah rasio fallback
 * `kebutuhan` (Math.round) sesuai Req 18.5.
 */
export function computeGoalBudget(input: GoalBudgetInput): GoalBudgetResult {
  const {
    monthlyIncome,
    currentSavings,
    targetAmount,
    horizonMonths,
    monthlyExpense,
  } = input;

  // 1. Guard input (Req 17.6–17.10).
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    throw new Error(
      `Pemasukan bulanan tidak valid: harus angka berhingga yang lebih besar dari nol, diterima ${String(
        monthlyIncome
      )}.`
    );
  }
  if (!Number.isFinite(currentSavings) || currentSavings < 0) {
    throw new Error(
      `Tabungan saat ini tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        currentSavings
      )}.`
    );
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error(
      `Target dana tidak valid: harus angka berhingga yang lebih besar dari nol, diterima ${String(
        targetAmount
      )}.`
    );
  }
  if (!Number.isInteger(horizonMonths) || horizonMonths <= 0) {
    throw new Error(
      `Jangka waktu (bulan) tidak valid: harus bilangan bulat positif, diterima ${String(
        horizonMonths
      )}.`
    );
  }
  if (!Number.isFinite(monthlyExpense) || monthlyExpense < 0) {
    throw new Error(
      `Pengeluaran bulanan tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        monthlyExpense
      )}.`
    );
  }

  // 2. Months_N — jangka waktu sudah dalam bulan (Req 18.1).
  const monthsN = horizonMonths;

  // 3. Ditabung — akumulasi murni per bulan, tak pernah negatif (Req 18.2).
  const ditabung = Math.max(0, targetAmount - currentSavings) / monthsN;

  // 4. Already_Reached — bila benar, ditabung sudah 0 secara alami (Req 18.3).
  const alreadyReached = currentSavings >= targetAmount;

  // 5. Kebutuhan — dari expense atau rasio fallback (Req 18.4, 18.5).
  const kebutuhan =
    Number.isFinite(monthlyExpense) && monthlyExpense > 0
      ? monthlyExpense
      : Math.round(0.65 * (monthlyIncome - ditabung));

  // 6. Keinginan — bisa negatif, dipakai feasibility (Req 18.6).
  const keinginan = monthlyIncome - ditabung - kebutuhan;

  // 7. Derived_Percentage (Req 19.1). monthlyIncome > 0 dijamin guard.
  const ditabungPct = (ditabung / monthlyIncome) * 100;
  const kebutuhanPct = (kebutuhan / monthlyIncome) * 100;
  const keinginanPct = (keinginan / monthlyIncome) * 100;

  // 8. Lines — urutan Kebutuhan, Keinginan, Ditabung (Req 18.8, 19.2, 20.5).
  const lines: BudgetLine[] = [
    {
      name: "Kebutuhan",
      percentage: kebutuhanPct,
      amount: kebutuhan,
      isSavings: false,
    },
    {
      name: "Keinginan",
      percentage: keinginanPct,
      amount: keinginan,
      isSavings: false,
    },
    {
      name: "Ditabung",
      percentage: ditabungPct,
      amount: ditabung,
      isSavings: true,
    },
  ];

  // 9. Feasibility — aturan tunggal yang konsisten (Req 20.1–20.4):
  //    - impossible IFF ditabung > monthlyIncome
  //    - jika bukan impossible: feasible = (ditabung + kebutuhan <= monthlyIncome)
  //    - severity = "ok" IFF (feasible === true AND keinginan >= 0.05*monthlyIncome),
  //      selain itu severity = "tight".
  const AMBANG = 0.05 * monthlyIncome;
  let feasibility: GoalFeasibility;
  if (ditabung > monthlyIncome) {
    feasibility = {
      feasible: false,
      severity: "impossible",
      reason:
        "Target ini belum realistis: menabung sebesar ini saja sudah melebihi pemasukan bulanan. Perpanjang jangka waktu atau turunkan target.",
    };
  } else {
    const feasible = ditabung + kebutuhan <= monthlyIncome;
    const isOk = feasible && keinginan >= AMBANG;
    if (isOk) {
      feasibility = { feasible: true, severity: "ok", reason: "" };
    } else {
      feasibility = {
        feasible,
        severity: "tight",
        reason:
          "Anggaran ketat: hampir tidak ada sisa untuk keinginan setelah kebutuhan dan tabungan. Pertimbangkan memperpanjang jangka waktu atau menurunkan target.",
      };
    }
  }

  // 10. Presisi dijaga (Req 18.7, 19.3): tidak ada pembulatan selain fallback
  //     kebutuhan (Math.round) di langkah 5. Pembulatan tampilan di UI.
  return {
    monthlyIncome,
    monthsN,
    ditabung,
    kebutuhan,
    keinginan,
    ditabungPct,
    kebutuhanPct,
    keinginanPct,
    lines,
    alreadyReached,
    feasibility,
  };
}
