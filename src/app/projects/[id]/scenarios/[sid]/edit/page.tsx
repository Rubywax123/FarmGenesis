import { notFound } from "next/navigation";
import { ScenarioEditor } from "@/components/scenarios/editor/scenario-editor";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

interface EditPageProps {
  params: Promise<{ id: string; sid: string }>;
}

export default async function ScenarioEditPage({
  params,
}: EditPageProps): Promise<React.JSX.Element> {
  const { id: projectId, sid } = await params;

  const scenario = await prisma.scenario.findFirst({
    where: { id: sid, projectId },
    include: { project: true },
  });

  if (!scenario) {
    notFound();
  }

  const input = scenarioInputSchema.parse(scenario.input) as ScenarioInput;

  return (
    <ScenarioEditor
      projectId={projectId}
      projectName={scenario.project.name}
      scenarioId={scenario.id}
      initialName={scenario.name}
      isBase={scenario.isBase}
      initialInput={input}
    />
  );
}
