# Setup guide

## 1. Toolchain

| Tool | Version | Install (Linux/macOS) |
|---|---|---|
| Node.js | ≥ 22 LTS | [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use` (repo ships `.nvmrc`) |
| pnpm | 10.x | `corepack enable && corepack prepare pnpm@latest --activate` |
| Git | any recent | you have it |
| Docker | latest | [docker desktop](https://docs.docker.com/get-docker/) or engine+compose plugin — needed from phase 03 onward, install now |

Verify: `node -v` → v22+, `pnpm -v`, `git --version`, `docker run hello-world`.

## 2. Get the repo running

```bash
git clone https://github.com/YOUR_USERNAME/backend-mastery.git
cd backend-mastery
pnpm install
pnpm test:solutions   # should be ALL GREEN — proves your env works
pnpm test             # red — that's correct: assignments aren't done yet
```

That's the whole setup for phases 00–02. Databases/containers arrive with their phases.

## 3. Editor (VS Code recommended)

Extensions worth it from day one:

- **Vitest** (`vitest.explorer`) — run/debug specs from the sidebar
- **Error Lens** — inline TS errors, faster feedback loops
- **GitLens** — history/blame without leaving the file

Settings: format on save with 2-space indent; the repo's [.editorconfig](../.editorconfig) keeps things consistent.

## 4. Suggested workspace habits

- One branch per topic (`topic/00-http-protocol`); merge to `main` when green + coverage acceptable. Gives you a natural commit history to show.
- Write `notes.md` inside each topic folder as you learn — interview gold later ("explain X like I'm you pre-phase-00").
- Commit at every green milestone, not once per phase. Small diffs = easy rollbacks.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pnpm test:solutions` red on fresh clone | Your node < 22? `node -v`. Otherwise open an issue against yourself: delete `node_modules`, `pnpm install` again |
| ESM/import errors in editor but tests pass | Editor TS version mismatch — VS Code: "Select TypeScript Version → Use Workspace Version" |
| MSW warnings about unhandled requests | Expected during development of retry assignment until handlers registered; in final runs they must be gone (`onUnhandledRequest: 'error'` will fail the test) |
| Port already in use (later phases) | Tests never bind fixed ports by design; if dev servers conflict, change port via env var, not code |
| Phase 03+ tests all SKIP | No PostgreSQL/Redis backend could start. Install Docker (preferred), or export `TEST_DATABASE_URL` + `TEST_REDIS_URL` pointing at your own services, or check the log line "databases ready ✔" for embedded-mode errors |
| First phase-03 run is slow | Embedded mode initializes a data dir once per session; Docker mode pulls images on first use. Later runs take seconds |
| k6 specs SKIP (phase 04) | Install the load-testing CLI once: `bash scripts/install-k6.sh` (no root; lands in `~/.local/bin`) |
