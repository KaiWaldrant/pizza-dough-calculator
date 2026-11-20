import { describe, expect, it } from "vitest";
import { formatPercentage } from "./formatPercentage";

describe("formatPercentage", () => {
  it("keeps two significant digits", () => {
    expect(formatPercentage(0.084321)).toBe("0.084");
    expect(formatPercentage(1.234)).toBe("1.2");
  });

  it("keeps very small percentages from rounding to nothing", () => {
    expect(formatPercentage(0.000504)).toBe("0.0005");
  });

  it("drops trailing zeros", () => {
    expect(formatPercentage(0.07)).toBe("0.07");
    expect(formatPercentage(62)).toBe("62");
  });
});
