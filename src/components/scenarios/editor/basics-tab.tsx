"use client";

import { Field, NumberInput } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fromMonthValue, toMonthValue, type TabProps } from "./types";

interface BasicsTabProps extends TabProps {
  name: string;
  onNameChange: (name: string) => void;
}

export function BasicsTab({
  input,
  onChange,
  name,
  onNameChange,
}: BasicsTabProps): React.JSX.Element {
  return (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
      <Field
        label="Scenario name"
        htmlFor="scenario-name"
        hint="Shown on the project page and in comparisons."
        className="sm:col-span-2"
      >
        <Input
          id="scenario-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>

      <Field
        label="Model start"
        htmlFor="model-start"
        hint="First month of the 5-year model."
      >
        <Input
          id="model-start"
          type="month"
          value={toMonthValue(input.modelStart)}
          onChange={(event) =>
            onChange((prev) => ({
              ...prev,
              modelStart: fromMonthValue(event.target.value),
            }))
          }
        />
      </Field>

      <Field label="Model length" htmlFor="model-months" unit="months">
        <NumberInput
          id="model-months"
          min={1}
          step={1}
          value={input.modelMonths}
          onValueChange={(value) =>
            onChange((prev) => ({ ...prev, modelMonths: Math.round(value) }))
          }
        />
      </Field>

      <Field
        label="Selling price"
        htmlFor="price-per-kg"
        unit="USD/kg"
        hint="Average blueberry farm-gate price."
      >
        <NumberInput
          id="price-per-kg"
          min={0}
          step={0.1}
          value={input.sellingPricePerKg}
          onValueChange={(value) =>
            onChange((prev) => ({ ...prev, sellingPricePerKg: value }))
          }
        />
      </Field>

      <Field
        label="Annual cost inflation"
        htmlFor="inflation"
        unit="% per year"
        hint="0 keeps costs flat across all five years."
      >
        <NumberInput
          id="inflation"
          step={0.5}
          value={input.annualCostInflation * 100}
          onValueChange={(value) =>
            onChange((prev) => ({ ...prev, annualCostInflation: value / 100 }))
          }
        />
      </Field>

      <Field
        label="Opening cash balance"
        htmlFor="opening-cash"
        unit="USD"
        hint="Cash on hand at model start."
      >
        <NumberInput
          id="opening-cash"
          step={1000}
          value={input.openingCashBalance}
          onValueChange={(value) =>
            onChange((prev) => ({ ...prev, openingCashBalance: value }))
          }
        />
      </Field>
    </div>
  );
}
