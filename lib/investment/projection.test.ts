import { describe, it, expect } from "vitest";
import { calculateMonthlyContribution, projectInvestment } from "./projection";
import type { AllocationSlice } from "@/types/finance";

const composition: AllocationSlice[] = [
  { instrument: "Saham/Indeks", percentage: 70 },
  { instrument: "SBN", percentage: 20 },
  { instrument: "Emas", percentage: 10 },
];

describe("projectInvestment", () => {
  it("futureValue ≈ target saat PMT dihitung dari target yang sama", () => {
    const targetAmount = 100_000_000;
    const presentValue = 10_000_000;
    const annualReturn = 0.11;
    const horizonMonths = 60;

    const pmt = calculateMonthlyContribution({
      futureValue: targetAmount,
      presentValue,
      annualReturn,
      horizonMonths,
    });

    const proj = projectInvestment({
      presentValue,
      monthlyContribution: pmt,
      annualReturn,
      horizonMonths,
      composition,
    });

    // FV terproyeksi harus mendekati target (toleransi pembulatan Rupiah).
    expect(Math.abs(proj.futureValue - targetAmount)).toBeLessThanOrEqual(5);
  });

  it("totalContributed = PV + PMT*n dan totalGrowth = FV - contributed", () => {
    const proj = projectInvestment({
      presentValue: 5_000_000,
      monthlyContribution: 1_000_000,
      annualReturn: 0.08,
      horizonMonths: 24,
      composition,
    });

    expect(proj.totalContributed).toBe(5_000_000 + 1_000_000 * 24);
    expect(proj.totalGrowth).toBe(proj.futureValue - proj.totalContributed);
    expect(proj.totalGrowth).toBeGreaterThan(0); // ada pertumbuhan karena return>0
  });

  it("fallback linear saat return 0: FV = PV + PMT*n, pertumbuhan 0", () => {
    const proj = projectInvestment({
      presentValue: 2_000_000,
      monthlyContribution: 500_000,
      annualReturn: 0,
      horizonMonths: 12,
      composition,
    });
    expect(proj.futureValue).toBe(2_000_000 + 500_000 * 12);
    expect(proj.totalGrowth).toBe(0);
  });

  it("porsi setoran per instrumen berjumlah tepat = round(PMT)", () => {
    const pmt = 1_234_567;
    const proj = projectInvestment({
      presentValue: 0,
      monthlyContribution: pmt,
      annualReturn: 0.1,
      horizonMonths: 36,
      composition,
    });
    const sum = proj.perInstrument.reduce((s, x) => s + x.monthlyAmount, 0);
    expect(sum).toBe(Math.round(pmt));
    expect(proj.perInstrument).toHaveLength(3);
  });

  it("return per instrumen diambil dari kategori (Saham/Indeks lebih tinggi dari Emas)", () => {
    const proj = projectInvestment({
      presentValue: 0,
      monthlyContribution: 1_000_000,
      annualReturn: 0.09,
      horizonMonths: 60,
      composition,
    });
    const saham = proj.perInstrument.find((p) => p.instrument === "Saham/Indeks")!;
    const emas = proj.perInstrument.find((p) => p.instrument === "Emas")!;
    expect(saham.annualReturn).toBeGreaterThan(emas.annualReturn);
  });

  it("menolak input tidak valid", () => {
    expect(() =>
      projectInvestment({
        presentValue: -1,
        monthlyContribution: 100,
        annualReturn: 0.05,
        horizonMonths: 12,
        composition,
      }),
    ).toThrow();
    expect(() =>
      projectInvestment({
        presentValue: 0,
        monthlyContribution: 100,
        annualReturn: 0.05,
        horizonMonths: 0,
        composition,
      }),
    ).toThrow();
  });
});
