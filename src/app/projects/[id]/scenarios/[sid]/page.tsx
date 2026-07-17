import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ScenarioDashboard } from "@/components/scenarios/dashboard/scenario-dashboard";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

interface ScenarioPageProps {
  params: Promise<{ id: string; sid: string }>;
}

export default async function ScenarioPage({
  params,
}: ScenarioPageProps): Promise<React.JSX.Element> {
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
            {scenario.name}
            {scenario.isBase ? <Badge>Base case</Badge> : null}
          </span>
        }
        description="All figures below are computed live from the saved assumptions."
        backHref={`/projects/${projectId}`}
        backLabel={`Back to ${scenario.project.name}`}
        actions={
          <>
            <PrintButton />
            <ButtonLink
              variant="outline"
              href={`/projects/${projectId}/scenarios/${sid}/edit`}
            >
              Edit scenario
            </ButtonLink>
          </>
        }
      />
      <ScenarioDashboard input={input} />
    </div>
  );
}
