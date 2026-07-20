import type { DriverOverrides } from "@/engine/overrides";
import type { ScenarioInput } from "@/engine/types";

export type DriverKey = keyof Required<DriverOverrides>;

/**
 * One "driver" — a key model assumption exposed on the Drivers page.
 * Slider guardrails (`min`/`max`/`step`) are in display units; `toModel` /
 * `fromModel` convert between display units (e.g. 13%) and model units
 * (e.g. 0.13).
 */
export interface DriverDef {
  key: DriverKey;
  name: string;
  /** One plain-language sentence: what this means on the farm. */
  explanation: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
  fromModel: (modelValue: number) => number;
  toModel: (displayValue: number) => number;
  getModelValue: (input: ScenarioInput) => number;
  format: (displayValue: number) => string;
}

const identity = (value: number): number => value;
const toPercent = (value: number): number => value * 100;
const fromPercent = (value: number): number => value / 100;

/** All eight drivers, with the guardrails specified in SPEC Section 14.1. */
export const DRIVER_DEFS: DriverDef[] = [
  {
    key: "sellingPricePerKg",
    name: "Selling price",
    explanation:
      "What you get paid per kg at the farm gate, after grading.",
    unit: "$/kg",
    min: 2,
    max: 10,
    step: 0.1,
    fromModel: identity,
    toModel: identity,
    getModelValue: (input) => input.sellingPricePerKg,
    format: (v) => `$${v.toFixed(2)}/kg`,
  },
  {
    key: "yieldYear1",
    name: "Year 1 yield",
    explanation:
      "Tonnes each hectare produces in its first harvest season, while the plants are still young.",
    unit: "t/ha",
    min: 2,
    max: 12,
    step: 0.5,
    fromModel: identity,
    toModel: identity,
    getModelValue: (input) => input.yieldCurve.year1,
    format: (v) => `${v} t/ha`,
  },
  {
    key: "yieldYear2",
    name: "Year 2 yield",
    explanation:
      "Tonnes per hectare in the second harvest season, as the plants fill out.",
    unit: "t/ha",
    min: 6,
    max: 20,
    step: 0.5,
    fromModel: identity,
    toModel: identity,
    getModelValue: (input) => input.yieldCurve.year2,
    format: (v) => `${v} t/ha`,
  },
  {
    key: "yieldYear3plus",
    name: "Year 3+ yield",
    explanation:
      "Tonnes per hectare once the plants are fully mature, from the third season onward.",
    unit: "t/ha",
    min: 8,
    max: 30,
    step: 0.5,
    fromModel: identity,
    toModel: identity,
    getModelValue: (input) => input.yieldCurve.year3plus,
    format: (v) => `${v} t/ha`,
  },
  {
    key: "interestRatePA",
    name: "Loan interest rate",
    explanation:
      "What the bank charges per year on the working-capital loan balance.",
    unit: "% p.a.",
    min: 5,
    max: 25,
    step: 0.5,
    fromModel: toPercent,
    toModel: fromPercent,
    getModelValue: (input) => input.loan.interestRatePA,
    format: (v) => `${v}% p.a.`,
  },
  {
    key: "repaymentStartMonth",
    name: "Repayment start",
    explanation:
      "The model month when loan repayments begin — until then the farm only pays interest (13 means a 12-month holiday).",
    unit: "model month",
    min: 6,
    max: 24,
    step: 1,
    integer: true,
    fromModel: identity,
    toModel: identity,
    getModelValue: (input) => input.loan.repaymentStartMonth,
    format: (v) => `month ${v}`,
  },
  {
    key: "rentalPercentOfHarvestGross",
    name: "Rental share",
    explanation:
      "The landowner's share of each season's gross harvest income, paid once a year in October.",
    unit: "% of harvest gross",
    min: 0,
    max: 20,
    step: 0.5,
    fromModel: toPercent,
    toModel: fromPercent,
    getModelValue: (input) => input.rental.percentOfHarvestGross,
    format: (v) => `${v}%`,
  },
  {
    key: "annualCostInflation",
    name: "Cost inflation",
    explanation:
      "How much everyday running costs (wages, fuel, packaging…) rise each year.",
    unit: "% per year",
    min: 0,
    max: 15,
    step: 0.5,
    fromModel: toPercent,
    toModel: fromPercent,
    getModelValue: (input) => input.annualCostInflation,
    format: (v) => `${v}% per year`,
  },
];

/** Clamp a display value to a driver's guardrails (and round integer drivers). */
export function clampToGuardrails(def: DriverDef, displayValue: number): number {
  const clamped = Math.min(def.max, Math.max(def.min, displayValue));
  return def.integer ? Math.round(clamped) : clamped;
}

export type DriverValues = Record<DriverKey, number>;

/** Read all saved driver values from a scenario input, in display units. */
export function driverValuesFromInput(input: ScenarioInput): DriverValues {
  const values = {} as DriverValues;
  for (const def of DRIVER_DEFS) {
    values[def.key] = def.fromModel(def.getModelValue(input));
  }
  return values;
}

/** Convert display-unit driver values into engine overrides (model units). */
export function overridesFromValues(values: DriverValues): DriverOverrides {
  const overrides: DriverOverrides = {};
  for (const def of DRIVER_DEFS) {
    overrides[def.key] = def.toModel(values[def.key]);
  }
  return overrides;
}
