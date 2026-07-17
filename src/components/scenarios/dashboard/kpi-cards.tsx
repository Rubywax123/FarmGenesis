"use client";

import type { ScenarioResult } from "@/engine/types";
import { formatMonthLong, formatUsd } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardsProps {
  result: ScenarioResult;
}

/** Top row of the dashboard: seven KPI cards with plain-language captions. */
export function KpiCards({ result }: KpiCardsProps): React.JSX.Element {
  const { kpis } = result;

  const loanRepaidValue = kpis.loanFullyRepaidDate
    ? `${formatMonthLong(kpis.loanFullyRepaidDate)} (month ${kpis.loanFullyRepaidMonth})`
    : "Not repaid";

  const cards: Array<{ label: string; value: string; caption: string }> = [
    {
      label: "5-yr revenue",
      value: formatUsd(kpis.fiveYearRevenue),
      caption: "Total sales income over the five-year model.",
    },
    {
      label: "5-yr OPEX",
      value: formatUsd(kpis.fiveYearOpex),
      caption: "All operating costs over five years, including land rental.",
    },
    {
      label: "5-yr EBITDA",
      value: formatUsd(kpis.fiveYearEbitda),
      caption: "Operating profit before interest — what the farm itself earns.",
    },
    {
      label: "Peak loan balance",
      value: formatUsd(kpis.peakLoanBalance),
      caption:
        "The most working capital the project ever needs — the size of facility to ask the bank for.",
    },
    {
      label: "Total interest",
      value: formatUsd(kpis.totalInterest),
      caption: "The full cost of borrowing across the model.",
    },
    {
      label: "Loan repaid",
      value: loanRepaidValue,
      caption: "When the facility is fully paid back out of farm cashflow.",
    },
    {
      label: "Closing cash",
      value: formatUsd(kpis.closingCash),
      caption: "Cash in the bank at the end of the five years.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {card.label}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {card.caption}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
