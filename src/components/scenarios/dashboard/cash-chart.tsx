"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/engine/types";
import { formatMonthShort, formatUsd, formatUsdCompact } from "@/lib/format";
import { CHART_COLORS, ChartCard } from "./chart-card";

interface CashChartProps {
  result: ScenarioResult;
}

/** Chart 4 — closing cash position across the model. */
export function CashChart({ result }: CashChartProps): React.JSX.Element {
  const data = React.useMemo(
    () =>
      result.monthly.map((row) => ({
        label: formatMonthShort(row.date),
        "Closing cash": row.cash,
      })),
    [result],
  );

  return (
    <ChartCard
      title="Cumulative cash position"
      caption="Cash in the bank each month — it stays near zero while the loan carries the farm, then climbs once harvests outgrow costs. This is the 'when do we turn the corner' chart."
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatUsdCompact(Number(v))} />
          <Tooltip formatter={(value) => [formatUsd(Number(value)), "Closing cash"]} />
          <ReferenceLine y={0} stroke={CHART_COLORS.red} strokeDasharray="4 4" />
          <Line
            dataKey="Closing cash"
            stroke={CHART_COLORS.green}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
