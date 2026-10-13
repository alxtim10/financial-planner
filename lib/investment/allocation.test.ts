import { describe, it, expect } from "vitest";
import {
  applyInstrumentPreference,
  instrumentToCategory,
  getAllocation,
} from "./allocation";
import type { Allocation } from "@/types/finance";

/** Total persentase komposisi harus selalu tepat 100. */
function totalPct(a: Allocation): number {
  return a.composition.reduce((s, x) => s + x.percentage, 0);
}

describe("instrumentToCategory", () => {
  it("memetakan label gabungan ke kategori spesifik lebih dulu", () => {
    expect(instrumentToCategory("SBN/RDPT")).toBe("RDPT");
    expect(instrumentToCategory("Saham/Indeks")).toBe("Saham/Indeks");
    expect(instrumentToCategory("SBN/Deposito")).toBe("Deposito/SBN");
    expect(instrumentToCategory("RDPU")).toBe("RDPU");
    expect(instrumentToCategory("Emas/SBN Ritel")).toBe("Emas");
  });

  it("mengembalikan null untuk label tak dikenal", () => {
    expect(instrumentToCategory("Kripto")).toBeNull();
  });
});

describe("applyInstrumentPreference", () => {
  const base = getAllocation(72, "Moderat"); // ">5" Moderat: Saham/Indeks 40, SBN 40, Emas 20

  it("passthrough bila tidak ada pilihan (sistem menentukan)", () => {
    expect(applyInstrumentPreference(base, [])).toEqual(base);
    expect(applyInstrumentPreference(base, null)).toEqual(base);
    expect(applyInstrumentPreference(base, undefined)).toEqual(base);
  });

  it("tidak memutasi allocation argumen", () => {
    const snapshot = JSON.stringify(base);
    applyInstrumentPreference(base, ["Saham/Indeks"]);
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("memfilter ke subset dan menormalisasi ke total 100", () => {
    // Pilih Saham/Indeks (40) + Emas (20) → normalisasi 40:20 = 67:33.
    const res = applyInstrumentPreference(base, ["Saham/Indeks", "Emas"]);
    expect(totalPct(res)).toBe(100);
    const instruments = res.composition.map((c) => c.instrument).sort();
    expect(instruments).toEqual(["Emas", "Saham/Indeks"]);
    const saham = res.composition.find((c) => c.instrument === "Saham/Indeks")!;
    expect(saham.percentage).toBe(67);
  });

  it("satu instrumen terpilih → 100% instrumen itu", () => {
    const res = applyInstrumentPreference(base, ["Saham/Indeks"]);
    expect(res.composition).toEqual([{ instrument: "Saham/Indeks", percentage: 100 }]);
    expect(totalPct(res)).toBe(100);
  });

  it("mengabaikan nilai tak valid, pakai yang valid saja", () => {
    const res = applyInstrumentPreference(base, ["Saham/Indeks", "Kripto"]);
    expect(res.composition).toEqual([{ instrument: "Saham/Indeks", percentage: 100 }]);
  });

  it("kategori terpilih yang tak ada di matriks tetap diwakili (total 100)", () => {
    // base ">5" Moderat tidak punya RDPU; pilih Saham/Indeks + RDPU.
    const res = applyInstrumentPreference(base, ["Saham/Indeks", "RDPU"]);
    expect(totalPct(res)).toBe(100);
    const cats = res.composition.map((c) => c.instrument).sort();
    expect(cats).toEqual(["RDPU", "Saham/Indeks"]);
  });

  it("tak ada irisan dengan matriks → bagi rata semua pilihan", () => {
    const shortTerm = getAllocation(12, "Moderat"); // "<2": RDPU 100
    const res = applyInstrumentPreference(shortTerm, ["Emas", "Saham/Indeks"]);
    expect(totalPct(res)).toBe(100);
    expect(res.composition).toHaveLength(2);
    expect(res.composition[0].percentage).toBe(50);
    expect(res.composition[1].percentage).toBe(50);
  });

  it("return tahunan tetap desimal berhingga dan masuk akal", () => {
    const res = applyInstrumentPreference(base, ["Saham/Indeks"]);
    expect(Number.isFinite(res.annualReturn)).toBe(true);
    expect(res.annualReturn).toBeGreaterThan(0);
    expect(res.annualReturn).toBeLessThan(1);
  });
});
