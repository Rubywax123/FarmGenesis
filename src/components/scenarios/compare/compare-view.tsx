"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateScenario } from "@/engine";
import type { ScenarioInput, ScenarioResult } from "@/engine/types";
import {
  formatMonthLong,
  formatTonnes,
  formatUsd,
  formatUsdCompact,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHART_COLORS, ChartCard } from "@/components/scenarios/dashboard/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export interface CompareScenario {
  id: string;
  name: string;
  isBase: boolean;
  input: ScenarioInput;
}

interface CompareViewProps {
  projectId: string;
  scenarios: CompareScenario[];
  scenarioA: CompareScenario;
  scenarioB: CompareScenario;
}

type Goodness = "higher-better" | "lower-better";

interface MetricRow {
  label: string;
  valueA: string;
  valueB: string;
  delta: string;
  /** Positive = B minus A is favorable (green), negative = unfavorable (red). */
  sentiment: -1 | 0 | 1;
}

function currencyMetric(
  label: string,
  a: number,
  b: number,
  goodness: Goodness,
): MetricRow {
  const delta = b - a;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const favorable = goodness === "higher-better" ? delta : -delta;
  return {
    label,
    valueA: formatUsd(a),
    valueB: formatUsd(b),
    delta: delta === 0 ? "—" : `${sign}${formatUsd(Math.abs(delta))}`,
    sentiment: favorable > 0 ? 1 : favorable < 0 ? -1 : 0,
  };
}

function buildMetrics(a: ScenarioResult, b: ScenarioResult): MetricRow[] {
  const productionDelta = (b.kpis.totalProductionKg - a.kpis.totalProductionKg) / 1000;

  const repaidLabel = (result: ScenarioResult): string =>
    result.kpis.loanFullyRepaidDate
      ? `${formatMonthLong(result.kpis.loanFullyRepaidDate)} (M${result.kpis.loanFullyRepaidMonth})`
      : "Not repaid";

  const repaidA = a.kpis.loanFullyRepaidMonth;
  const repaidB = b.kpis.loanFullyRepaidMonth;
  let repaidDelta = "—";
  let repaidSentiment: -1 | 0 | 1 = 0;
  if (repaidA !== null && repaidB !== null && repaidA !== repaidB) {
    const months = repaidB - repaidA;
    repaidDelta = `${months > 0 ? "+" : "−"}${Math.abs(months)} months`;
    repaidSentiment = months < 0 ? 1 : -1;
  } else if (repaidA !== null && repaidB === null) {
    repaidDelta = "Never repaid";
    repaidSentiment = -1;
  } else if (repaidA === null && repaidB !== null) {
    repaidDelta = "Now repaid";
    repaidSentiment = 1;
  }

  return [
    {
      label: "Total production",
      valueA: formatTonnes(a.kpis.totalProductionKg / 1000),
      valueB: formatTonnes(b.kpis.totalProductionKg / 1000),
      delta:
        productionDelta === 0
          ? "—"
          : `${productionDelta > 0 ? "+" : "−"}${formatTonnes(Math.abs(productionDelta))}`,
      sentiment: productionDelta > 0 ? 1 : productionDelta < 0 ? -1 : 0,
    },
    currencyMetric(
      "5-yr revenue",
      a.kpis.fiveYearRevenue,
      b.kpis.fiveYearRevenue,
      "higher-better",
    ),
    currencyMetric("5-yr OPEX", a.kpis.fiveYearOpex, b.kpis.fiveYearOpex, "lower-better"),
    currencyMetric(
      "5-yr EBITDA",
      a.kpis.fiveYearEbitda,
      b.kpis.fiveYearEbitda,
      "higher-better",
    ),
    currencyMetric(
      "Peak loan balance",
      a.kpis.peakLoanBalance,
      b.kpis.peakLoanBalance,
      "lower-better",
    ),
    currencyMetric(
      "Total interest",
      a.kpis.totalInterest,
      b.kpis.totalInterest,
      "lower-better",
    ),
    {
      label: "Loan repaid",
      valueA: repaidLabel(a),
      valueB: repaidLabel(b),
      delta: repaidDelta,
      sentiment: repaidSentiment,
    },
    currencyMetric("Closing cash", a.kpis.closingCash, b.kpis.closingCash, "higher-better"),
  ];
}

export function CompareView({
  projectId,
  scenarios,
  scenarioA,
  scenarioB,
}: CompareViewProps): React.JSX.Element {
  const router = useRouter();

  const resultA = React.useMemo(() => calculateScenario(scenarioA.input), [scenarioA]);
  const resultB = React.useMemo(() => calculateScenario(scenarioB.input), [scenarioB]);

  const metrics = React.useMemo(() => buildMetrics(resultA, resultB), [resultA, resultB]);

  const annualData = React.useMemo(() => {
    const years = Math.max(resultA.annual.length, resultB.annual.length);
    return Array.from({ length: years }, (_, index) => ({
      label: `Year ${index + 1}`,
      revenueA: resultA.annual[index]?.revenue ?? null,
      revenueB: resultB.annual[index]?.revenue ?? null,
      ebitdaA: resultA.annual[index]?.ebitda ?? null,
      ebitdaB: resultB.annual[index]?.ebitda ?? null,
    }));
  }, [resultA, resultB]);

  const loanData = React.useMemo(() => {
    const months = Math.max(resultA.monthly.length, resultB.monthly.length);
    return Array.from({ length: months }, (_, index) => ({
      label: `M${index + 1}`,
      loanA: resultA.monthly[index]?.closingLoan ?? null,
      loanB: resultB.monthly[index]?.closingLoan ?? null,
    }));
  }, [resultA, resultB]);

  function navigate(aId: string, bId: string): void {
    router.replace(`/projects/${projectId}/compare?a=${aId}&b=${bId}`);
  }

  return (
    <div className="space-y-6">
      {/* Scenario pickers */}
      <Card className="print:hidden">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pick-a">Scenario A</Label>
            <Select
              id="pick-a"
              value={scenarioA.id}
              onChange={(event) => navigate(event.target.value, scenarioB.id)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                  {scenario.isBase ? " (base)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pick-b">Scenario B</Label>
            <Select
              id="pick-b"
              value={scenarioB.id}
              onChange={(event) => navigate(scenarioA.id, event.target.value)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                  {scenario.isBase ? " (base)" : ""}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI delta table */}
      <Card>
        <CardHeader>
          <CardTitle>Key figures side by side</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <THead>
              <TR>
                <TH>Metric</TH>
                <TH>{scenarioA.name}</TH>
                <TH>{scenarioB.name}</TH>
                <TH>Difference (B − A)</TH>
              </TR>
            </THead>
            <TBody>
              {metrics.map((metric) => (
                <TR key={metric.label}>
                  <TD>{metric.label}</TD>
                  <TD>{metric.valueA}</TD>
                  <TD>{metric.valueB}</TD>
                  <TD
                    className={cn(
                      "font-medium",
                      metric.sentiment === 1 && "text-[var(--color-primary)]",
                      metric.sentiment === -1 && "text-[var(--color-destructive)]",
                    )}
                  >
                    {metric.delta}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Green differences favour scenario B, red ones favour scenario A.
          </p>
        </CardContent>
      </Card>

      {/* Overlaid charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Revenue and EBITDA by year"
          caption="Solid lines are sales income, dashed lines are operating profit — one colour per scenario."
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={annualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatUsdCompact(Number(v))}
              />
              <Tooltip
                formatter={(value, name) => [formatUsd(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="revenueA"
                name={`${scenarioA.name} — revenue`}
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="revenueB"
                name={`${scenarioB.name} — revenue`}
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="ebitdaA"
                name={`${scenarioA.name} — EBITDA`}
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                dataKey="ebitdaB"
                name={`${scenarioB.name} — EBITDA`}
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Loan balance over time"
          caption="How much working capital each scenario has outstanding, month by month."
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={loanData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatUsdCompact(Number(v))}
              />
              <Tooltip
                formatter={(value, name) => [formatUsd(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                dataKey="loanA"
                name={scenarioA.name}
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="loanB"
                name={scenarioB.name}
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
