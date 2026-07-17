"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/engine/types";
import { formatMonthShort, formatUsd, formatUsdCompact } from "@/lib/format";
import { CHART_COLORS, ChartCard, PeriodToggle } from "./chart-card";

interface CashflowChartProps {
  result: ScenarioResult;
}

/** Chart 1 — revenue vs OPEX bars with net operating cashflow line. */
export function CashflowChart({ result }: CashflowChartProps): React.JSX.Element {
  const [period, setPeriod] = React.useState<"monthly" | "annual">("monthly");

  const monthlyData = React.useMemo(
    () =>
      result.monthly.map((row) => ({
        label: formatMonthShort(row.date),
        Revenue: row.revenue,
        OPEX: -row.opex,
        "Net operating cashflow": row.opCF,
      })),
    [result],
  );

  const annualData = React.useMemo(
    () =>
      result.annual.map((row) => ({
        label: `Year ${row.projectYear}`,
        Revenue: row.revenue,
        OPEX: -row.opex,
        "Net operating cashflow": row.ebitda,
      })),
    [result],
  );

  const data = period === "monthly" ? monthlyData : annualData;

  return (
    <ChartCard
      title="Cashflow over time"
      caption="Green bars are sales income, red bars are operating costs; the line shows what the farm earns (or loses) from operations each period before any loan."
      headerExtra={<PeriodToggle value={period} onChange={setPeriod} />}
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} stackOffset="sign">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={period === "monthly" ? 5 : 0}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatUsdCompact(Number(v))} />
          <Tooltip
            formatter={(value, name) => [formatUsd(Math.abs(Number(value))), String(name)]}
          />
          <Bar dataKey="Revenue" fill={CHART_COLORS.green} stackId="flow" />
          <Bar dataKey="OPEX" fill={CHART_COLORS.red} stackId="flow" />
          <Line
            dataKey="Net operating cashflow"
            stroke={CHART_COLORS.ink}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
