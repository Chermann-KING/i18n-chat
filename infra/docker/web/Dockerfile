# =============================================================================
# infra/docker/web/Dockerfile
# Multi-stage Next.js web image — standalone output, non-root runtime user.
#
# Build context: repository root
#   docker build -f infra/docker/web/Dockerfile -t i18n-chat-web .
#
# NEXT_PUBLIC_* vars must be provided at build time (inlined by webpack):
#   --build-arg NEXT_PUBLIC_API_URL=https://api.example.com
# =============================================================================

ARG NODE_VERSION=22

# ─── Base: Node.js + pnpm ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate

# ─── Installer: copy manifests only (maximises layer cache) ──────────────────
FROM base AS installer
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

COPY packages/config/package.json   packages/config/
COPY packages/domain/package.json   packages/domain/
COPY packages/dto/package.json      packages/dto/
COPY apps/web/package.json          apps/web/

RUN pnpm install --frozen-lockfile

# ─── Builder: compile workspace packages then Next.js ─────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=installer /repo/ .
COPY . .

# NEXT_PUBLIC_* variables are inlined at build time by webpack — they cannot
# be changed after the image is built without rebuilding.
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# turbo topology: domain → dto → web
RUN pnpm turbo build --filter=@i18n-chat/web...

# ─── Runner: minimal image, non-root user ────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# The standalone output already embeds a minimal node_modules; copy the
# whole directory so the monorepo path structure is preserved.
# In a pnpm workspace, the standalone dir reflects the workspace layout:
#   apps/web/server.js  ← entry point
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./

# Static chunks (CSS/JS) are NOT bundled in standalone — copy separately.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static     ./apps/web/.next/static

# Public assets (favicon, images…)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public           ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
