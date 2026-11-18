#!/bin/sh
# Development entrypoint: installs dependencies into the container volume,
# applies pending migrations and starts the Next.js dev server.
set -e

pnpm install --prefer-offline
pnpm prisma migrate deploy
exec pnpm dev --hostname 0.0.0.0
