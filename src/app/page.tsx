import { ProjectsList } from "@/components/projects/projects-list";
import { prisma } from "@/lib/db";

// The projects list reads from the database on every request; without this the
// page would be statically prerendered at build time, when no DB is available.
export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<React.JSX.Element> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { scenarios: true } },
    },
  });

  return (
    <ProjectsList
      initialProjects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        currency: project.currency,
        scenarioCount: project._count.scenarios,
      }))}
    />
  );
}
