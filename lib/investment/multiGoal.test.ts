import { describe, it, expect } from "vitest";
import { aggregateGoals, computeMultiGoalContribution } from "./multiGoal";
import { calculateMonthlyContribution } from "./projection";
import type { GoalInput, AllocationSlice } from "@/types/finance";

const COMPOSITION: AllocationSlice[] = [
  { instrument: "RDPU", percentage: 60 },
  { instrument: "SBN", percentage: 40 },
];

describe("aggregateGoals", () => {
  it("menjumlahkan target dan menghitung horizon rata-rata tertimbang (opsi A)", () => {
    const goals: GoalInput[] = [
      { targetAmount: 100_000_000, horizonMonths: 120 }, // Rumah
      { targetAmount: 50_000_000, horizonMonths: 36 }, // Mobil
    ];
    const agg = aggregateGoals(goals);
    expect(agg.totalTargetAmount).toBe(150_000_000);
    // Tertimbang: (100jt*120 + 50jt*36) / 150jt = (12_000jt + 1_800jt)/150jt = 92
    expect(agg.weightedHorizonMonths).toBe(92);
    expect(agg.goalCount).toBe(2);
  });

  it("satu tujuan → horizon = horizon tujuan itu", () => {
    const agg = aggregateGoals([{ targetAmount: 10_000_000, horizonMonths: 60 }]);
    expect(agg.totalTargetAmount).toBe(10_000_000);
    expect(agg.weightedHorizonMonths).toBe(60);
  });

  it("melempar error untuk daftar kosong", () => {
    expect(() => aggregateGoals([])).toThrow();
  });

  it("melempar error untuk horizon non-integer", () => {
    expect(() =>
      aggregateGoals([{ targetAmount: 1_000, horizonMonths: 12.5 }]),
    ).toThrow();
  });
});

describe("computeMultiGoalContribution", () => {
  it("menjumlahkan setoran per-tujuan (opsi A) dengan satu alokasi", () => {
    const goals: GoalInput[] = [
      { targetAmount: 100_000_000, horizonMonths: 120 },
      { targetAmount: 50_000_000, horizonMonths: 36 },
    ];
    const annualReturn = 0.08;
    const presentValue = 30_000_000;

    const result = computeMultiGoalContribution({
      goals,
      presentValue,
      annualReturn,
      composition: COMPOSITION,
    });

    // Rekonstruksi manual: PV dibagi proporsional target, lalu FV annuity per
    // tujuan, dijumlahkan.
    const totalTarget = 150_000_000;
    const pv1 = presentValue * (100_000_000 / totalTarget);
    const pv2 = presentValue * (50_000_000 / totalTarget);
    const c1 = calculateMonthlyContribution({
      futureValue: 100_000_000,
      presentValue: pv1,
      annualReturn,
      horizonMonths: 120,
    });
    const c2 = calculateMonthlyContribution({
      futureValue: 50_000_000,
      presentValue: pv2,
      annualReturn,
      horizonMonths: 36,
    });
    expect(result.totalMonthlyContribution).toBe(Math.round(c1 + c2));
    expect(result.perGoal).toHaveLength(2);
    expect(result.aggregated.weightedHorizonMonths).toBe(92);
  });

  it("satu tujuan identik dengan perhitungan tunggal (PV penuh)", () => {
    const goals: GoalInput[] = [{ targetAmount: 60_000_000, horizonMonths: 60 }];
    const annualReturn = 0.07;
    const presentValue = 10_000_000;

    const result = computeMultiGoalContribution({
      goals,
      presentValue,
      annualReturn,
      composition: COMPOSITION,
    });

    const single = calculateMonthlyContribution({
      futureValue: 60_000_000,
      presentValue, // PV penuh pada satu tujuan
      annualReturn,
      horizonMonths: 60,
    });
    expect(result.totalMonthlyContribution).toBe(Math.round(single));
    expect(result.perGoal[0].presentValueShare).toBeCloseTo(presentValue, 6);
  });

  it("melempar error untuk presentValue negatif", () => {
    expect(() =>
      computeMultiGoalContribution({
        goals: [{ targetAmount: 1_000, horizonMonths: 12 }],
        presentValue: -1,
        annualReturn: 0.05,
        composition: COMPOSITION,
      }),
    ).toThrow();
  });
});
