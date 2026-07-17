import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  CompareView,
  type CompareScenario,
} from "@/components/scenarios/compare/compare-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

interface ComparePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function ComparePage({
  params,
  searchParams,
}: ComparePageProps): Promise<React.JSX.Element> {
  const { id: projectId } = await params;
  const { a, b } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenarios: { orderBy: [{ isBase: "desc" }, { updatedAt: "desc" }] },
    },
  });

  if (!project) {
    notFound();
  }

  const scenarios: CompareScenario[] = project.scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    isBase: scenario.isBase,
    input: scenarioInputSchema.parse(scenario.input) as ScenarioInput,
  }));

  if (scenarios.length < 2) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Compare scenarios"
          backHref={`/projects/${projectId}`}
          backLabel={`Back to ${project.name}`}
        />
        <EmptyState
          title="Nothing to compare yet"
          description="You need at least two scenarios in this project. Duplicate an existing scenario, change an assumption, and come back."
          action={
            <ButtonLink href={`/projects/${projectId}`}>Back to project</ButtonLink>
          }
        />
      </div>
    );
  }

  const scenarioA = scenarios.find((s) => s.id === a) ?? scenarios[0];
  const scenarioB =
    scenarios.find((s) => s.id === b && s.id !== scenarioA.id) ??
    scenarios.find((s) => s.id !== scenarioA.id) ??
    scenarios[1];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Compare scenarios"
        description={`${scenarioA.name} vs ${scenarioB.name} — same engine, different assumptions.`}
        backHref={`/projects/${projectId}`}
        backLabel={`Back to ${project.name}`}
      />
      <CompareView
        projectId={projectId}
        scenarios={scenarios}
        scenarioA={scenarioA}
        scenarioB={scenarioB}
      />
    </div>
  );
}
