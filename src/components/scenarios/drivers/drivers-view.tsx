"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  applyDriverOverrides,
  calculateScenario,
  calculateWithOverrides,
} from "@/engine";
import type { ScenarioInput } from "@/engine";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import { DriverCard } from "./driver-card";
import {
  DRIVER_DEFS,
  driverValuesFromInput,
  overridesFromValues,
  type DriverKey,
  type DriverValues,
} from "./driver-defs";
import { ImpactPanel } from "./impact-panel";
import { ModelExplainer } from "./model-explainer";
import { TornadoChart } from "./tornado-chart";

/** Debounce trial values so the engine doesn't re-run on every slider tick. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface DriversViewProps {
  projectId: string;
  scenarioId: string;
  savedInput: ScenarioInput;
}

/**
 * The Drivers page body: live impact readout, one card per driver, the
 * plain-English model explainer, and the tornado sensitivity chart. All
 * results are computed in the browser; nothing is saved until the user
 * explicitly applies the trial values.
 */
export function DriversView({
  projectId,
  scenarioId,
  savedInput,
}: DriversViewProps): React.JSX.Element {
  const router = useRouter();

  const savedValues = React.useMemo(
    () => driverValuesFromInput(savedInput),
    [savedInput],
  );
  const [values, setValues] = React.useState<DriverValues>(savedValues);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // After a save, the server prop updates — adopt the new baseline.
  React.useEffect(() => {
    setValues(savedValues);
  }, [savedValues]);

  const baseline = React.useMemo(
    () => calculateScenario(savedInput),
    [savedInput],
  );

  const debouncedValues = useDebouncedValue(values, 200);
  const trial = React.useMemo(
    () => calculateWithOverrides(savedInput, overridesFromValues(debouncedValues)),
    [savedInput, debouncedValues],
  );

  const dirty = DRIVER_DEFS.some(
    (def) => values[def.key] !== savedValues[def.key],
  );

  function setDriverValue(key: DriverKey, value: number): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save(): Promise<void> {
    setError(null);

    const nextInput = applyDriverOverrides(savedInput, overridesFromValues(values));
    const parsed = scenarioInputSchema.safeParse(nextInput);
    if (!parsed.success) {
      setError(parsed.error.errors.map((issue) => issue.message).join("; "));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/scenarios/${scenarioId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: parsed.data }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Could not save the scenario.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ImpactPanel
        baseline={baseline}
        trial={trial}
        dirty={dirty}
        saving={saving}
        onResetAll={() => setValues(savedValues)}
        onSave={() => void save()}
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DRIVER_DEFS.map((def) => (
          <DriverCard
            key={def.key}
            def={def}
            value={values[def.key]}
            savedValue={savedValues[def.key]}
            onValueChange={(value) => setDriverValue(def.key, value)}
          />
        ))}
      </div>

      <ModelExplainer input={savedInput} baseline={baseline} />

      <TornadoChart input={savedInput} baseline={baseline} />
    </div>
  );
}
