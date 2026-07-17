"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { calculateScenario } from "@/engine";
import type { ScenarioInput } from "@/engine/types";
import { formatUsd } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PromptDialog } from "@/components/ui/dialog";

export interface ScenarioRecord {
  id: string;
  projectId: string;
  name: string;
  isBase: boolean;
  input: ScenarioInput;
}

interface ProjectHeaderProps {
  projectId: string;
  name: string;
  location: string | null;
}

export function ProjectHeader({
  projectId,
  name,
  location,
}: ProjectHeaderProps): React.JSX.Element {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = React.useState(false);

  async function renameProject(newName: string): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not rename project");
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        ← All projects
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {location ?? "No location set"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setRenameOpen(true)}>
          Rename project
        </Button>
      </div>
      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename project"
        label="Project name"
        defaultValue={name}
        submitLabel="Save"
        onSubmit={renameProject}
      />
    </div>
  );
}

function ScenarioKpis({ input }: { input: ScenarioInput }): React.JSX.Element {
  const result = React.useMemo(() => calculateScenario(input), [input]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          5-yr revenue
        </p>
        <p className="text-lg font-semibold">{formatUsd(result.kpis.fiveYearRevenue)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          5-yr EBITDA
        </p>
        <p className="text-lg font-semibold">{formatUsd(result.kpis.fiveYearEbitda)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Peak loan
        </p>
        <p className="text-lg font-semibold">{formatUsd(result.kpis.peakLoanBalance)}</p>
      </div>
    </div>
  );
}

interface ScenarioListProps {
  projectId: string;
  initialScenarios: ScenarioRecord[];
}

export function ScenarioList({
  projectId,
  initialScenarios,
}: ScenarioListProps): React.JSX.Element {
  const router = useRouter();
  const [scenarios, setScenarios] = React.useState(initialScenarios);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setScenarios(initialScenarios);
  }, [initialScenarios]);

  async function refreshScenarios(): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/scenarios`);
    if (!response.ok) {
      throw new Error("Could not load scenarios");
    }
    setScenarios(await response.json());
  }

  async function createScenario(name: string): Promise<void> {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not create scenario");
    }
    await refreshScenarios();
    router.refresh();
  }

  async function duplicateScenario(scenario: ScenarioRecord): Promise<void> {
    setError(null);
    const response = await fetch(
      `/api/projects/${projectId}/scenarios/${scenario.id}/duplicate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not duplicate scenario");
      return;
    }
    await refreshScenarios();
    router.refresh();
  }

  async function deleteScenario(scenario: ScenarioRecord): Promise<void> {
    if (!window.confirm(`Delete scenario "${scenario.name}"? This cannot be undone.`)) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/projects/${projectId}/scenarios/${scenario.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete scenario");
      return;
    }
    await refreshScenarios();
    router.refresh();
  }

  async function setAsBase(scenario: ScenarioRecord): Promise<void> {
    setError(null);
    const response = await fetch(
      `/api/projects/${projectId}/scenarios/${scenario.id}/set-base`,
      { method: "POST" },
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not set base scenario");
      return;
    }
    await refreshScenarios();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Scenarios</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Duplicate a scenario to test price, yield, or cost changes side by side.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New scenario</Button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {scenarios.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No scenarios yet</CardTitle>
            <CardDescription>
              Create a scenario to start from the Zimbabwe blueberry base case defaults.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setCreateOpen(true)}>Create scenario</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{scenario.name}</CardTitle>
                  {scenario.isBase ? <Badge>Base case</Badge> : null}
                </div>
                <CardDescription>
                  Assumptions saved — results are computed on demand when opened.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScenarioKpis input={scenario.input} />
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <ButtonLink href={`/projects/${projectId}/scenarios/${scenario.id}`}>
                  Open
                </ButtonLink>
                <Button variant="outline" onClick={() => duplicateScenario(scenario)}>
                  Duplicate
                </Button>
                {!scenario.isBase ? (
                  <Button variant="secondary" onClick={() => setAsBase(scenario)}>
                    Set as base
                  </Button>
                ) : null}
                <Button variant="destructive" onClick={() => deleteScenario(scenario)}>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create scenario"
        description="New scenarios start from the Zimbabwe blueberry base case defaults."
        label="Scenario name"
        placeholder="Base case"
        submitLabel="Create"
        onSubmit={createScenario}
      />
    </div>
  );
}
