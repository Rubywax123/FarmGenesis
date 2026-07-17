import { describe, expect, it } from "vitest";
import { calculateScenario, isValidHarvestCurve } from "./calculate";
import { blueberryZimbabweBaseCase } from "./seed/blueberryZimbabwe";

/** Assert value is within ±0.1% of expected. */
function expectWithinTolerance(actual: number, expected: number): void {
  const tolerance = Math.abs(expected) * 0.001;
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
}

describe("FarmForecast engine — Zimbabwe Blueberry Base Case (Section 10)", () => {
  const result = calculateScenario(blueberryZimbabweBaseCase);
  const { kpis, annual, monthly, rentalSchedule, harvestYearProductionT } =
    result;

  it("matches total production in 60-month model", () => {
    expectWithinTolerance(kpis.totalProductionKg, 1_069_000);
  });

  it("matches 5-year revenue", () => {
    expectWithinTolerance(kpis.fiveYearRevenue, 5_345_000);
  });

  it("matches 5-year OPEX (incl. rental)", () => {
    expectWithinTolerance(kpis.fiveYearOpex, 4_033_880);
  });

  it("matches 5-year EBITDA before interest", () => {
    expectWithinTolerance(kpis.fiveYearEbitda, 1_311_120);
  });

  it("matches total interest paid", () => {
    expectWithinTolerance(kpis.totalInterest, 184_082);
  });

  it("matches peak loan balance", () => {
    expectWithinTolerance(kpis.peakLoanBalance, 824_908);
  });

  it("matches closing loan balance at month 60", () => {
    expect(kpis.closingCash).toBeDefined();
    expectWithinTolerance(monthly[59].closingLoan, 0);
  });

  it("matches loan fully repaid in July 2029 (month 37)", () => {
    expect(kpis.loanFullyRepaidMonth).toBe(37);
    expect(kpis.loanFullyRepaidDate).toBe("2029-07-01");
  });

  it("matches closing cash at month 60", () => {
    expectWithinTolerance(kpis.closingCash, 1_127_038);
  });

  it("matches Year 1 revenue / OPEX (Jul 26–Jun 27)", () => {
    const year1 = annual.find((row) => row.projectYear === 1);
    expect(year1).toBeDefined();
    expectWithinTolerance(year1!.revenue, 140_000);
    expectWithinTolerance(year1!.opex, 450_260);
  });

  it("matches Year 2 revenue / OPEX", () => {
    const year2 = annual.find((row) => row.projectYear === 2);
    expect(year2).toBeDefined();
    expectWithinTolerance(year2!.revenue, 645_000);
    expectWithinTolerance(year2!.opex, 817_155);
  });

  it("matches Year 3 revenue / OPEX", () => {
    const year3 = annual.find((row) => row.projectYear === 3);
    expect(year3).toBeDefined();
    expectWithinTolerance(year3!.revenue, 1_257_500);
    expectWithinTolerance(year3!.opex, 887_155);
  });

  it("matches rental Oct 2027 / 2028 / 2029 / 2030", () => {
    const rentalByYear = (year: number) =>
      rentalSchedule.find((row) => row.harvestYear === year)?.rentalAmount ?? 0;

    expectWithinTolerance(rentalByYear(2027), 40_000);
    expectWithinTolerance(rentalByYear(2028), 110_000);
    expectWithinTolerance(rentalByYear(2029), 155_000);
    expectWithinTolerance(rentalByYear(2030), 170_000);
  });

  it("matches Month 1 (Jul 2026): OPEX / draw / interest", () => {
    const month1 = monthly[0];
    expectWithinTolerance(month1.opex, 44_237.06);
    expectWithinTolerance(month1.draw, 44_477.98);
    expectWithinTolerance(month1.interest, 240.92);
  });

  it("matches harvest-year production ramp", () => {
    expectWithinTolerance(harvestYearProductionT[2027] ?? 0, 80);
    expectWithinTolerance(harvestYearProductionT[2028] ?? 0, 220);
    expectWithinTolerance(harvestYearProductionT[2029] ?? 0, 310);
    expectWithinTolerance(harvestYearProductionT[2030] ?? 0, 340);
    expectWithinTolerance(harvestYearProductionT[2031] ?? 0, 119);
  });
});

describe("FarmForecast engine — behavioural checks (Section 10)", () => {
  const baseResult = calculateScenario(blueberryZimbabweBaseCase);

  it("validates harvest curve must sum to 1", () => {
    expect(isValidHarvestCurve(blueberryZimbabweBaseCase.harvestCurve)).toBe(
      true,
    );
    expect(isValidHarvestCurve([0.5, 0.5])).toBe(true);
    expect(isValidHarvestCurve([0.5, 0.4])).toBe(false);
  });

  it("has no production before April of firstHarvestYear", () => {
    for (const row of baseResult.monthly) {
      const year = Number(row.date.slice(0, 4));
      const month = Number(row.date.slice(5, 7));
      if (
        year < blueberryZimbabweBaseCase.firstHarvestYear ||
        (year === blueberryZimbabweBaseCase.firstHarvestYear && month < 4)
      ) {
        expect(row.productionKg).toBe(0);
      }
    }
  });

  it("switches to factorsPhase2 in the month Block 2 is planted", () => {
    const block2PlantMonth = baseResult.monthly.find(
      (row) => row.date === "2027-07-01",
    );
    expect(block2PlantMonth).toBeDefined();
    expect(block2PlantMonth!.plantedHa).toBe(20);

    const june2027 = baseResult.monthly.find((row) => row.date === "2027-06-01");
    const july2027 = baseResult.monthly.find((row) => row.date === "2027-07-01");
    expect(june2027!.opex).toBeLessThan(july2027!.opex);
  });

  it("keeps cash never below −$0.01", () => {
    for (const row of baseResult.monthly) {
      expect(row.cash).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it("keeps loan balance never negative", () => {
    for (const row of baseResult.monthly) {
      expect(row.openingLoan).toBeGreaterThanOrEqual(0);
      expect(row.closingLoan).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns DSCR null when no debt service", () => {
    const month1 = baseResult.monthly[0];
    expect(month1.debtService).toBeGreaterThan(0);
    expect(month1.dscr).not.toBeNull();

    const noDebtInput = {
      ...blueberryZimbabweBaseCase,
      openingCashBalance: 10_000_000,
      loan: { ...blueberryZimbabweBaseCase.loan, repaymentStartMonth: 999 },
    };
    const noDebtResult = calculateScenario(noDebtInput);
    const surplusMonth = noDebtResult.monthly[0];
    expect(surplusMonth.draw).toBe(0);
    expect(surplusMonth.repay).toBe(0);
    expect(surplusMonth.debtService).toBe(0);
    expect(surplusMonth.dscr).toBeNull();
  });
});
