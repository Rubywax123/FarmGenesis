"use client";

import * as React from "react";
import { calculateScenario } from "@/engine";
import type { ScenarioInput } from "@/engine/types";
import { CashChart } from "./cash-chart";
import { CashflowChart } from "./cashflow-chart";
import { CostDonut, CostMonthlyChart } from "./cost-charts";
import { KpiCards } from "./kpi-cards";
import { LoanChart } from "./loan-chart";
import { ProductionChart } from "./production-chart";
import { AnnualSummaryTable, RentalScheduleTable } from "./summary-tables";

interface ScenarioDashboardProps {
  input: ScenarioInput;
}

/**
 * The bank-facing dashboard. Results are computed here in the browser from the
 * saved assumptions — nothing is stored in the database.
 */
export function ScenarioDashboard({ input }: ScenarioDashboardProps): React.JSX.Element {
  const result = React.useMemo(() => calculateScenario(input), [input]);

  return (
    <div className="space-y-6">
      <KpiCards result={result} />
      <CashflowChart result={result} />
      <div className="grid gap-6 xl:grid-cols-2">
        <LoanChart result={result} />
        <CashChart result={result} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ProductionChart result={result} />
        <CostDonut result={result} />
      </div>
      <CostMonthlyChart result={result} />
      <AnnualSummaryTable result={result} />
      <RentalScheduleTable result={result} />
    </div>
  );
}
