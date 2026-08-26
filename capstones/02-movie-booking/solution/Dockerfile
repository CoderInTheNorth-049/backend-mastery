# Multi-stage build for the answer-key app. The default mode needs no
# infrastructure at all; set DATABASE_URL to switch on the pg adapter.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build && pnpm install --frozen-lockfile --prod

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 3002
USER node
CMD ["node", "dist/main.js"]
