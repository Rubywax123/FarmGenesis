import { NextResponse } from "next/server";
import { notFound, zodErrorResponse } from "@/lib/api";
import { toScenarioJson } from "@/lib/scenario-json";
import { prisma } from "@/lib/db";
import {
  scenarioInputSchema,
  updateScenarioSchema,
} from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

type RouteContext = { params: Promise<{ id: string; sid: string }> };

async function getScenario(projectId: string, scenarioId: string) {
  return prisma.scenario.findFirst({
    where: { id: scenarioId, projectId },
  });
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId, sid } = await context.params;
  const scenario = await getScenario(projectId, sid);

  if (!scenario) {
    return notFound("Scenario not found");
  }

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

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId, sid } = await context.params;
  const existing = await getScenario(projectId, sid);
  if (!existing) {
    return notFound("Scenario not found");
  }

  const body: unknown = await request.json();
  const parsed = updateScenarioSchema.safeParse(body);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  if (parsed.data.isBase) {
    await prisma.scenario.updateMany({
      where: { projectId, isBase: true },
      data: { isBase: false },
    });
  }

  const scenario = await prisma.scenario.update({
    where: { id: sid },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.input !== undefined
        ? { input: toScenarioJson(parsed.data.input) }
        : {}),
      ...(parsed.data.isBase !== undefined ? { isBase: parsed.data.isBase } : {}),
    },
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

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId, sid } = await context.params;
  const existing = await getScenario(projectId, sid);
  if (!existing) {
    return notFound("Scenario not found");
  }

  await prisma.scenario.delete({ where: { id: sid } });
  return NextResponse.json({ ok: true });
}
