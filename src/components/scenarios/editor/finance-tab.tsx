"use client";

import { Field, NumberInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { MONTH_NAMES } from "@/engine/types";
import type { TabProps } from "./types";

export function FinanceTab({ input, onChange }: TabProps): React.JSX.Element {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Working-capital loan</h3>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          The loan draws automatically each month to keep cash at zero, then is repaid by
          cash sweep once revenue exceeds costs.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Interest rate"
            htmlFor="loan-rate"
            unit="% per year"
            hint="Charged monthly on the outstanding balance."
          >
            <NumberInput
              id="loan-rate"
              min={0}
              step={0.5}
              value={input.loan.interestRatePA * 100}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  loan: { ...prev.loan, interestRatePA: value / 100 },
                }))
              }
            />
          </Field>
          <Field
            label="Repayment starts"
            htmlFor="repayment-start"
            unit="model month"
            hint="13 means a 12-month repayment holiday."
          >
            <NumberInput
              id="repayment-start"
              min={1}
              step={1}
              value={input.loan.repaymentStartMonth}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  loan: { ...prev.loan, repaymentStartMonth: Math.round(value) },
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Land rental</h3>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Rent is charged once per harvest year as a share of that year’s gross harvest
          revenue, instead of a monthly cost.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Rental share"
            htmlFor="rental-percent"
            unit="% of harvest gross"
          >
            <NumberInput
              id="rental-percent"
              min={0}
              step={1}
              value={input.rental.percentOfHarvestGross * 100}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  rental: { ...prev.rental, percentOfHarvestGross: value / 100 },
                }))
              }
            />
          </Field>
          <Field label="Payment month" htmlFor="rental-month">
            <Select
              id="rental-month"
              value={input.rental.paymentMonth}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  rental: { ...prev.rental, paymentMonth: Number(event.target.value) },
                }))
              }
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
