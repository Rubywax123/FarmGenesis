"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
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

  async function deleteProject(project: ProjectSummary): Promise<void> {
    if (
      !window.confirm(
        `Delete "${project.name}" and all ${project.scenarioCount} scenario(s)? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete project");
      return;
    }
    await refreshProjects();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">FarmForecast</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            Build and compare five-year farm financial forecasts.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New project</Button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Create your first project to start building forecast scenarios.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setCreateOpen(true)}>Create project</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
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
              <CardFooter className="flex flex-wrap gap-2">
                <ButtonLink href={`/projects/${project.id}`}>Open</ButtonLink>
                <Button variant="outline" onClick={() => setRenameProject(project)}>
                  Rename
                </Button>
                <Button variant="destructive" onClick={() => deleteProject(project)}>
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
    </div>
  );
}
