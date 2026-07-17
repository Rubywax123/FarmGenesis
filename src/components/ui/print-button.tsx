"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog — the print stylesheet handles the rest. */
export function PrintButton(): React.JSX.Element {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      Print
    </Button>
  );
}
