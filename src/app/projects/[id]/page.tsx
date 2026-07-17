import { notFound } from "next/navigation";
import { ProjectHeader, ScenarioList } from "@/components/scenarios/scenario-list";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      scenarios: {
        orderBy: [{ isBase: "desc" }, { updatedAt: "desc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const scenarios = project.scenarios.map((scenario) => ({
    id: scenario.id,
    projectId: scenario.projectId,
    name: scenario.name,
    isBase: scenario.isBase,
    input: scenarioInputSchema.parse(scenario.input) as ScenarioInput,
  }));

  return (
    <div className="space-y-8">
      <ProjectHeader
        projectId={project.id}
        name={project.name}
        location={project.location}
      />
      <ScenarioList projectId={project.id} initialScenarios={scenarios} />
    </div>
  );
}
