# Topic: Docker foundations — images that earn their layers

> **Goal:** Write a production-shaped Dockerfile and a compose stack that boots the whole platform — then have BOTH machine-graded against explicit contracts, exactly how infra review feels.

## Beginner-friendly picks

- 🎥 YouTube search: **“Dockerfile multi-stage build”** — layer-caching visuals match your contract items D1–D4
- 🧪 [Play with Docker](https://labs.play-with-docker.com/) — build & curl your image without installing anything

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Images = layered filesystems | each instruction = a layer; ORDER determines cache hits | [Docker — building best practices](https://docs.docker.com/build/building/best-practices/) |
| Layer-cache discipline | copy manifests → install → copy source LAST: source edits must not re-download deps | same page |
| Multi-stage builds | compilers/test-deps stay in `build`; runtime ships only dist + prod deps | [Docker — multi-stage](https://docs.docker.com/build/building/multi-stage/) |
| Running as non-root | containers escape occasionally; root inside = root-ish outside. `USER node` exists on official images | [Docker docs — user](https://docs.docker.com/reference/dockerfile/#user) |
| CMD vs ENTRYPOINT | overridable default vs fixed executable; JSON-array form avoids shell wrapping | [Dockerfile reference](https://docs.docker.com/reference/dockerfile/#cmd) |
| Compose as local-prod parity | services, healthchecks, depends_on conditions, volumes — one command boots everything | [compose spec](https://compose-spec.io/) |

## Keep in mind

- **Every dependency bump invalidates from that layer DOWN** — which is exactly why manifest-copy comes first. Order is performance.
- **Alpine's musl vs glibc**: smaller images, occasional native-module pain. Know the trade-off you're accepting.
- **Secrets never bake into images** — not in ENV, not in copied files. Runtime injection only (env/secret managers).
- **`.dockerignore` is part of the build**: excluding node_modules/.git shrinks context and prevents host-state leaks.
- **Healthchecks make `depends_on` meaningful** — without them, "up" just means "process spawned".

## Self-check quiz

<details><summary>1. Why does <code>COPY . .</code> before <code>pnpm install</code> murder your build times?</summary>
Any source edit changes the layer hash → install layer rebuilds → full dependency download every build. Manifests-first keeps installs cached until deps actually change.</details>

<details><summary>2. Final image is 1.2GB. Three likely culprits?</summary>
Single-stage (dev deps shipped), no .dockerignore (node_modules/.git copied), base image too fat (debian+build tools vs alpine/distroless).</details>

<details><summary>3. What breaks when a container runs as root and gets compromised?</summary>
Filesystem writes anywhere, easier privilege-escape vectors, noncompliance findings. Non-root + read-only rootfs shrink blast radius to near-zero for most web apps.</details>

<details><summary>4. compose healthcheck passes but your API still 503s behind the LB. Why isn't healthcheck enough?</summary>
Compose healthcheck only gates depends_on locally. Real readiness needs the APP's probe semantics (liveness vs readiness split from phase 00) wired to whatever orchestrates traffic.</details>

## Assignment

[assignment.md](assignment.md) — author `submission/Dockerfile` + `submission/docker-compose.yml` for a NestJS-style service backed by Postgres and Redis. Both are parsed and structurally graded against an explicit contract.
