import { NextResponse } from "next/server";
import { toScenarioJson } from "@/lib/scenario-json";
import { notFound, zodErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  duplicateScenarioSchema,
  scenarioInputSchema,
} from "@/lib/schemas/scenario";
import type { ScenarioInput } from "@/engine/types";

type RouteContext = { params: Promise<{ id: string; sid: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id: projectId, sid } = await context.params;

  const existing = await prisma.scenario.findFirst({
    where: { id: sid, projectId },
  });
  if (!existing) {
    return notFound("Scenario not found");
  }

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = duplicateScenarioSchema.safeParse(body);
  if (!parsed.success) {
    return zodErrorResponse(parsed.error);
  }

  const input = scenarioInputSchema.parse(existing.input) as ScenarioInput;
  const duplicateName = parsed.data.name ?? `${existing.name} (copy)`;

  const scenario = await prisma.scenario.create({
    data: {
      projectId,
      name: duplicateName,
      isBase: false,
      input: toScenarioJson(input),
    },
  });

  return NextResponse.json(
    {
      id: scenario.id,
      projectId: scenario.projectId,
      name: scenario.name,
      isBase: scenario.isBase,
      input,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    },
    { status: 201 },
  );
}
