import { z } from "zod";
import { MONTH_NAMES } from "@/engine/types";

const monthNameSchema = z.enum(MONTH_NAMES);

const blockSchema = z.object({
  name: z.string().min(1, "Block name is required"),
  areaHa: z.number().positive("Area must be greater than zero"),
  plantingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Planting date must be the first day of a month"),
});

const yieldCurveSchema = z.object({
  year1: z.number().nonnegative(),
  year2: z.number().nonnegative(),
  year3plus: z.number().nonnegative(),
});

const harvestWindowSchema = z.object({
  startMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
});

const costBaseSchema = z.object({
  categories: z.array(z.string().min(1)).min(1),
  monthlyBase: z.record(z.string(), z.record(z.string(), z.number())),
  factorsPhase1: z.record(z.string(), z.number()),
  factorsPhase2: z.record(z.string(), z.number()),
});

const loanSchema = z.object({
  interestRatePA: z.number().nonnegative(),
  repaymentStartMonth: z.number().int().positive(),
});

const rentalSchema = z.object({
  percentOfHarvestGross: z.number().nonnegative(),
  paymentMonth: z.number().int().min(1).max(12),
});

/** Full scenario input — shared between API routes and forms. */
export const scenarioInputSchema = z
  .object({
    modelStart: z
      .string()
      .regex(/^\d{4}-\d{2}-01$/, "Model start must be the first day of a month"),
    modelMonths: z.number().int().positive(),
    sellingPricePerKg: z.number().nonnegative(),
    annualCostInflation: z.number(),
    openingCashBalance: z.number(),
    blocks: z.array(blockSchema).length(2, "Exactly two planting blocks are required"),
    yieldCurve: yieldCurveSchema,
    harvestWindow: harvestWindowSchema,
    firstHarvestYear: z.number().int(),
    harvestCurve: z.array(z.number().nonnegative()).length(12),
    costBase: costBaseSchema,
    loan: loanSchema,
    rental: rentalSchema,
  })
  .superRefine((data, ctx) => {
    const sum = data.harvestCurve.reduce((total, value) => total + value, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Harvest curve must sum to 100% (1.0)",
        path: ["harvestCurve"],
      });
    }

    for (const month of MONTH_NAMES) {
      if (!data.costBase.monthlyBase[month]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing cost data for ${month}`,
          path: ["costBase", "monthlyBase", month],
        });
      }
    }
  });

export type ScenarioInputValidated = z.infer<typeof scenarioInputSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  location: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").optional(),
  location: z.string().nullable().optional(),
});

export const createScenarioSchema = z.object({
  name: z.string().min(1, "Scenario name is required"),
  input: scenarioInputSchema.optional(),
  isBase: z.boolean().optional(),
});

export const updateScenarioSchema = z.object({
  name: z.string().min(1, "Scenario name is required").optional(),
  input: scenarioInputSchema.optional(),
  isBase: z.boolean().optional(),
});

export const duplicateScenarioSchema = z.object({
  name: z.string().min(1, "Scenario name is required").optional(),
});
