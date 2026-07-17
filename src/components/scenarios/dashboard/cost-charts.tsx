"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScenarioResult } from "@/engine/types";
import { formatMonthShort, formatUsd, formatUsdCompact } from "@/lib/format";
import { ChartCard, SERIES_COLORS } from "./chart-card";

const RENT_LABEL = "Rent (% of harvest)";
const OTHER_LABEL = "Other";

interface CostChartsProps {
  result: ScenarioResult;
}

/** Sum each category's OPEX across all model months (plus the rental charges). */
function useCategoryTotals(result: ScenarioResult): Array<{ name: string; total: number }> {
  return React.useMemo(() => {
    const totals = new Map<string, number>();
    let rentTotal = 0;

    for (const row of result.monthly) {
      for (const [category, value] of Object.entries(row.opexByCategory)) {
        totals.set(category, (totals.get(category) ?? 0) + value);
      }
      rentTotal += row.rentalCharge;
    }

    const list = [...totals.entries()]
      .map(([name, total]) => ({ name, total }))
      .filter((entry) => entry.total > 0);
    if (rentTotal > 0) {
      list.push({ name: RENT_LABEL, total: rentTotal });
    }
    return list.sort((a, b) => b.total - a.total);
  }, [result]);
}

/** Chart 5a — donut of 5-yr OPEX by category. */
export function CostDonut({ result }: CostChartsProps): React.JSX.Element {
  const categoryTotals = useCategoryTotals(result);

  const donutData = React.useMemo(() => {
    const top = categoryTotals.slice(0, 8);
    const rest = categoryTotals.slice(8).reduce((sum, entry) => sum + entry.total, 0);
    return rest > 0 ? [...top, { name: OTHER_LABEL, total: rest }] : top;
  }, [categoryTotals]);

  return (
    <ChartCard
      title="Where the money goes (5-year OPEX)"
      caption="Share of total five-year operating spend by cost category, including the land rental charged on harvest revenue."
    >
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={donutData}
            dataKey="total"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={1}
          >
            {donutData.map((entry, index) => (
              <Cell key={entry.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [formatUsd(Number(value)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Chart 5b — monthly stacked area for the top 6 categories, rest as "Other". */
export function CostMonthlyChart({ result }: CostChartsProps): React.JSX.Element {
  const categoryTotals = useCategoryTotals(result);

  const topSix = React.useMemo(
    () =>
      categoryTotals
        .filter((entry) => entry.name !== RENT_LABEL)
        .slice(0, 6)
        .map((entry) => entry.name),
    [categoryTotals],
  );

  const areaData = React.useMemo(
    () =>
      result.monthly.map((row) => {
        const point: Record<string, number | string> = {
          label: formatMonthShort(row.date),
        };
        let topTotal = 0;
        for (const category of topSix) {
          const value = row.opexByCategory[category] ?? 0;
          point[category] = value;
          topTotal += value;
        }
        point[OTHER_LABEL] = row.opex - topTotal;
        return point;
      }),
    [result, topSix],
  );

  return (
    <ChartCard
      title="Monthly costs by category"
      caption="The six biggest cost categories month by month, with everything else (including rent spikes each October) grouped as 'Other'."
    >
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={areaData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatUsdCompact(Number(v))}
          />
          <Tooltip formatter={(value, name) => [formatUsd(Number(value)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {[...topSix, OTHER_LABEL].map((category, index) => (
            <Area
              key={category}
              dataKey={category}
              stackId="costs"
              stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              fillOpacity={0.7}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
