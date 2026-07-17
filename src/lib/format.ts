const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Format USD for display — round only at display time (0 decimals per SPEC). */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact USD for chart axes, e.g. "$1.2M", "$800K". */
export function formatUsdCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** "2026-07-01" -> "Jul 26" for chart axis labels. */
export function formatMonthShort(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  return `${MONTH_SHORT[month - 1]} ${String(year).slice(2)}`;
}

/** "2026-07-01" -> "July 2026" for headings and KPI values. */
export function formatMonthLong(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Format tonnes with no decimals, e.g. "340 t". */
export function formatTonnes(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} t`;
}

/** Format a DSCR ratio, e.g. "1.8×". */
export function formatDscr(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}×`;
}
