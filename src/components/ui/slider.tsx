"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value: number;
  onValueChange: (value: number) => void;
}

/** Native range input styled to the design system's primary green. */
export function Slider({
  value,
  onValueChange,
  className,
  ...props
}: SliderProps): React.JSX.Element {
  return (
    <input
      type="range"
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
      className={cn(
        "h-6 w-full cursor-pointer accent-[var(--color-primary)]",
        className,
      )}
      {...props}
    />
  );
}
