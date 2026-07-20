"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { clampToGuardrails, type DriverDef } from "./driver-defs";

interface DriverCardProps {
  def: DriverDef;
  /** Current trial value, display units. */
  value: number;
  /** Saved scenario value, display units. */
  savedValue: number;
  onValueChange: (value: number) => void;
}

/**
 * One driver: plain-language name and explanation, the saved value, a
 * guardrailed slider plus numeric input, and a per-card reset.
 */
export function DriverCard({
  def,
  value,
  savedValue,
  onValueChange,
}: DriverCardProps): React.JSX.Element {
  const isDirty = value !== savedValue;
  const inputId = `driver-${def.key}`;

  return (
    <Card className={isDirty ? "border-[var(--color-primary)]" : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{def.name}</p>
            <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {def.explanation}
            </p>
          </div>
          {isDirty ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onValueChange(savedValue)}
            >
              Reset
            </Button>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-semibold tabular-nums">
            {def.format(value)}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {isDirty ? `saved: ${def.format(savedValue)}` : "saved value"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Slider
            aria-label={`${def.name} (${def.unit})`}
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onValueChange={(next) => onValueChange(clampToGuardrails(def, next))}
            className="flex-1"
          />
          <NumberInput
            id={inputId}
            aria-label={`${def.name} value (${def.unit})`}
            min={def.min}
            max={def.max}
            step={def.step}
            value={value}
            onValueChange={(next) => onValueChange(clampToGuardrails(def, next))}
            className="w-24 text-right"
          />
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Safe range: {def.format(def.min)} to {def.format(def.max)}.
        </p>
      </CardContent>
    </Card>
  );
}
