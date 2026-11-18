# syntax=docker/dockerfile:1.7
#
# Multi-stage image for LucApp.
#   dev      -> local development (source is bind-mounted by docker compose)
#   migrator -> runs `prisma migrate deploy` against the target database
#   runner   -> minimal production image (Next.js standalone output)

ARG NODE_VERSION=24.18.0

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    pnpm_config_store_dir=/pnpm/store \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
# Pre-fetch the pinned pnpm version so the first `pnpm` call is instant.
COPY package.json ./
RUN corepack install
EXPOSE 3000
CMD ["sh", "./docker/dev-entrypoint.sh"]

# ---------------------------------------------------------------------------
# Supabase CLI runner: dev image + Docker CLI (the Supabase CLI drives the host daemon).
FROM docker:29.6.2-cli AS docker-cli
FROM dev AS supabase-cli
RUN apt-get update \
  && apt-get install -y --no-install-recommends socat \
  && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY docker/supabase-cli-entrypoint.sh /usr/local/bin/supabase-cli
ENTRYPOINT ["sh", "/usr/local/bin/supabase-cli"]

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM deps AS migrator
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
ENV NODE_ENV=production \
    SKIP_ENV_VALIDATION=1
RUN pnpm build

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
