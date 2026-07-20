#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
