import { describe, expect, it } from "vitest";

import { formatAmount, scaleAmount } from "./format";

describe("scaleAmount", () => {
  it("scales linearly from base servings", () => {
    expect(scaleAmount(400, 4, 2)).toBe(200);
    expect(scaleAmount(400, 4, 6)).toBe(600);
    expect(scaleAmount(1, 2, 3)).toBe(1.5);
  });

  it("returns the original amount for invalid base servings", () => {
    expect(scaleAmount(400, 0, 2)).toBe(400);
  });
});

describe("formatAmount", () => {
  it("uses German decimal comma and drops trailing zeros", () => {
    expect(formatAmount(1.5)).toBe("1,5");
    expect(formatAmount(200)).toBe("200");
    expect(formatAmount(0.333333)).toBe("0,33");
  });
});
