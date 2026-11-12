import { describe, expect, it } from "vitest";
import { formatCanonical, fromCanonical, toCanonical } from "@/lib/units";

describe("unit conversions", () => {
  it("US short ton is 907.18474 kg (not a long ton)", () => {
    expect(toCanonical(1, "mass_t", "short_ton")).toBeCloseTo(0.90718474, 12);
  });
  it("hp → kW", () => {
    expect(toCanonical(1, "power", "hp")).toBeCloseTo(0.745699872, 12);
  });
  it("US gpm → L/min", () => {
    expect(toCanonical(1, "flow", "gpm")).toBeCloseTo(3.785411784, 12);
  });
  it("psi → bar", () => {
    expect(toCanonical(1, "pressure", "psi")).toBeCloseTo(0.0689475729, 12);
  });
  it("lb → kg and in → mm", () => {
    expect(toCanonical(1, "mass_kg", "lb")).toBeCloseTo(0.45359237, 12);
    expect(toCanonical(1, "length", "in")).toBe(25.4);
  });
  it("round-trips without loss beyond float precision", () => {
    for (const [dim, unit, v] of [
      ["flow", "gpm", 34.3],
      ["pressure", "psi", 3045],
      ["mass_t", "short_ton", 9.25],
      ["power", "hp", 68],
    ] as const) {
      expect(fromCanonical(toCanonical(v, dim, unit), dim, unit)).toBeCloseTo(v, 9);
    }
  });
  it("display rounding does not affect canonical values", () => {
    expect(formatCanonical(129.9999, "flow", "metric")).toBe("130 L/min");
    expect(formatCanonical(100, "flow", "us")).toBe("26.4 US gpm");
    expect(formatCanonical(8.4, "mass_t", "us")).toBe("9.26 US tons");
  });
  it("rejects unknown units", () => {
    expect(() => toCanonical(1, "flow", "barrels")).toThrow();
  });
});
