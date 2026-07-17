import { NextResponse } from "next/server";
import { notFound, zodErrorResponse } from "@/lib/api";
import { toScenarioJson } from "@/lib/scenario-json";
import { prisma } from "@/lib/db";
import {
  createScenarioSchema,
  scenarioInputSchema,
} from "@/lib/schemas/scenario";
import { blueberryZimbabweBaseCase } from "@/engine/seed/blueberryZimbabwe";
import type { ScenarioInput } from "@/engine/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseScenarioInput(input: unknown): ScenarioInput {
  return scenarioInputSchema.parse(input);
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId } = await context.params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return notFound("Project not found");
  }

  const scenarios = await prisma.scenario.findMany({
    where: { projectId },
    orderBy: [{ isBase: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(
    scenarios.map((scenario) => ({
      id: scenario.id,
      projectId: scenario.projectId,
      name: scenario.name,
      isBase: scenario.isBase,
      input: parseScenarioInput(scenario.input),
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    })),
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId } = await context.params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return notFound("Project not found");
  }

  const body: unknown = await request.json();
  const parsed = createScenarioSchema.safeParse(body);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const input = parsed.data.input ?? blueberryZimbabweBaseCase;
  const validatedInput = scenarioInputSchema.parse(input);

  const scenarioCount = await prisma.scenario.count({ where: { projectId } });
  const isBase = parsed.data.isBase ?? scenarioCount === 0;

  if (isBase) {
    await prisma.scenario.updateMany({
      where: { projectId, isBase: true },
      data: { isBase: false },
    });
  }

  const scenario = await prisma.scenario.create({
    data: {
      projectId,
      name: parsed.data.name,
      isBase,
      input: toScenarioJson(validatedInput),
    },
  });

  return NextResponse.json(
    {
      id: scenario.id,
      projectId: scenario.projectId,
      name: scenario.name,
      isBase: scenario.isBase,
      input: validatedInput,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    },
    { status: 201 },
  );
}
