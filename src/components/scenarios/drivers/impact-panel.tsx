"use client";

import * as React from "react";
import type { ScenarioResult } from "@/engine/types";
import { formatMonthLong, formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImpactPanelProps {
  baseline: ScenarioResult;
  trial: ScenarioResult;
  dirty: boolean;
  saving: boolean;
  onResetAll: () => void;
  onSave: () => void;
}

interface MetricDelta {
  label: string;
  value: string;
  delta: string | null;
  /** true = green, false = red, null = neutral/no change */
  good: boolean | null;
  caption: string;
}

function usdDelta(trial: number, base: number, higherIsBetter: boolean): {
  delta: string | null;
  good: boolean | null;
} {
  const diff = trial - base;
  if (Math.abs(diff) < 0.5) return { delta: null, good: null };
  const sign = diff > 0 ? "+" : "−";
  return {
    delta: `${sign}${formatUsd(Math.abs(diff))}`,
    good: higherIsBetter ? diff > 0 : diff < 0,
  };
}

function repaidDelta(
  trial: ScenarioResult,
  base: ScenarioResult,
): { value: string; delta: string | null; good: boolean | null } {
  const trialMonth = trial.kpis.loanFullyRepaidMonth;
  const baseMonth = base.kpis.loanFullyRepaidMonth;
  const value = trial.kpis.loanFullyRepaidDate
    ? `${formatMonthLong(trial.kpis.loanFullyRepaidDate)} (month ${trialMonth})`
    : "Not repaid";

  if (trialMonth === baseMonth) return { value, delta: null, good: null };
  if (trialMonth === null) return { value, delta: "no longer repaid", good: false };
  if (baseMonth === null) return { value, delta: "now repaid in the model", good: true };

  const diff = trialMonth - baseMonth;
  return {
    value,
    delta: `${Math.abs(diff)} month${Math.abs(diff) === 1 ? "" : "s"} ${diff < 0 ? "earlier" : "later"}`,
    good: diff < 0,
  };
}

/**
 * Live readout: 5-yr EBITDA, peak loan balance, and loan-repaid month for the
 * trial values, each with a green/red delta vs the saved scenario, plus the
 * clearly separated save / reset-all controls.
 */
export function ImpactPanel({
  baseline,
  trial,
  dirty,
  saving,
  onResetAll,
  onSave,
}: ImpactPanelProps): React.JSX.Element {
  const ebitda = usdDelta(
    trial.kpis.fiveYearEbitda,
    baseline.kpis.fiveYearEbitda,
    true,
  );
  const peak = usdDelta(
    trial.kpis.peakLoanBalance,
    baseline.kpis.peakLoanBalance,
    false,
  );
  const repaid = repaidDelta(trial, baseline);

  const metrics: MetricDelta[] = [
    {
      label: "5-yr EBITDA",
      value: formatUsd(trial.kpis.fiveYearEbitda),
      delta: ebitda.delta,
      good: ebitda.good,
      caption: "Operating profit before interest with these trial values.",
    },
    {
      label: "Peak loan balance",
      value: formatUsd(trial.kpis.peakLoanBalance),
      delta: peak.delta,
      good: peak.good,
      caption: "The most working capital the project would need.",
    },
    {
      label: "Loan repaid",
      value: repaid.value,
      delta: repaid.delta,
      good: repaid.good,
      caption: "When the facility would be fully paid back.",
    },
  ];

  return (
    <Card className="border-[var(--color-primary)]/40 bg-[var(--color-secondary)]/40">
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-0.5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {metric.label}
              </p>
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums">
                  {metric.value}
                </span>
                {metric.delta ? (
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      metric.good === true && "text-[var(--color-primary)]",
                      metric.good === false && "text-[var(--color-destructive)]",
                    )}
                  >
                    {metric.delta}
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    no change
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {metric.caption}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {dirty
              ? "These are trial values — nothing changes until you save."
              : "Move any slider to see how the result changes. Nothing is saved while you experiment."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onResetAll} disabled={!dirty || saving}>
              Reset all
            </Button>
            <Button onClick={onSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save these values to scenario"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
