"use client";

import type { ScenarioResult } from "@/engine/types";
import {
  formatDscr,
  formatMonthLong,
  formatTonnes,
  formatUsd,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

interface TablesProps {
  result: ScenarioResult;
}

/** Chart 6 — annual summary table for the five project years. */
export function AnnualSummaryTable({ result }: TablesProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <THead>
            <TR>
              <TH>Project year</TH>
              <TH>Area (ha)</TH>
              <TH>Production</TH>
              <TH>Revenue</TH>
              <TH>OPEX</TH>
              <TH>EBITDA</TH>
              <TH>Interest</TH>
              <TH>Drawdowns</TH>
              <TH>Repayments</TH>
              <TH>Closing loan</TH>
              <TH>DSCR</TH>
            </TR>
          </THead>
          <TBody>
            {result.annual.map((row) => (
              <TR key={row.projectYear}>
                <TD>Year {row.projectYear}</TD>
                <TD>{row.areaHa}</TD>
                <TD>{formatTonnes(row.productionT)}</TD>
                <TD>{formatUsd(row.revenue)}</TD>
                <TD>{formatUsd(row.opex)}</TD>
                <TD
                  className={
                    row.ebitda < 0 ? "text-[var(--color-destructive)]" : undefined
                  }
                >
                  {formatUsd(row.ebitda)}
                </TD>
                <TD>{formatUsd(row.interest)}</TD>
                <TD>{formatUsd(row.drawdowns)}</TD>
                <TD>{formatUsd(row.repayments)}</TD>
                <TD>{formatUsd(row.closingLoanBalance)}</TD>
                <TD>{formatDscr(row.dscr)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Each project year runs July to June. DSCR (debt service cover) shows operating
          profit relative to interest plus repayments — above 1× means the farm covers its
          debt payments from operations.
        </p>
      </CardContent>
    </Card>
  );
}

/** Chart 7 — rental schedule per harvest year. */
export function RentalScheduleTable({ result }: TablesProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rental schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <THead>
            <TR>
              <TH>Harvest year</TH>
              <TH>Gross harvest income</TH>
              <TH>Rental %</TH>
              <TH>Rental due</TH>
              <TH>Payment date</TH>
              <TH>Paid inside model</TH>
            </TR>
          </THead>
          <TBody>
            {result.rentalSchedule.map((row) => (
              <TR key={row.harvestYear}>
                <TD>{row.harvestYear}</TD>
                <TD>{formatUsd(row.harvestGross)}</TD>
                <TD>{(row.rentalPercent * 100).toFixed(0)}%</TD>
                <TD>{formatUsd(row.rentalAmount)}</TD>
                <TD>{formatMonthLong(row.paymentDate)}</TD>
                <TD>{row.insideModelWindow ? "Yes" : "No"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Land rent is one lump sum per harvest year — a fixed share of that year's full
          harvest revenue, paid in October. A payment falling after the model ends is not
          paid inside the model.
        </p>
      </CardContent>
    </Card>
  );
}
