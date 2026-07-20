import { describe, expect, it } from "vitest";
import { calculateScenario } from "./calculate";
import { applyDriverOverrides, calculateWithOverrides } from "./overrides";
import { blueberryZimbabweBaseCase } from "./seed/blueberryZimbabwe";

describe("driver overrides helper", () => {
  it("returns identical results when no overrides are given", () => {
    const base = calculateScenario(blueberryZimbabweBaseCase);
    const overridden = calculateWithOverrides(blueberryZimbabweBaseCase, {});
    expect(overridden.kpis).toEqual(base.kpis);
  });

  it("does not mutate the original input", () => {
    const snapshot = JSON.stringify(blueberryZimbabweBaseCase);
    applyDriverOverrides(blueberryZimbabweBaseCase, {
      sellingPricePerKg: 7,
      yieldYear1: 10,
      interestRatePA: 0.2,
      rentalPercentOfHarvestGross: 0.15,
    });
    expect(JSON.stringify(blueberryZimbabweBaseCase)).toBe(snapshot);
  });

  it("scales revenue linearly with the selling price override", () => {
    const base = calculateScenario(blueberryZimbabweBaseCase);
    const doubled = calculateWithOverrides(blueberryZimbabweBaseCase, {
      sellingPricePerKg: blueberryZimbabweBaseCase.sellingPricePerKg * 2,
    });
    expect(doubled.kpis.fiveYearRevenue).toBeCloseTo(
      base.kpis.fiveYearRevenue * 2,
      6,
    );
  });
});
