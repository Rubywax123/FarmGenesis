import { NextResponse } from "next/server";
import { jsonError, notFound, zodErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/db";
import { updateProjectSchema } from "@/lib/schemas/scenario";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: { select: { scenarios: true } },
    },
  });

  if (!project) {
    return notFound("Project not found");
  }

  return NextResponse.json({
    id: project.id,
    name: project.name,
    location: project.location,
    currency: project.currency,
    scenarioCount: project._count.scenarios,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: unknown = await request.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Project not found");
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.location !== undefined
        ? { location: parsed.data.location }
        : {}),
    },
    include: {
      _count: { select: { scenarios: true } },
    },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    location: project.location,
    currency: project.currency,
    scenarioCount: project._count.scenarios,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return notFound("Project not found");
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
