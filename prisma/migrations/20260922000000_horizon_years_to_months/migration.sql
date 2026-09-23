-- Ubah satuan jangka waktu dari TAHUN ke BULAN.
-- Rename kolom + konversi data lama (×12) agar nilai tetap setara.

-- Goal.horizonYears (tahun) → Goal.horizonMonths (bulan)
ALTER TABLE "Goal" RENAME COLUMN "horizonYears" TO "horizonMonths";
UPDATE "Goal" SET "horizonMonths" = "horizonMonths" * 12;

-- BudgetPlan.savingsHorizonYears (tahun) → BudgetPlan.savingsHorizonMonths (bulan)
ALTER TABLE "BudgetPlan" RENAME COLUMN "savingsHorizonYears" TO "savingsHorizonMonths";
UPDATE "BudgetPlan" SET "savingsHorizonMonths" = "savingsHorizonMonths" * 12
WHERE "savingsHorizonMonths" IS NOT NULL;
