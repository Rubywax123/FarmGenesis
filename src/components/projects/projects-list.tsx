"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
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

export interface ProjectSummary {
  id: string;
  name: string;
  location: string | null;
  currency: string;
  scenarioCount: number;
}

interface ProjectsListProps {
  initialProjects: ProjectSummary[];
}

export function ProjectsList({ initialProjects }: ProjectsListProps): React.JSX.Element {
  const router = useRouter();
  const [projects, setProjects] = React.useState(initialProjects);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [renameProject, setRenameProject] = React.useState<ProjectSummary | null>(null);
  const [deleteProject, setDeleteProject] = React.useState<ProjectSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function refreshProjects(): Promise<void> {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      throw new Error("Could not load projects");
    }
    setProjects(await response.json());
  }

  async function createProject(name: string): Promise<void> {
    setError(null);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not create project");
    }
    await refreshProjects();
    router.refresh();
  }

  async function renameProjectById(name: string): Promise<void> {
    if (!renameProject) return;
    setError(null);
    const response = await fetch(`/api/projects/${renameProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Could not rename project");
    }
    await refreshProjects();
    router.refresh();
  }

  async function confirmDeleteProject(): Promise<void> {
    if (!deleteProject) return;
    setError(null);
    const response = await fetch(`/api/projects/${deleteProject.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete project");
      return;
    }
    await refreshProjects();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Each project is one farm plan. Open a project to build and compare forecast scenarios."
        actions={<Button onClick={() => setCreateOpen(true)}>New project</Button>}
      />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start building five-year forecast scenarios for the farm."
          action={<Button onClick={() => setCreateOpen(true)}>Create project</Button>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.location ?? "No location set"} · {project.currency}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {project.scenarioCount}{" "}
                    {project.scenarioCount === 1 ? "scenario" : "scenarios"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Open this project to view scenarios, duplicate assumptions, and compare
                  outcomes.
                </p>
              </CardContent>
              <CardFooter className="justify-between gap-2">
                <div className="flex gap-2">
                  <ButtonLink href={`/projects/${project.id}`}>Open</ButtonLink>
                  <Button variant="outline" onClick={() => setRenameProject(project)}>
                    Rename
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                  onClick={() => setDeleteProject(project)}
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
        title="Create project"
        description="Give your farm plan a clear name you will recognise later."
        label="Project name"
        placeholder="20 ha Blueberry Project — Centenary"
        submitLabel="Create"
        onSubmit={createProject}
      />

      <PromptDialog
        open={renameProject !== null}
        onOpenChange={(open) => {
          if (!open) setRenameProject(null);
        }}
        title="Rename project"
        label="Project name"
        defaultValue={renameProject?.name ?? ""}
        submitLabel="Save"
        onSubmit={renameProjectById}
      />

      <ConfirmDialog
        open={deleteProject !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProject(null);
        }}
        title="Delete project?"
        description={`"${deleteProject?.name ?? ""}" and all ${deleteProject?.scenarioCount ?? 0} scenario(s) will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete project"
        onConfirm={confirmDeleteProject}
      />
    </div>
  );
}
