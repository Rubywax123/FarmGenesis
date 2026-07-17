import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { zodErrorResponse } from "@/lib/api";
import { createProjectSchema } from "@/lib/schemas/scenario";

export async function GET(): Promise<NextResponse> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { scenarios: true } },
    },
  });

  return NextResponse.json(
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      location: project.location,
      currency: project.currency,
      scenarioCount: project._count.scenarios,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location ?? null,
    },
    include: {
      _count: { select: { scenarios: true } },
    },
  });

  return NextResponse.json(
    {
      id: project.id,
      name: project.name,
      location: project.location,
      currency: project.currency,
      scenarioCount: project._count.scenarios,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    { status: 201 },
  );
}
