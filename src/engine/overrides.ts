import { calculateScenario } from "./calculate";
import type { ScenarioInput, ScenarioResult } from "./types";

/**
 * The scalar assumptions exposed as "drivers" on the Drivers page.
 * All values are in model units (decimals for rates, t/ha for yields).
 */
export interface DriverOverrides {
  sellingPricePerKg?: number;
  annualCostInflation?: number;
  yieldYear1?: number;
  yieldYear2?: number;
  yieldYear3plus?: number;
  interestRatePA?: number;
  repaymentStartMonth?: number;
  rentalPercentOfHarvestGross?: number;
}

/**
 * Return a new ScenarioInput with the given driver values swapped in.
 * Pure and non-mutating — the original input is left untouched. No formula
 * changes: this only builds a different input for the unchanged engine.
 */
export function applyDriverOverrides(
  input: ScenarioInput,
  overrides: DriverOverrides,
): ScenarioInput {
  return {
    ...input,
    sellingPricePerKg: overrides.sellingPricePerKg ?? input.sellingPricePerKg,
    annualCostInflation:
      overrides.annualCostInflation ?? input.annualCostInflation,
    yieldCurve: {
      year1: overrides.yieldYear1 ?? input.yieldCurve.year1,
      year2: overrides.yieldYear2 ?? input.yieldCurve.year2,
      year3plus: overrides.yieldYear3plus ?? input.yieldCurve.year3plus,
    },
    loan: {
      interestRatePA: overrides.interestRatePA ?? input.loan.interestRatePA,
      repaymentStartMonth:
        overrides.repaymentStartMonth ?? input.loan.repaymentStartMonth,
    },
    rental: {
      ...input.rental,
      percentOfHarvestGross:
        overrides.rentalPercentOfHarvestGross ??
        input.rental.percentOfHarvestGross,
    },
  };
}

/** Run the (unchanged) engine on an input with driver overrides applied. */
export function calculateWithOverrides(
  input: ScenarioInput,
  overrides: DriverOverrides,
): ScenarioResult {
  return calculateScenario(applyDriverOverrides(input, overrides));
}
