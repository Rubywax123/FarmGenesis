import { NextResponse } from "next/server";
import { notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { scenarioInputSchema } from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

type RouteContext = { params: Promise<{ id: string; sid: string }> };

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId, sid } = await context.params;

  const existing = await prisma.scenario.findFirst({
    where: { id: sid, projectId },
  });
  if (!existing) {
    return notFound("Scenario not found");
  }

  await prisma.scenario.updateMany({
    where: { projectId, isBase: true },
    data: { isBase: false },
  });

  const scenario = await prisma.scenario.update({
    where: { id: sid },
    data: { isBase: true },
  });

  const input = scenarioInputSchema.parse(scenario.input) as ScenarioInput;

  return NextResponse.json({
    id: scenario.id,
    projectId: scenario.projectId,
    name: scenario.name,
    isBase: scenario.isBase,
    input,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  });
}
