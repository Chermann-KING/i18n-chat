# =============================================================================
# infra/docker/api/Dockerfile
# Multi-stage NestJS API image — non-root runtime user.
#
# Build context: repository root
#   docker build -f infra/docker/api/Dockerfile -t i18n-chat-api .
# =============================================================================

ARG NODE_VERSION=22

# ─── Base: Node.js + pnpm ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate

# ─── Installer: copy manifests only (maximises layer cache) ──────────────────
FROM base AS installer
WORKDIR /repo

# Root workspace files (.npmrc must be included — contains shamefully-hoist=true)
COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Package manifests — one COPY per package so any single change only
# invalidates that package's layer, not the full install layer.
COPY packages/config/package.json    packages/config/
COPY packages/database/package.json  packages/database/
COPY packages/domain/package.json    packages/domain/
COPY packages/dto/package.json       packages/dto/
COPY apps/api/package.json           apps/api/

RUN pnpm install --frozen-lockfile

# ─── Builder: compile all workspace packages in dependency order ──────────────
FROM base AS builder
WORKDIR /repo

# Reuse installed node_modules from the installer layer
COPY --from=installer /repo/ .

# Copy all source files (the .dockerignore excludes node_modules, dist, .next…)
COPY . .

# turbo `^build` topology: domain → dto → database → api
RUN pnpm turbo build --filter=@i18n-chat/api...

# ─── Deployer: extract production-only node_modules via pnpm deploy ───────────
FROM base AS deployer
WORKDIR /repo

COPY --from=builder /repo/ .

# Creates /deploy with a self-contained package.json + node_modules (prod only).
# workspace:* deps are inlined automatically by pnpm deploy.
RUN pnpm --filter @i18n-chat/api deploy --prod --legacy /deploy

# ─── Runner: minimal image, non-root user ────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

WORKDIR /app

# Compiled application bundle (webpack output)
COPY --from=builder  --chown=nestjs:nodejs /repo/apps/api/dist        ./dist

# Production node_modules (@prisma/client included, workspace deps inlined)
COPY --from=deployer --chown=nestjs:nodejs /deploy/node_modules        ./node_modules

# Prisma schema — required by @prisma/client at runtime to locate query engine
COPY --from=builder  --chown=nestjs:nodejs /repo/packages/database/prisma ./prisma

USER nestjs

EXPOSE 3001

ENV NODE_ENV=production

# Healthcheck — the /api/v1/health endpoint is a simple 200 route
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main"]
