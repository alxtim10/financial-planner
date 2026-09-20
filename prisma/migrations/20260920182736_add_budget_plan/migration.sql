-- CreateTable
CREATE TABLE "BudgetPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "presetId" TEXT NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "manualSavingsTarget" DOUBLE PRECISION,
    "investmentContribution" DOUBLE PRECISION,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetPlan_pkey" PRIMARY KEY ("id")
);
