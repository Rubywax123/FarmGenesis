"use client";

import { NumberInput } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { MONTH_NAMES } from "@/engine/types";
import { cn } from "@/lib/utils";
import type { TabProps } from "./types";

export function HarvestTab({ input, onChange }: TabProps): React.JSX.Element {
  const totalPercent = input.harvestCurve.reduce((sum, v) => sum + v, 0) * 100;
  const isValid = Math.abs(totalPercent - 100) < 0.01;
  const maxFraction = Math.max(...input.harvestCurve, 0.0001);

  function setMonth(index: number, percent: number): void {
    onChange((prev) => ({
      ...prev,
      harvestCurve: prev.harvestCurve.map((v, i) => (i === index ? percent / 100 : v)),
    }));
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h3 className="text-lg font-semibold">Harvest spread by month</h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          What share of the year’s crop is picked in each calendar month. The twelve
          values must add up to 100%.
        </p>
      </div>

      {/* Live bar preview */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex h-40 items-end gap-2">
          {input.harvestCurve.map((fraction, index) => (
            <div key={MONTH_NAMES[index]} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                {fraction > 0 ? `${(fraction * 100).toFixed(0)}%` : ""}
              </span>
              <div
                className="w-full rounded-t bg-[var(--color-primary)] transition-all"
                style={{
                  height: `${(fraction / maxFraction) * 100}%`,
                  minHeight: fraction > 0 ? "4px" : "0",
                }}
              />
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {MONTH_NAMES[index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Running total */}
      <p
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          isValid
            ? "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]"
            : "bg-red-50 text-red-700",
        )}
      >
        Total: <span className="tabular-nums">{totalPercent.toFixed(1)}%</span>
        {isValid ? "— looks good" : "— must equal 100%"}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {MONTH_NAMES.map((month, index) => (
          <div key={month} className="space-y-1.5">
            <Label htmlFor={`harvest-${month}`}>
              {month}{" "}
              <span className="font-normal text-[var(--color-muted-foreground)]">(%)</span>
            </Label>
            <NumberInput
              id={`harvest-${month}`}
              min={0}
              max={100}
              step={1}
              value={input.harvestCurve[index] * 100}
              onValueChange={(value) => setMonth(index, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
