# syntax=docker/dockerfile:1.7
# Monolith image: NestJS serves the API under /api and the built React SPA for every other path.
# Targets:
#   runtime  (default) the app
#   migrator           one-shot `prisma migrate deploy`, run before the app on every release

ARG NODE_VERSION=24.21.0
ARG PNPM_VERSION=12.8.1

# ---------- base: Node + pnpm ----------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
WORKDIR /repo

# ---------- deps: install from lockfile only (best layer caching) ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/prisma.config.ts apps/backend/
COPY apps/backend/prisma apps/backend/prisma
COPY apps/frontend/package.json apps/frontend/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig/package.json packages/tsconfig/
# Install scripts run only for packages approved in pnpm-workspace.yaml (allowBuilds).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build: compile both apps, then prune backend to prod deps (+ its `files`: dist) ----------
FROM deps AS build
COPY . .
RUN pnpm build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter backend deploy --prod --legacy --ignore-scripts /out \
 && cp -r apps/frontend/dist /out/public

# ---------- migrator: applies pending Prisma migrations, then exits ----------
FROM build AS migrator
WORKDIR /repo/apps/backend
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# ---------- runtime: minimal, non-root ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1
CMD ["node", "dist/main.js"]
