import { describe, it, expect } from "vitest";
import { netProfit, formatBDT } from "@/lib/data";

describe("finance rules", () => {
  it("net profit = gross profit sum minus expense sum", () => {
    expect(
      netProfit(
        [{ Gross_Profit_BDT: "500000" }, { Gross_Profit_BDT: "250000" }],
        [{ Amount_BDT: "100000" }],
      ),
    ).toBe(650000);
  });
  it("formats lakh and crore", () => {
    expect(formatBDT(250000)).toBe("৳2.50 L");
    expect(formatBDT(32000000)).toBe("৳3.20 Cr");
  });
});
