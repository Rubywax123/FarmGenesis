import { ProjectsList } from "@/components/projects/projects-list";
import { prisma } from "@/lib/db";

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
