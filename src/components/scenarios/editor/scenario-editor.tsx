"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import type { ScenarioInput } from "@/engine/types";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BasicsTab } from "./basics-tab";
import { CostsTab } from "./costs-tab";
import { FinanceTab } from "./finance-tab";
import { HarvestTab } from "./harvest-tab";
import { PlantingTab } from "./planting-tab";

interface ScenarioEditorProps {
  projectId: string;
  projectName: string;
  scenarioId: string;
  initialName: string;
  isBase: boolean;
  initialInput: ScenarioInput;
}

export function ScenarioEditor({
  projectId,
  projectName,
  scenarioId,
  initialName,
  isBase,
  initialInput,
}: ScenarioEditorProps): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = React.useState("basics");
  const [name, setName] = React.useState(initialName);
  const [input, setInput] = React.useState(initialInput);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const handleChange = React.useCallback(
    (update: (previous: ScenarioInput) => ScenarioInput) => {
      setInput(update);
      setDirty(true);
      setSaved(false);
    },
    [],
  );

  function handleNameChange(newName: string): void {
    setName(newName);
    setDirty(true);
    setSaved(false);
  }

  async function save(): Promise<void> {
    setErrors([]);
    setSaved(false);

    const trimmedName = name.trim();
    const messages: string[] = [];
    if (!trimmedName) {
      messages.push("Scenario name is required.");
    }

    const parsed = scenarioInputSchema.safeParse(input);
    if (!parsed.success) {
      messages.push(...parsed.error.errors.map((issue) => issue.message));
    }

    if (messages.length > 0) {
      setErrors(messages);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/scenarios/${scenarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, input: parsed.data }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setErrors([data.error ?? "Could not save the scenario."]);
        return;
      }
      setDirty(false);
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const tabProps = { input, onChange: handleChange };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name || "Untitled scenario"}
            {isBase ? <Badge>Base case</Badge> : null}
          </span>
        }
        description="Edit the assumptions below, then save. Results recompute automatically when the scenario is viewed."
        backHref={`/projects/${projectId}`}
        backLabel={`Back to ${projectName}`}
        actions={
          <div className="flex items-center gap-3">
            {saved ? (
              <span className="text-sm text-[var(--color-primary)]">Saved</span>
            ) : dirty ? (
              <span className="text-sm text-[var(--color-muted-foreground)]">
                Unsaved changes
              </span>
            ) : null}
            <ButtonLink
              variant="outline"
              href={`/projects/${projectId}/scenarios/${scenarioId}/drivers`}
            >
              Explore drivers
            </ButtonLink>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save scenario"}
            </Button>
          </div>
        }
      />

      {errors.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Please fix the following before saving:</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="planting">Planting</TabsTrigger>
          <TabsTrigger value="harvest">Harvest curve</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="basics">
          <BasicsTab {...tabProps} name={name} onNameChange={handleNameChange} />
        </TabsContent>
        <TabsContent value="planting">
          <PlantingTab {...tabProps} />
        </TabsContent>
        <TabsContent value="harvest">
          <HarvestTab {...tabProps} />
        </TabsContent>
        <TabsContent value="costs">
          <CostsTab {...tabProps} />
        </TabsContent>
        <TabsContent value="finance">
          <FinanceTab {...tabProps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
