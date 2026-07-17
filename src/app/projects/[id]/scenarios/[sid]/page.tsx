import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          ← Back to {scenario.project.name}
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{scenario.name}</CardTitle>
              {scenario.isBase ? <Badge>Base case</Badge> : null}
            </div>
            <CardDescription>
              Scenario dashboard and charts will be added in a later phase. Assumptions are
              saved; results recompute when you open or edit a scenario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              Edit scenario (Phase 3)
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
