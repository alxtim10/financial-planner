import { describe, it, expect } from "vitest";

// Smoke test untuk memastikan runner Vitest berfungsi.
describe("vitest smoke test", () => {
  it("menjalankan runner dengan benar", () => {
    expect(1 + 1).toBe(2);
  });
});
