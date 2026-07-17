import type { Prisma } from "@prisma/client";
import type { ScenarioInput } from "@/engine/types";

/** Cast engine input to Prisma JSON column type. */
export function toScenarioJson(input: ScenarioInput): Prisma.InputJsonValue {
  return input as unknown as Prisma.InputJsonValue;
}
