import { describe, it, expect } from "vitest";
import { evaluateEmergencyFund } from "./emergencyFund";

describe("evaluateEmergencyFund", () => {
  it("menandai VULNERABLE saat coverage < 3 bulan", () => {
    const result = evaluateEmergencyFund(15_000_000, 7_000_000); // ~2.14 bulan
    expect(result.tier).toBe("VULNERABLE");
    expect(result.coverageMonths).toBe(2.1);
    expect(result.targetMonths).toBe(6);
    expect(result.shortfallAmount).toBe(27_000_000); // 7jt*6 - 15jt
    expect(result.advisoryMessage).toContain("bawah 3 bulan");
  });

  it("menandai ADEQUATE saat 3 ≤ coverage ≤ 6 bulan", () => {
    const result = evaluateEmergencyFund(30_000_000, 7_000_000); // ~4.29 bulan
    expect(result.tier).toBe("ADEQUATE");
    expect(result.coverageMonths).toBe(4.3);
    expect(result.shortfallAmount).toBe(12_000_000);
  });

  it("menandai STRONG saat coverage > 6 bulan", () => {
    const result = evaluateEmergencyFund(49_000_000, 7_000_000); // 7.0 bulan
    expect(result.tier).toBe("STRONG");
    expect(result.coverageMonths).toBe(7);
    expect(result.shortfallAmount).toBe(0);
  });

  it("konsisten di batas kelipatan tepat 3 dan 6 bulan", () => {
    // Tepat 3 bulan → ADEQUATE (batas bawah inklusif).
    expect(evaluateEmergencyFund(21_000_000, 7_000_000).tier).toBe("ADEQUATE");
    // Tepat 6 bulan → ADEQUATE (batas atas inklusif, Requirement 3.1).
    expect(evaluateEmergencyFund(42_000_000, 7_000_000).tier).toBe("ADEQUATE");
    // Sedikit di atas 6 bulan → STRONG.
    expect(evaluateEmergencyFund(42_700_001, 7_000_000).tier).toBe("STRONG");
    // Sedikit di bawah 3 bulan → VULNERABLE.
    expect(evaluateEmergencyFund(20_999_999, 7_000_000).tier).toBe("VULNERABLE");
  });

  it("mengembalikan tier netral saat pengeluaran 0 / tidak valid", () => {
    for (const expense of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = evaluateEmergencyFund(10_000_000, expense);
      expect(result.tier).toBe("ADEQUATE");
      expect(result.coverageMonths).toBe(0);
      expect(result.shortfallAmount).toBe(0);
      expect(result.advisoryMessage).toContain("Belum ada data pengeluaran");
    }
  });

  it("memperlakukan tabungan tidak valid/negatif sebagai 0", () => {
    const result = evaluateEmergencyFund(-5_000_000, 5_000_000);
    expect(result.coverageMonths).toBe(0);
    expect(result.tier).toBe("VULNERABLE");
    expect(result.shortfallAmount).toBe(30_000_000);
  });
});
