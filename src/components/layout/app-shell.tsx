import Link from "next/link";

/**
 * Global app frame: header with the FarmForecast wordmark and a
 * consistent max-width content container. All pages render inside this.
 */
export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-primary)] text-xs font-bold text-[var(--color-primary-foreground)]"
            >
              F
            </span>
            <span className="text-base font-semibold tracking-tight">
              Farm<span className="text-[var(--color-primary)]">Forecast</span>
            </span>
          </Link>
          <span className="hidden text-sm text-[var(--color-muted-foreground)] sm:inline">
            Five-year farm financial forecasts
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
