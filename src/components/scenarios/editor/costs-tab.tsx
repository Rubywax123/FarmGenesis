"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/field";
import { MONTH_NAMES } from "@/engine/types";
import type { ScenarioInput } from "@/engine/types";
import { formatUsd } from "@/lib/format";
import type { TabProps } from "./types";

function renameKey<T>(
  record: Record<string, T>,
  from: string,
  to: string,
): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    next[key === from ? to : key] = value;
  }
  return next;
}

function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function CostsTab({ input, onChange }: TabProps): React.JSX.Element {
  const [addOpen, setAddOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<string | null>(null);

  const { categories, monthlyBase, factorsPhase1, factorsPhase2 } = input.costBase;

  const monthlyTotals = MONTH_NAMES.map((month) =>
    categories.reduce((sum, category) => sum + (monthlyBase[month]?.[category] ?? 0), 0),
  );

  function setCell(month: string, category: string, value: number): void {
    onChange((prev) => ({
      ...prev,
      costBase: {
        ...prev.costBase,
        monthlyBase: {
          ...prev.costBase.monthlyBase,
          [month]: { ...prev.costBase.monthlyBase[month], [category]: value },
        },
      },
    }));
  }

  function setFactor(phase: 1 | 2, category: string, value: number): void {
    onChange((prev) => ({
      ...prev,
      costBase: {
        ...prev.costBase,
        ...(phase === 1
          ? { factorsPhase1: { ...prev.costBase.factorsPhase1, [category]: value } }
          : { factorsPhase2: { ...prev.costBase.factorsPhase2, [category]: value } }),
      },
    }));
  }

  function addCategory(name: string): void {
    onChange((prev) => {
      if (prev.costBase.categories.includes(name)) return prev;
      const monthlyBaseNext = { ...prev.costBase.monthlyBase };
      for (const month of MONTH_NAMES) {
        monthlyBaseNext[month] = { ...monthlyBaseNext[month], [name]: 0 };
      }
      return {
        ...prev,
        costBase: {
          categories: [...prev.costBase.categories, name],
          monthlyBase: monthlyBaseNext,
          factorsPhase1: { ...prev.costBase.factorsPhase1, [name]: 1 },
          factorsPhase2: { ...prev.costBase.factorsPhase2, [name]: 1 },
        },
      };
    });
  }

  function renameCategory(from: string, to: string): void {
    onChange((prev) => {
      if (from === to || prev.costBase.categories.includes(to)) return prev;
      const monthlyBaseNext: ScenarioInput["costBase"]["monthlyBase"] = {};
      for (const [month, values] of Object.entries(prev.costBase.monthlyBase)) {
        monthlyBaseNext[month] = renameKey(values, from, to);
      }
      return {
        ...prev,
        costBase: {
          categories: prev.costBase.categories.map((c) => (c === from ? to : c)),
          monthlyBase: monthlyBaseNext,
          factorsPhase1: renameKey(prev.costBase.factorsPhase1, from, to),
          factorsPhase2: renameKey(prev.costBase.factorsPhase2, from, to),
        },
      };
    });
  }

  function removeCategory(category: string): void {
    onChange((prev) => {
      const monthlyBaseNext: ScenarioInput["costBase"]["monthlyBase"] = {};
      for (const [month, values] of Object.entries(prev.costBase.monthlyBase)) {
        monthlyBaseNext[month] = removeKey(values, category);
      }
      return {
        ...prev,
        costBase: {
          categories: prev.costBase.categories.filter((c) => c !== category),
          monthlyBase: monthlyBaseNext,
          factorsPhase1: removeKey(prev.costBase.factorsPhase1, category),
          factorsPhase2: removeKey(prev.costBase.factorsPhase2, category),
        },
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Monthly cost base</h3>
          <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">
            Costs are on a 12 ha basis in USD. Each category is scaled by its Phase 1
            factor while only Block 1 is planted, and by its Phase 2 factor once Block 2
            goes in. Rent stays at factor 0 — it is charged as a share of harvest revenue
            instead.
          </p>
        </div>
        <Button variant="outline" onClick={() => setAddOpen(true)}>
          Add category
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full min-w-[1400px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
              <th className="sticky left-0 z-10 bg-[var(--color-muted)] px-3 py-2 text-left font-semibold">
                Category
              </th>
              <th className="px-2 py-2 text-right font-semibold">Phase 1 ×</th>
              <th className="px-2 py-2 text-right font-semibold">Phase 2 ×</th>
              {MONTH_NAMES.map((month) => (
                <th key={month} className="px-2 py-2 text-right font-semibold">
                  {month}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr
                key={category}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-secondary)]/30"
              >
                <td className="sticky left-0 z-10 max-w-52 bg-[var(--color-card)] px-3 py-1.5 font-medium">
                  <button
                    type="button"
                    className="truncate text-left underline-offset-2 hover:underline"
                    title={`Rename "${category}"`}
                    onClick={() => setRenameTarget(category)}
                  >
                    {category}
                  </button>
                </td>
                <td className="px-1 py-1.5">
                  <NumberInput
                    aria-label={`${category} phase 1 factor`}
                    className="h-8 w-20 text-right text-xs"
                    step={0.05}
                    value={factorsPhase1[category] ?? 0}
                    onValueChange={(value) => setFactor(1, category, value)}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <NumberInput
                    aria-label={`${category} phase 2 factor`}
                    className="h-8 w-20 text-right text-xs"
                    step={0.05}
                    value={factorsPhase2[category] ?? 0}
                    onValueChange={(value) => setFactor(2, category, value)}
                  />
                </td>
                {MONTH_NAMES.map((month) => (
                  <td key={month} className="px-1 py-1.5">
                    <NumberInput
                      aria-label={`${category} ${month}`}
                      className="h-8 w-24 text-right text-xs tabular-nums"
                      min={0}
                      step={10}
                      value={monthlyBase[month]?.[category] ?? 0}
                      onValueChange={(value) => setCell(month, category, value)}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                    onClick={() => removeCategory(category)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-secondary)]/50 font-semibold">
              <td className="sticky left-0 z-10 bg-[var(--color-secondary)] px-3 py-2">
                Monthly total (12 ha basis)
              </td>
              <td />
              <td />
              {monthlyTotals.map((total, index) => (
                <td
                  key={MONTH_NAMES[index]}
                  className="px-2 py-2 text-right tabular-nums"
                >
                  {formatUsd(total)}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <PromptDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add cost category"
        description="The category starts at $0 for all months with scaling factors of 1."
        label="Category name"
        placeholder="e.g. Security"
        submitLabel="Add"
        onSubmit={(name) => addCategory(name)}
      />

      <PromptDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title="Rename category"
        label="Category name"
        defaultValue={renameTarget ?? ""}
        submitLabel="Rename"
        onSubmit={(name) => {
          if (renameTarget) renameCategory(renameTarget, name);
        }}
      />
    </div>
  );
}
