# Assignment — Containerize the service (graded contracts)

## The problem you're solving
A Dockerfile is a build-order contract with the layer cache: copy manifests before source or every edit re-downloads your dependencies; ship as root and every container escape becomes a root escape. You'll write a multi-stage Dockerfile plus a compose stack that boots app+Postgres+Redis — then have BOTH machine-graded against explicit contracts.

## Your tasks
1. Author [submission/Dockerfile](submission/Dockerfile) for a Node 22 TS API (listens on 3000, builds to dist/, uses pnpm):
   - ≥2 stages with the build stage aliased `AS build`; final stage on node alpine
   - copy package.json + lockfile BEFORE any source copy; install with `--frozen-lockfile` in build
   - final stage runs as non-root (`USER node`), `EXPOSE 3000`, exec-form `CMD ["node", …]`
   - never COPY .env files
2. Author [submission/docker-compose.yml](submission/docker-compose.yml) with three services:
   - `app`: builds from `.`, maps 3000:3000, depends_on postgres + redis
   - `postgres`: image postgres:16-alpine, password via `${…}` interpolation (NEVER a literal secret), named data volume, `pg_isready` healthcheck
   - `redis`: image redis:7-alpine

## Definition of done
- [ ] Spec green — line-order checks prove cache-friendly ordering; YAML parse proves compose structure
- [ ] Bonus: actually build & boot locally once Docker exists

## Hints (open only when stuck)

<details><summary>Stage naming</summary>
<code>FROM node:22-alpine AS build</code>, then a second plain <code>FROM node:22-alpine</code>; copy <code>--from=build /app/dist</code> and prod node_modules.</details>

<details><summary>Non-root gotcha</summary>
Copied files stay root-owned — use <code>COPY --chown=node:node</code>.</details>

## Going further (optional)
HEALTHCHECK hitting /healthz · .dockerignore with grade-worthy entries · distroless-style runtime (document musl trade-off).

## Hints

<details><summary>Stage naming</summary>
<code>FROM node:22-alpine AS build</code> … then <code>FROM node:22-alpine</code> for runtime; copy <code>--from=build /app/dist</code> + prod manifests. Keep runtime installs to <code>pnpm install --prod --frozen-lockfile</code> if you need node_modules at all.
</details>

<details><summary>Non-root gotcha</summary>
Files copied as root stay root-owned. Either chown in build stage or copy with <code>--chown=node:node</code>.
</details>

## Acceptance criteria

- [ ] Spec green (`pnpm test:topic 07-cloud-infra/01-docker-foundations`)
- [ ] Bonus pride point: actually build & boot it locally (`docker compose up --build`) once Docker exists on your machine

## Stretch

- Add HEALTHCHECK instruction hitting /healthz
- Add a `.dockerignore` and grade-worthy entries (.git, node_modules, .env)
- Slim final stage to distroless-style (nodejs20.x runtime image) — document glibc trade-off
