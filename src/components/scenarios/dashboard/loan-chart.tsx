"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/engine/types";
import {
  formatMonthLong,
  formatMonthShort,
  formatUsd,
  formatUsdCompact,
} from "@/lib/format";
import { CHART_COLORS, ChartCard } from "./chart-card";

interface LoanChartProps {
  result: ScenarioResult;
}

/** Chart 2 — loan balance area with draw/repayment bars, peak and payoff annotated. */
export function LoanChart({ result }: LoanChartProps): React.JSX.Element {
  const data = React.useMemo(
    () =>
      result.monthly.map((row) => ({
        label: formatMonthShort(row.date),
        "Loan balance": row.closingLoan,
        Drawdown: row.draw,
        Repayment: row.repay,
      })),
    [result],
  );

  const peakIndex = React.useMemo(() => {
    let index = 0;
    for (let i = 1; i < result.monthly.length; i++) {
      if (result.monthly[i].closingLoan > result.monthly[index].closingLoan) {
        index = i;
      }
    }
    return index;
  }, [result]);

  const payoffMonth = result.kpis.loanFullyRepaidMonth;
  const payoffLabel =
    payoffMonth !== null ? formatMonthShort(result.monthly[payoffMonth - 1].date) : null;

  return (
    <ChartCard
      title="Loan lifecycle"
      caption={
        payoffMonth !== null && result.kpis.loanFullyRepaidDate
          ? `The working-capital facility peaks at ${formatUsd(result.kpis.peakLoanBalance)} and is fully repaid in ${formatMonthLong(result.kpis.loanFullyRepaidDate)} — after that the farm banks its own cash.`
          : `The working-capital facility peaks at ${formatUsd(result.kpis.peakLoanBalance)} and is not fully repaid inside the model window.`
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatUsdCompact(Number(v))} />
          <Tooltip formatter={(value, name) => [formatUsd(Number(value)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            dataKey="Loan balance"
            stroke={CHART_COLORS.green}
            fill={CHART_COLORS.paleGreen}
            strokeWidth={2}
          />
          <Bar dataKey="Drawdown" fill={CHART_COLORS.gold} />
          <Bar dataKey="Repayment" fill={CHART_COLORS.lightGreen} />
          <ReferenceDot
            x={data[peakIndex]?.label}
            y={result.monthly[peakIndex]?.closingLoan ?? 0}
            r={4}
            fill={CHART_COLORS.red}
            stroke="white"
            label={{
              value: `Peak ${formatUsdCompact(result.kpis.peakLoanBalance)}`,
              position: "top",
              fontSize: 11,
            }}
          />
          {payoffLabel ? (
            <ReferenceLine
              x={payoffLabel}
              stroke={CHART_COLORS.ink}
              strokeDasharray="4 4"
              label={{ value: "Repaid", position: "insideTopRight", fontSize: 11 }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
