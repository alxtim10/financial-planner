import { describe, it, expect } from "vitest";
import { computeTradeOffs } from "./tradeoffs";
import type { TradeOffInput } from "@/types/usp";

describe("computeTradeOffs", () => {
  it("menghasilkan opsi perpanjang waktu dan penyesuaian target pada skenario impossible", () => {
    const input: TradeOffInput = {
      monthlyIncome: 10000000,
      monthlyExpense: 6000000,
      currentSavings: 0,
      targetAmount: 100000000,
      horizonMonths: 12,
      ditabung: 8333333,
      kebutuhan: 6000000,
      keinginan: -4333333,
    };

    const options = computeTradeOffs(input);
    expect(options.length).toBeGreaterThanOrEqual(2);

    const extendOption = options.find((o) => o.type === "EXTEND_HORIZON");
    expect(extendOption).toBeDefined();
    expect(extendOption?.suggestedValue).toBeGreaterThan(12);
    expect(extendOption?.actionPayload.horizonMonths).toBeDefined();

    const reduceOption = options.find((o) => o.type === "REDUCE_TARGET");
    expect(reduceOption).toBeDefined();
    expect(reduceOption?.suggestedValue).toBeLessThan(100000000);
    expect(reduceOption?.suggestedValue).toBeGreaterThan(0);
    expect(reduceOption?.actionPayload.targetAmount).toBeDefined();
  });

  it("menghasilkan opsi pangkas pengeluaran bila pengeluaran memakan porsi besar", () => {
    const input: TradeOffInput = {
      monthlyIncome: 10000000,
      monthlyExpense: 7500000,
      currentSavings: 0,
      targetAmount: 30000000,
      horizonMonths: 12,
      ditabung: 2500000,
      kebutuhan: 7500000,
      keinginan: 0,
    };

    const options = computeTradeOffs(input);
    const reduceWants = options.find((o) => o.type === "REDUCE_WANTS");
    expect(reduceWants).toBeDefined();
    expect(reduceWants?.suggestedValue).toBeLessThan(7500000);
  });

  it("mengembalikan array kosong jika input tidak valid atau target sudah tercapai", () => {
    expect(
      computeTradeOffs({
        monthlyIncome: 0,
        monthlyExpense: 1000,
        currentSavings: 0,
        targetAmount: 1000,
        horizonMonths: 10,
        ditabung: 100,
        kebutuhan: 1000,
        keinginan: 0,
      }),
    ).toEqual([]);

    expect(
      computeTradeOffs({
        monthlyIncome: 10000000,
        monthlyExpense: 3000000,
        currentSavings: 50000000,
        targetAmount: 20000000,
        horizonMonths: 12,
        ditabung: 0,
        kebutuhan: 3000000,
        keinginan: 7000000,
      }),
    ).toEqual([]);
  });
});
