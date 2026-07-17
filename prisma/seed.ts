import { PrismaClient, type Prisma } from "@prisma/client";
import {
  blueberryZimbabweBaseCase,
  PROJECT_NAME,
  SCENARIO_NAME,
} from "../src/engine/seed/blueberryZimbabwe";

/** Fixed IDs so seeding is idempotent across deploys. */
export const SEED_PROJECT_ID = "clseed00000000000000000001";
export const SEED_SCENARIO_ID = "clseed00000000000000000002";

const seedInput = blueberryZimbabweBaseCase as unknown as Prisma.InputJsonValue;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.project.upsert({
    where: { id: SEED_PROJECT_ID },
    create: {
      id: SEED_PROJECT_ID,
      name: PROJECT_NAME,
      location: "Zimbabwe",
      currency: "USD",
    },
    update: {
      name: PROJECT_NAME,
      location: "Zimbabwe",
      currency: "USD",
    },
  });

  await prisma.scenario.upsert({
    where: { id: SEED_SCENARIO_ID },
    create: {
      id: SEED_SCENARIO_ID,
      projectId: SEED_PROJECT_ID,
      name: SCENARIO_NAME,
      isBase: true,
      input: seedInput,
    },
    update: {
      name: SCENARIO_NAME,
      isBase: true,
      input: seedInput,
    },
  });

  console.log(`Seeded project "${PROJECT_NAME}" with base scenario "${SCENARIO_NAME}".`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
