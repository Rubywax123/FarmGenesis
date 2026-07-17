import type { ScenarioInput } from "@/engine/types";

/** Shared props for every editor tab: current input and an immutable updater. */
export interface TabProps {
  input: ScenarioInput;
  onChange: (update: (previous: ScenarioInput) => ScenarioInput) => void;
}

/** Convert "YYYY-MM-DD" to the value of an <input type="month">. */
export function toMonthValue(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Convert an <input type="month"> value to first-of-month ISO date. */
export function fromMonthValue(monthValue: string): string {
  return `${monthValue}-01`;
}
