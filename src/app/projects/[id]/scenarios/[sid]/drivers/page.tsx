import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DriversView } from "@/components/scenarios/drivers/drivers-view";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

interface DriversPageProps {
  params: Promise<{ id: string; sid: string }>;
}

export default async function DriversPage({
  params,
}: DriversPageProps): Promise<React.JSX.Element> {
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
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {scenario.name} — Drivers
            {scenario.isBase ? <Badge>Base case</Badge> : null}
          </span>
        }
        description="Try different assumptions safely — move a slider and watch the result change. Nothing is saved until you choose to save."
        backHref={`/projects/${projectId}/scenarios/${sid}`}
        backLabel="Back to dashboard"
        actions={
          <ButtonLink
            variant="outline"
            href={`/projects/${projectId}/scenarios/${sid}/edit`}
          >
            Edit scenario
          </ButtonLink>
        }
      />
      <DriversView
        projectId={projectId}
        scenarioId={sid}
        savedInput={input}
      />
    </div>
  );
}
