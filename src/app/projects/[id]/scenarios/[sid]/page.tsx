import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

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

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {scenario.name}
            {scenario.isBase ? <Badge>Base case</Badge> : null}
          </span>
        }
        backHref={`/projects/${projectId}`}
        backLabel={`Back to ${scenario.project.name}`}
        actions={
          <ButtonLink href={`/projects/${projectId}/scenarios/${sid}/edit`}>
            Edit scenario
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dashboard coming in Phase 4</CardTitle>
          <CardDescription>
            Assumptions are saved; results recompute when you open or edit a scenario. The
            bank-facing dashboard with charts will be added in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Use “Edit scenario” to review and change the assumptions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
