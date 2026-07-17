/** Calendar month names used as keys in the cost base table. */
export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

/** Full set of user-editable assumptions for one scenario. */
export interface ScenarioInput {
  modelStart: string;
  modelMonths: number;
  sellingPricePerKg: number;
  annualCostInflation: number;
  openingCashBalance: number;

  blocks: Array<{
    name: string;
    areaHa: number;
    plantingDate: string;
  }>;

  yieldCurve: {
    year1: number;
    year2: number;
    year3plus: number;
  };

  harvestWindow: { startMonth: number; endMonth: number };
  firstHarvestYear: number;
  harvestCurve: number[];

  costBase: {
    categories: string[];
    monthlyBase: Record<string, Record<string, number>>;
    factorsPhase1: Record<string, number>;
    factorsPhase2: Record<string, number>;
  };

  loan: {
    interestRatePA: number;
    repaymentStartMonth: number;
  };

  rental: {
    percentOfHarvestGross: number;
    paymentMonth: number;
  };
}

/** One row of the monthly time series output. */
export interface MonthlyRow {
  month: number;
  date: string;
  projectYear: number;
  plantedHa: number;
  productionKg: number;
  revenue: number;
  opexByCategory: Record<string, number>;
  rentalCharge: number;
  opex: number;
  opCF: number;
  draw: number;
  interest: number;
  repay: number;
  netCF: number;
  cash: number;
  openingLoan: number;
  closingLoan: number;
  debtService: number;
  dscr: number | null;
}

/** One row of the annual (Jul–Jun project year) summary. */
export interface AnnualSummaryRow {
  projectYear: number;
  areaHa: number;
  productionT: number;
  revenue: number;
  opex: number;
  ebitda: number;
  interest: number;
  drawdowns: number;
  repayments: number;
  netCashMovement: number;
  closingLoanBalance: number;
  debtService: number;
  dscr: number | null;
}

/** In-model production per harvest calendar year, split by planting block. */
export interface ProductionRampRow {
  harvestYear: number;
  totalT: number;
  byBlockT: Record<string, number>;
}

/** Rental charge schedule entry for one harvest calendar year. */
export interface RentalScheduleRow {
  harvestYear: number;
  harvestGross: number;
  rentalPercent: number;
  rentalAmount: number;
  paymentDate: string;
  insideModelWindow: boolean;
}

/** Top-level KPIs and time series returned by the engine. */
export interface ScenarioResult {
  monthly: MonthlyRow[];
  annual: AnnualSummaryRow[];
  harvestYearProductionT: Record<number, number>;
  productionRamp: ProductionRampRow[];
  kpis: {
    totalProductionKg: number;
    fiveYearRevenue: number;
    fiveYearOpex: number;
    fiveYearEbitda: number;
    totalInterest: number;
    peakLoanBalance: number;
    loanFullyRepaidMonth: number | null;
    loanFullyRepaidDate: string | null;
    closingCash: number;
  };
  rentalSchedule: RentalScheduleRow[];
}
