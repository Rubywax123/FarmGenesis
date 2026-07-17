"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { calculateScenario } from "@/engine";
import type { ScenarioInput } from "@/engine/types";
import { formatUsd } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
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
import { ConfirmDialog, PromptDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";

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
    <>
      <PageHeader
        title={name}
        description={location ?? "No location set"}
        backHref="/"
        backLabel="All projects"
        actions={
          <Button variant="outline" onClick={() => setRenameOpen(true)}>
            Rename project
          </Button>
        }
      />
      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename project"
        label="Project name"
        defaultValue={name}
        submitLabel="Save"
        onSubmit={renameProject}
      />
    </>
  );
}

function ScenarioKpis({ input }: { input: ScenarioInput }): React.JSX.Element {
  const result = React.useMemo(() => calculateScenario(input), [input]);

  const kpis = [
    { label: "5-yr revenue", value: result.kpis.fiveYearRevenue },
    { label: "5-yr EBITDA", value: result.kpis.fiveYearEbitda },
    { label: "Peak loan", value: result.kpis.peakLoanBalance },
  ];

  return (
    <div className="grid gap-4 rounded-lg bg-[var(--color-secondary)]/50 p-4 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <div key={kpi.label}>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {kpi.label}
          </p>
          <p className="text-lg font-semibold tabular-nums">{formatUsd(kpi.value)}</p>
        </div>
      ))}
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
  const [deleteTarget, setDeleteTarget] = React.useState<ScenarioRecord | null>(null);
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

  async function confirmDeleteScenario(): Promise<void> {
    if (!deleteTarget) return;
    setError(null);
    const response = await fetch(
      `/api/projects/${projectId}/scenarios/${deleteTarget.id}`,
      { method: "DELETE" },
    );
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
    <div className="space-y-5">
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
        <EmptyState
          title="No scenarios yet"
          description="Create a scenario to start from the Zimbabwe blueberry base case defaults, then adjust the assumptions."
          action={<Button onClick={() => setCreateOpen(true)}>Create scenario</Button>}
        />
      ) : (
        <div className="grid gap-5">
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="transition-shadow hover:shadow-md">
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
              <CardFooter className="justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/projects/${projectId}/scenarios/${scenario.id}`}>
                    Open
                  </ButtonLink>
                  <ButtonLink
                    variant="outline"
                    href={`/projects/${projectId}/scenarios/${scenario.id}/edit`}
                  >
                    Edit
                  </ButtonLink>
                  <Button variant="outline" onClick={() => duplicateScenario(scenario)}>
                    Duplicate
                  </Button>
                  {!scenario.isBase ? (
                    <Button variant="secondary" onClick={() => setAsBase(scenario)}>
                      Set as base
                    </Button>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                  onClick={() => setDeleteTarget(scenario)}
                >
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete scenario?"
        description={`"${deleteTarget?.name ?? ""}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete scenario"
        onConfirm={confirmDeleteScenario}
      />
    </div>
  );
}
