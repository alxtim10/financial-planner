-- Multi-tujuan: tautkan BudgetPlan ke Goal tertentu.
-- Nullable: null berarti rencana dihitung dari mode "pilih semua"/multi-tujuan
-- (tidak terikat satu Goal). Aman untuk baris lama (otomatis NULL).
ALTER TABLE "BudgetPlan" ADD COLUMN "goalId" TEXT;
