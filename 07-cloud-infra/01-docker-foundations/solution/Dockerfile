# Multi-stage build for a Node 22 TypeScript API.
# Build context contract: see ../assignment.md.

# ── Stage 1: build ───────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Manifests first — dependency layers stay cached until deps change.
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Source last: edits above don't re-download the internet.
COPY . .
RUN pnpm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
