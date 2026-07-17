"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/engine/types";
import { formatTonnes } from "@/lib/format";
import { ChartCard, SERIES_COLORS } from "./chart-card";

interface ProductionChartProps {
  result: ScenarioResult;
}

/** Chart 3 — stacked production per harvest year by block, in tonnes. */
export function ProductionChart({ result }: ProductionChartProps): React.JSX.Element {
  const blockNames = React.useMemo(() => {
    const names = new Set<string>();
    for (const row of result.productionRamp) {
      for (const name of Object.keys(row.byBlockT)) names.add(name);
    }
    return [...names];
  }, [result]);

  const data = React.useMemo(
    () =>
      result.productionRamp.map((row) => ({
        label: String(row.harvestYear),
        ...row.byBlockT,
      })),
    [result],
  );

  return (
    <ChartCard
      title="Production ramp"
      caption="Each harvest year's crop in tonnes, split by planting block — young plants yield less, so production ramps up as both blocks mature."
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatTonnes(Number(v))} />
          <Tooltip
            formatter={(value, name) => [formatTonnes(Number(value)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {blockNames.map((name, index) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="production"
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
