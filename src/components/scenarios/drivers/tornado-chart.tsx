"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateWithOverrides } from "@/engine";
import type { ScenarioInput, ScenarioResult } from "@/engine";
import { formatUsd, formatUsdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHART_COLORS, ChartCard } from "../dashboard/chart-card";
import { clampToGuardrails, DRIVER_DEFS } from "./driver-defs";

type SensitivityMetric = "ebitda" | "peakLoan";

const METRIC_LABELS: Record<SensitivityMetric, string> = {
  ebitda: "5-yr EBITDA",
  peakLoan: "Peak loan balance",
};

function metricValue(result: ScenarioResult, metric: SensitivityMetric): number {
  return metric === "ebitda"
    ? result.kpis.fiveYearEbitda
    : result.kpis.peakLoanBalance;
}

interface TornadoRow {
  name: string;
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
}

interface TornadoChartProps {
  input: ScenarioInput;
  baseline: ScenarioResult;
}

/**
 * "What matters most": each driver is nudged −10% and +10% from its saved
 * value (clamped to the guardrails), the engine re-runs client-side, and the
 * change in the chosen metric is plotted as horizontal bars sorted by impact.
 */
export function TornadoChart({
  input,
  baseline,
}: TornadoChartProps): React.JSX.Element {
  const [metric, setMetric] = React.useState<SensitivityMetric>("ebitda");

  const data = React.useMemo<TornadoRow[]>(() => {
    const base = metricValue(baseline, metric);

    const rows = DRIVER_DEFS.map((def) => {
      const saved = def.fromModel(def.getModelValue(input));
      const low = clampToGuardrails(def, saved * 0.9);
      const high = clampToGuardrails(def, saved * 1.1);

      const lowResult = calculateWithOverrides(input, {
        [def.key]: def.toModel(low),
      });
      const highResult = calculateWithOverrides(input, {
        [def.key]: def.toModel(high),
      });

      return {
        name: def.name,
        low: metricValue(lowResult, metric) - base,
        high: metricValue(highResult, metric) - base,
        lowLabel: def.format(low),
        highLabel: def.format(high),
      };
    });

    return rows.sort(
      (a, b) =>
        Math.max(Math.abs(b.low), Math.abs(b.high)) -
        Math.max(Math.abs(a.low), Math.abs(a.high)),
    );
  }, [input, baseline, metric]);

  return (
    <ChartCard
      title="What matters most"
      caption="The longest bars are the assumptions that matter most — small changes there move the result the most."
      headerExtra={
        <div className="inline-flex rounded-md bg-[var(--color-muted)] p-0.5 text-xs font-medium">
          {(Object.keys(METRIC_LABELS) as SensitivityMetric[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMetric(option)}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                metric === option
                  ? "bg-[var(--color-card)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
              )}
            >
              {METRIC_LABELS[option]}
            </button>
          ))}
        </div>
      }
    >
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Each assumption is nudged 10% down and 10% up from its saved value
        (kept inside its safe range). The bars show how much{" "}
        {METRIC_LABELS[metric]} changes; the centre line is the saved scenario.
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} layout="vertical" stackOffset="sign">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatUsdCompact(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              const row = item.payload as TornadoRow;
              const label =
                name === "10% lower"
                  ? `10% lower (${row.lowLabel})`
                  : `10% higher (${row.highLabel})`;
              const amount = Number(value);
              const sign = amount >= 0 ? "+" : "−";
              return [`${sign}${formatUsd(Math.abs(amount))}`, label];
            }}
          />
          <ReferenceLine x={0} stroke={CHART_COLORS.ink} />
          <Bar dataKey="low" name="10% lower" stackId="delta" fill={CHART_COLORS.gold} />
          <Bar dataKey="high" name="10% higher" stackId="delta" fill={CHART_COLORS.green} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
