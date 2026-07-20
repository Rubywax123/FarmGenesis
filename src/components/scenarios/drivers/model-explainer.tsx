"use client";

import * as React from "react";
import { MONTH_NAMES, type ScenarioInput, type ScenarioResult } from "@/engine";
import { formatMonthLong, formatUsd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

interface ModelExplainerProps {
  input: ScenarioInput;
  baseline: ScenarioResult;
}

/**
 * Collapsible plain-English walkthrough of every calculation, with small
 * inline examples computed from the scenario's own saved numbers. No formulas.
 */
export function ModelExplainer({
  input,
  baseline,
}: ModelExplainerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  const totalHa = input.blocks.reduce((sum, block) => sum + block.areaHa, 0);
  const block1 = input.blocks[0];
  const peakMonthIndex = input.harvestCurve.indexOf(
    Math.max(...input.harvestCurve),
  );
  const peakMonthName = MONTH_NAMES[peakMonthIndex];
  const peakShare = Math.round(input.harvestCurve[peakMonthIndex] * 100);

  const matureTonnes = input.yieldCurve.year3plus * block1.areaHa;
  const peakMonthTonnes = matureTonnes * input.harvestCurve[peakMonthIndex];
  const peakMonthRevenue = peakMonthTonnes * 1000 * input.sellingPricePerKg;

  const inflationPct = Math.round(input.annualCostInflation * 1000) / 10;
  const rentalPct = Math.round(input.rental.percentOfHarvestGross * 1000) / 10;
  const rentalMonthName = MONTH_NAMES[input.rental.paymentMonth - 1];
  const rentalExample =
    baseline.rentalSchedule[1] ?? baseline.rentalSchedule[0] ?? null;

  const ratePct = Math.round(input.loan.interestRatePA * 1000) / 10;
  const repaidText = baseline.kpis.loanFullyRepaidDate
    ? `is fully repaid in ${formatMonthLong(baseline.kpis.loanFullyRepaidDate)} (month ${baseline.kpis.loanFullyRepaidMonth})`
    : "is not fully repaid inside the five-year window";

  return (
    <Card>
      <CardContent className="p-5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span>
            <span className="block text-lg font-semibold">
              How the model works
            </span>
            <span className="block text-sm text-[var(--color-muted-foreground)]">
              Every calculation behind these numbers, explained in plain
              English with this scenario&apos;s own figures.
            </span>
          </span>
          <span
            aria-hidden
            className="text-xl text-[var(--color-muted-foreground)]"
          >
            {open ? "−" : "+"}
          </span>
        </button>

        {open ? (
          <div className="mt-4 max-w-3xl space-y-5 border-t border-[var(--color-border)] pt-4 text-sm leading-relaxed">
            <section className="space-y-1">
              <h4 className="font-semibold">Where revenue comes from</h4>
              <p>
                Each block of plants has a yield for its age:{" "}
                {input.yieldCurve.year1} t/ha in its first harvest season,{" "}
                {input.yieldCurve.year2} in its second, and{" "}
                {input.yieldCurve.year3plus} from the third season onward. The
                model multiplies that yield by the block&apos;s hectares (this
                farm plants {totalHa} ha in total), spreads the crop across the
                picking season ({peakMonthName} is the peak, taking about{" "}
                {peakShare}% of the year&apos;s crop), and multiplies by the
                selling price. For example, once {block1.name} is fully mature
                its {block1.areaHa} ha produce about{" "}
                {Math.round(matureTonnes)} tonnes a year, so its{" "}
                {peakMonthName} pick alone is roughly{" "}
                {Math.round(peakMonthTonnes)} tonnes — about{" "}
                {formatUsd(peakMonthRevenue)} at{" "}
                {formatUsd(input.sellingPricePerKg)} per kg.
              </p>
            </section>

            <section className="space-y-1">
              <h4 className="font-semibold">Where monthly costs come from</h4>
              <p>
                Costs start from real amounts recorded month by month on a 12
                ha farm — a seasonal pattern for each of the ~
                {input.costBase.categories.length} categories (wages peak at
                harvest, fertiliser in the growing months, and so on). Each
                category is then scaled for this farm&apos;s size: fixed costs
                like certification stay the same, area-based costs like
                packaging and fertiliser grow in proportion to hectares, and
                semi-variable costs like wages sit in between. The scaling
                steps up in the month the second block is planted.{" "}
                {inflationPct > 0
                  ? `On top of that, every cost rises ${inflationPct}% each project year for inflation.`
                  : "This scenario assumes no cost inflation, so those amounts stay flat across the five years."}
              </p>
            </section>

            <section className="space-y-1">
              <h4 className="font-semibold">How rent works</h4>
              <p>
                Rent is not a monthly bill. The landowner takes {rentalPct}% of
                each harvest year&apos;s gross revenue, paid once, in{" "}
                {rentalMonthName} of that year.
                {rentalExample
                  ? ` In this scenario the ${rentalExample.harvestYear} harvest grosses ${formatUsd(rentalExample.harvestGross)}, so the rent bill is ${formatUsd(rentalExample.rentalAmount)}, paid ${rentalMonthName} ${rentalExample.harvestYear}.`
                  : ""}
              </p>
            </section>

            <section className="space-y-1">
              <h4 className="font-semibold">How the loan works</h4>
              <p>
                In the early years the farm spends more than it earns. Each
                month the working-capital loan automatically draws exactly
                enough to keep the bank account at zero — no more, no less.
                Interest at {ratePct}% a year is charged monthly on whatever is
                outstanding. From month {input.loan.repaymentStartMonth}, every
                spare dollar the farm generates is swept into repaying the
                loan. In this scenario the loan peaks at{" "}
                {formatUsd(baseline.kpis.peakLoanBalance)} and {repaidText};
                after that, cash simply builds up in the bank.
              </p>
            </section>

            <section className="space-y-1">
              <h4 className="font-semibold">What DSCR means</h4>
              <p>
                The debt service cover ratio compares what the farm earns from
                operations in a period with what it owes the bank (interest
                plus repayments) in that same period. 1.0× means just enough to
                cover the bank; banks like to see comfortably more than that.
                Months with no debt payments show no ratio at all.
              </p>
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
