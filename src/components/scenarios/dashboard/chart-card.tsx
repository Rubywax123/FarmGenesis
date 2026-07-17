"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shared chart palette — green/earth tones from the design system. */
export const CHART_COLORS = {
  green: "#2f6b3a",
  lightGreen: "#7fa96b",
  paleGreen: "#b9d2a8",
  red: "#b42318",
  gold: "#b8912f",
  earth: "#8c7a5b",
  slate: "#4d7c8a",
  ink: "#22301f",
} as const;

/** Categorical palette for donut / stacked series. */
export const SERIES_COLORS = [
  "#2f6b3a",
  "#b8912f",
  "#7fa96b",
  "#8c7a5b",
  "#4d7c8a",
  "#c2b280",
  "#5b8266",
  "#7a5c14",
  "#9db17c",
] as const;

interface ChartCardProps {
  title: string;
  /** One plain-language sentence shown under the chart. */
  caption: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Card wrapper for every dashboard chart: title, chart, caption underneath. */
export function ChartCard({
  title,
  caption,
  headerExtra,
  children,
  className,
}: ChartCardProps): React.JSX.Element {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>{title}</CardTitle>
        {headerExtra}
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <p className="text-sm text-[var(--color-muted-foreground)]">{caption}</p>
      </CardContent>
    </Card>
  );
}

interface PeriodToggleProps {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
}

/** Small segmented monthly/annual switch used by charts that support both views. */
export function PeriodToggle({ value, onChange }: PeriodToggleProps): React.JSX.Element {
  return (
    <div className="inline-flex rounded-md bg-[var(--color-muted)] p-0.5 text-xs font-medium">
      {(["monthly", "annual"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded px-3 py-1 capitalize transition-colors",
            value === option
              ? "bg-[var(--color-card)] shadow-sm"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
