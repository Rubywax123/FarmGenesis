import {
  calMonth,
  calYear,
  harvestSeasonStart,
  isoDateLte,
  modelMonthDate,
  monthName,
  parseIsoDate,
  projectYear,
} from "./dateUtils";
import type {
  AnnualSummaryRow,
  MonthlyRow,
  RentalScheduleRow,
  ScenarioInput,
  ScenarioResult,
} from "./types";

/** Return tonnes per hectare for a given plant age at harvest. */
function yieldTPerHa(
  age: number,
  yieldCurve: ScenarioInput["yieldCurve"],
): number {
  if (age < 1) return 0;
  if (age === 1) return yieldCurve.year1;
  if (age === 2) return yieldCurve.year2;
  return yieldCurve.year3plus;
}

/** Planted hectares in model month m (blocks with plantingDate <= date(m)). */
function plantedHa(input: ScenarioInput, month: number): number {
  const date = modelMonthDate(input.modelStart, month);
  return input.blocks.reduce(
    (sum, block) => sum + (isoDateLte(block.plantingDate, date) ? block.areaHa : 0),
    0,
  );
}

/**
 * True from the month Block 2's planting date is reached onward.
 * While only Block 1 is planted, Phase 1 scaling factors apply.
 */
function isPhase2(input: ScenarioInput, month: number): boolean {
  if (input.blocks.length < 2) return false;
  const block2Date = input.blocks[1].plantingDate;
  const date = modelMonthDate(input.modelStart, month);
  return isoDateLte(block2Date, date);
}

/** Scaling factor for cost category c in model month m. */
function costFactor(input: ScenarioInput, category: string, month: number): number {
  const factors = isPhase2(input, month)
    ? input.costBase.factorsPhase2
    : input.costBase.factorsPhase1;
  return factors[category] ?? 0;
}

/** True when month m falls inside the Apr–Oct harvest window after first harvest year. */
function isHarvestMonth(input: ScenarioInput, month: number): boolean {
  const date = modelMonthDate(input.modelStart, month);
  if (date < harvestSeasonStart(input.firstHarvestYear)) return false;
  const cm = calMonth(input.modelStart, month);
  return (
    cm >= input.harvestWindow.startMonth && cm <= input.harvestWindow.endMonth
  );
}

/** Block production (kg) in model month m for one planting block. */
function blockProductionKg(
  block: ScenarioInput["blocks"][number],
  input: ScenarioInput,
  month: number,
): number {
  if (!isHarvestMonth(input, month)) return 0;

  const harvestYear = calYear(input.modelStart, month);
  const plantingYear = parseIsoDate(block.plantingDate).year;
  const age = harvestYear - plantingYear;
  const yieldPerHa = yieldTPerHa(age, input.yieldCurve);
  if (yieldPerHa === 0) return 0;

  const cm = calMonth(input.modelStart, month);
  const curveFraction = input.harvestCurve[cm - 1] ?? 0;
  return yieldPerHa * block.areaHa * 1000 * curveFraction;
}

/** Total production (kg) across all blocks in model month m. */
function productionKg(input: ScenarioInput, month: number): number {
  return input.blocks.reduce(
    (sum, block) => sum + blockProductionKg(block, input, month),
    0,
  );
}

/**
 * Full-year gross harvest revenue for calendar harvest year Y.
 * Sum of yield × area × 1000 × price for all blocks (Apr–Oct basis for rental).
 */
function harvestGrossForYear(input: ScenarioInput, harvestYear: number): number {
  let totalKg = 0;
  for (const block of input.blocks) {
    const plantingYear = parseIsoDate(block.plantingDate).year;
    const age = harvestYear - plantingYear;
    const yieldPerHa = yieldTPerHa(age, input.yieldCurve);
    if (yieldPerHa > 0) {
      totalKg += yieldPerHa * block.areaHa * 1000;
    }
  }
  return totalKg * input.sellingPricePerKg;
}

/** True when calendar year Y has any harvest production. */
function harvestYearHasProduction(input: ScenarioInput, year: number): boolean {
  return harvestGrossForYear(input, year) > 0;
}

/** Total production (tonnes) for calendar harvest year Y within the model window. */
function harvestYearProductionInModel(
  input: ScenarioInput,
  harvestYear: number,
): number {
  let kg = 0;
  for (let m = 1; m <= input.modelMonths; m++) {
    if (calYear(input.modelStart, m) === harvestYear) {
      kg += productionKg(input, m);
    }
  }
  return kg / 1000;
}

/** Operating cost for category c in model month m (excludes Rent). */
function categoryCost(
  input: ScenarioInput,
  category: string,
  month: number,
): number {
  if (category === "Rent") return 0;
  const cm = calMonth(input.modelStart, month);
  const base =
    input.costBase.monthlyBase[monthName(cm)]?.[category] ?? 0;
  const factor = costFactor(input, category, month);
  const inflationFactor =
    (1 + input.annualCostInflation) ** (projectYear(month) - 1);
  return base * factor * inflationFactor;
}

/** Rental lump-sum charge in model month m, if applicable. */
function rentalCharge(input: ScenarioInput, month: number): number {
  const cm = calMonth(input.modelStart, month);
  if (cm !== input.rental.paymentMonth) return 0;

  const year = calYear(input.modelStart, month);
  if (!harvestYearHasProduction(input, year)) return 0;

  return harvestGrossForYear(input, year) * input.rental.percentOfHarvestGross;
}

/** All OPEX for model month m (categories + rental). */
function computeOpex(
  input: ScenarioInput,
  month: number,
): { opexByCategory: Record<string, number>; rentalCharge: number; opex: number } {
  const opexByCategory: Record<string, number> = {};
  let categoryTotal = 0;

  for (const category of input.costBase.categories) {
    const cost = categoryCost(input, category, month);
    opexByCategory[category] = cost;
    categoryTotal += cost;
  }

  const rental = rentalCharge(input, month);
  return {
    opexByCategory,
    rentalCharge: rental,
    opex: categoryTotal + rental,
  };
}

/**
 * Run the full 60-month financial model.
 * Implements Section 6 formulas exactly: production, OPEX, auto-draw loan, aggregations.
 */
export function calculateScenario(input: ScenarioInput): ScenarioResult {
  const r = input.loan.interestRatePA;
  const monthly: MonthlyRow[] = [];

  let cashPrev = input.openingCashBalance;
  let openingLoan = 0;
  let peakLoanBalance = 0;
  let loanFullyRepaidMonth: number | null = null;
  let hadLoanBefore = false;

  const harvestGrossByYear = new Map<number, number>();
  const harvestYears = new Set<number>();

  for (let y = input.firstHarvestYear; y <= input.firstHarvestYear + 10; y++) {
    const gross = harvestGrossForYear(input, y);
    if (gross > 0) {
      harvestGrossByYear.set(y, gross);
      harvestYears.add(y);
    }
  }

  for (let m = 1; m <= input.modelMonths; m++) {
    const prodKg = productionKg(input, m);
    const rev = prodKg * input.sellingPricePerKg;
    const { opexByCategory, rentalCharge: rental, opex } = computeOpex(input, m);

    const opCF = rev - opex;

    const draw =
      Math.max(
        0,
        -(cashPrev + opCF - openingLoan * (r / 12)) / (1 - r / 24),
      );

    const interest = (openingLoan + draw / 2) * (r / 12);

    const repay =
      m < input.loan.repaymentStartMonth
        ? 0
        : Math.min(
            openingLoan + draw,
            Math.max(0, cashPrev + opCF - interest),
          );

    const netCF = opCF + draw - interest - repay;
    const cash = cashPrev + netCF;
    const closingLoan = Math.max(0, openingLoan + draw - repay);

    if (openingLoan + draw > 0) hadLoanBefore = true;
    if (closingLoan > peakLoanBalance) peakLoanBalance = closingLoan;
    if (
      hadLoanBefore &&
      closingLoan === 0 &&
      loanFullyRepaidMonth === null &&
      m >= input.loan.repaymentStartMonth
    ) {
      loanFullyRepaidMonth = m;
    }

    const debtService = interest + repay;
    const dscr =
      debtService > 0 ? Math.max(0, opCF) / debtService : null;

    monthly.push({
      month: m,
      date: modelMonthDate(input.modelStart, m),
      projectYear: projectYear(m),
      plantedHa: plantedHa(input, m),
      productionKg: prodKg,
      revenue: rev,
      opexByCategory,
      rentalCharge: rental,
      opex,
      opCF,
      draw,
      interest,
      repay,
      netCF,
      cash,
      openingLoan,
      closingLoan,
      debtService,
      dscr,
    });

    cashPrev = cash;
    openingLoan = closingLoan;
  }

  const annual: AnnualSummaryRow[] = [];
  const projectYearCount = Math.ceil(input.modelMonths / 12);

  for (let py = 1; py <= projectYearCount; py++) {
    const rows = monthly.filter((row) => row.projectYear === py);
    if (rows.length === 0) continue;

    const areaHa = Math.max(...rows.map((row) => row.plantedHa));
    const productionT =
      rows.reduce((sum, row) => sum + row.productionKg, 0) / 1000;
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const opex = rows.reduce((sum, row) => sum + row.opex, 0);
    const interest = rows.reduce((sum, row) => sum + row.interest, 0);
    const drawdowns = rows.reduce((sum, row) => sum + row.draw, 0);
    const repayments = rows.reduce((sum, row) => sum + row.repay, 0);
    const netCashMovement = rows.reduce((sum, row) => sum + row.netCF, 0);
    const closingLoanBalance = rows[rows.length - 1].closingLoan;

    annual.push({
      projectYear: py,
      areaHa,
      productionT,
      revenue,
      opex,
      ebitda: revenue - opex,
      interest,
      drawdowns,
      repayments,
      netCashMovement,
      closingLoanBalance,
    });
  }

  const fiveYearAnnual = annual.filter((row) => row.projectYear <= 5);
  const fiveYearRevenue = fiveYearAnnual.reduce((s, row) => s + row.revenue, 0);
  const fiveYearOpex = fiveYearAnnual.reduce((s, row) => s + row.opex, 0);

  const harvestYearProductionT: Record<number, number> = {};
  for (const year of [...harvestYears].sort((a, b) => a - b)) {
    harvestYearProductionT[year] = harvestYearProductionInModel(input, year);
  }

  const modelStartDate = parseIsoDate(input.modelStart);
  const modelEndDate = parseIsoDate(
    modelMonthDate(input.modelStart, input.modelMonths),
  );

  const rentalSchedule: RentalScheduleRow[] = [...harvestYears]
    .sort((a, b) => a - b)
    .map((harvestYear) => {
      const gross = harvestGrossByYear.get(harvestYear) ?? 0;
      const paymentDate = `${harvestYear}-${String(input.rental.paymentMonth).padStart(2, "0")}-01`;
      const paymentParsed = parseIsoDate(paymentDate);
      const insideModelWindow =
        paymentParsed.year > modelStartDate.year ||
        (paymentParsed.year === modelStartDate.year &&
          paymentParsed.month >= modelStartDate.month)
          ? paymentParsed.year < modelEndDate.year ||
            (paymentParsed.year === modelEndDate.year &&
              paymentParsed.month <= modelEndDate.month)
          : false;

      return {
        harvestYear,
        harvestGross: gross,
        rentalPercent: input.rental.percentOfHarvestGross,
        rentalAmount: gross * input.rental.percentOfHarvestGross,
        paymentDate,
        insideModelWindow,
      };
    });

  const lastMonth = monthly[monthly.length - 1];

  return {
    monthly,
    annual,
    harvestYearProductionT,
    kpis: {
      totalProductionKg: monthly.reduce((s, row) => s + row.productionKg, 0),
      fiveYearRevenue,
      fiveYearOpex,
      fiveYearEbitda: fiveYearRevenue - fiveYearOpex,
      totalInterest: monthly.reduce((s, row) => s + row.interest, 0),
      peakLoanBalance,
      loanFullyRepaidMonth,
      loanFullyRepaidDate: loanFullyRepaidMonth
        ? modelMonthDate(input.modelStart, loanFullyRepaidMonth)
        : null,
      closingCash: lastMonth?.cash ?? input.openingCashBalance,
    },
    rentalSchedule,
  };
}

/** Returns true when harvest curve fractions sum to 1 (within floating-point tolerance). */
export function isValidHarvestCurve(curve: number[]): boolean {
  const sum = curve.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) < 1e-9;
}
