"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  htmlFor: string;
  /** Unit shown after the label, e.g. "USD/kg", "ha", "%". */
  unit?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/** Labeled form field with unit, hint, and inline error message. */
export function Field({
  label,
  htmlFor,
  unit,
  hint,
  error,
  children,
  className,
}: FieldProps): React.JSX.Element {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {unit ? (
          <span className="ml-1 font-normal text-[var(--color-muted-foreground)]">
            ({unit})
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--color-destructive)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onValueChange: (value: number) => void;
}

/**
 * Numeric input that keeps a local text state so users can type freely
 * (e.g. "0.", "-") and commits the parsed number on each valid change.
 */
export function NumberInput({
  value,
  onValueChange,
  ...props
}: NumberInputProps): React.JSX.Element {
  const [text, setText] = React.useState(String(value));
  const lastValue = React.useRef(value);

  React.useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value;
      setText(String(value));
    }
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        const parsed = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(parsed)) {
          lastValue.current = parsed;
          onValueChange(parsed);
        }
      }}
      onBlur={() => setText(String(lastValue.current))}
      {...props}
    />
  );
}
