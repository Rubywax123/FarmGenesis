import { MONTH_NAMES, type MonthName } from "./types";

/** Parse an ISO date string (YYYY-MM-DD) into year, month (1–12), day. */
export function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** Format year/month/day as ISO date string (YYYY-MM-DD). */
export function toIsoDate(year: number, month: number, day = 1): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Return the calendar date for model month m (1-based).
 * Month 1 equals modelStart; each subsequent month advances one calendar month.
 */
export function modelMonthDate(modelStart: string, month: number): string {
  const { year, month: startMonth } = parseIsoDate(modelStart);
  const zeroBased = startMonth - 1 + (month - 1);
  const calYear = year + Math.floor(zeroBased / 12);
  const calMonth = (zeroBased % 12) + 1;
  return toIsoDate(calYear, calMonth);
}

/** Calendar month (1–12) for model month m. */
export function calMonth(modelStart: string, month: number): number {
  return parseIsoDate(modelMonthDate(modelStart, month)).month;
}

/** Calendar year for model month m. */
export function calYear(modelStart: string, month: number): number {
  return parseIsoDate(modelMonthDate(modelStart, month)).year;
}

/** Project year (Jul–Jun): floor((m-1)/12) + 1. */
export function projectYear(month: number): number {
  return Math.floor((month - 1) / 12) + 1;
}

/** Three-letter month name for calendar month 1–12. */
export function monthName(calMonthNum: number): MonthName {
  return MONTH_NAMES[calMonthNum - 1];
}

/** Compare two ISO dates: true if a <= b. */
export function isoDateLte(a: string, b: string): boolean {
  return a <= b;
}

/** First day of April for a given calendar harvest year. */
export function harvestSeasonStart(firstHarvestYear: number): string {
  return toIsoDate(firstHarvestYear, 4, 1);
}
