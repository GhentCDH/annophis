# Annophis — agent guide

Entry point for every coding agent (Claude, Codex, Copilot, Cursor). `CLAUDE.md` only imports this file.

Architecture diagrams (Mermaid): [docs/](docs/README.md): overview, admin gateway, events, auth.

## Layout

```
apps/<svc>/                one crouton project per service
  crouton.json             resource/data-source dirs for this service
  crouton-backend/         NestJS (crouton-api)
  crouton-frontend/        gateway only: the single admin UI (crouton-vue) for every service
  prisma/default/          schema.prisma + prisma.config.ts
  .env.example             copy to .env
libs/<lib>/                shared TypeScript, imported as @annophis/<lib>
generated/<svc>/default/   Prisma client + Zod types. NEVER edit by hand.
docker/                    infra init files (postgres, keycloak)
docs/                      architecture docs + Mermaid diagrams
compose.yml                `docker compose up` starts everything
```

- An app goes in `apps/`. Shared logic goes in `libs/`. Generated code goes in `generated/`. There is nothing else.
- Regenerate code with `pnpm crouton update resources --project apps/<svc>`. Add `--skip-pull` to run without a DB.

## Module boundaries (enforced by lint)

Each project has one `scope:*` tag and one `type:*` tag. The constraints live in the root `eslint.config.mjs`.

| Tag | May depend on |
|---|---|
| `scope:backend` | `scope:backend`, `scope:shared` (no Vue) |
| `scope:frontend` | `scope:frontend`, `scope:shared` (no NestJS, Prisma or NATS) |
| `scope:shared` | `scope:shared` only (framework-free: TypeScript and Zod) |
| `type:app` | `type:lib`, `type:generated` (never another app) |
| `type:lib` | `type:lib` only (never an app or generated code) |
| `type:generated` | nothing |
| `scope:e2e` + `type:e2e` | `scope:shared` libs only (`apps/e2e`) |

Use the `annophis-lib` skill to pick the right lib kind.

## Rules

- **Service boundaries.** A service owns its Postgres schema (`?schema=<svc>`). It never reads another service's schema. Services talk to each other via REST or bus events only.
- **Contracts are the single source of truth.** REST DTOs and event schemas (Zod) live in `libs/contracts/<svc>/`. Every schema has fixture payloads in a test.
- **Admin writes go through Prisma.** Every write stores its event in the service's `outbox` table in the same transaction (`withEntityEvents` in `libs/events`), and the outbox relay publishes it. Controllers never publish entity events, and admin CRUD produces events too.
- **The admin UIs are internal tools.** They sit behind Keycloak with the `admin` role and are never exposed publicly.
- Code style: TypeScript strict, `type` over `interface`, arrow functions, `import type` for type-only imports.
- Commit messages follow Conventional Commits.

## Admin UIs (internal only)

- **One admin UI:** `http://localhost:6200` (the gateway's crouton frontend) is the only frontend. Services have no frontend of their own.
- **Login:** one Keycloak login at the gateway (server-side flow, confidential `annophis-gateway` client) gives a crouton session token. Every backend accepts it (shared `CROUTON_AUTH_SECRET`) and requires the `admin` realm role (`auth-providers/keycloak/auth-provider.json`, `defaultSecurity`).
- **Gateway facade** (`apps/gateway/crouton-backend/src/admin-facade.ts`):
  - `GET /_app/layout` merges the gateway's sidebar with one group per service. Leaf ids become `<svc>.<id>` and routes `<svc>/<route>` (`merge-layouts.ts`); services are listed only for admins.
  - `/<svc>/*` is reverse-proxied to that service with the prefix stripped and `Authorization` forwarded.
  - Each service sets `baseUrl: '/<svc>'` in `CroutonApiModule.forResourceDir`, so its CRUD/relation URIs carry the prefix.
  - The service list (name, sidebar title, port) lives in `apps/gateway/crouton-backend/src/services.ts`. URLs come from `ANNOPHIS_<SVC>_URL`, else `localhost:<port>`.
  - `GET /health/services` gives the health of the whole stack (503 when any service is down or off the bus).
- **Not public:** admin writes go straight to the database (events come from the Prisma extension, not controllers), so never expose the admin UIs publicly.
- **Keycloak hostname:** `KEYCLOAK_URL=http://keycloak.localhost:6480` everywhere. `*.localhost` is loopback for browsers and Node, and Keycloak has that network alias inside Docker, so the token issuer is the same for all of them.

## Commands

```sh
pnpm install
pnpm nx run-many -t lint typecheck test build
pnpm nx affected -t lint typecheck test build --base=origin/main
pnpm nx run <svc>-backend:serve
docker compose up
pnpm nx run e2e:contract   # provider contract tests against the running stack
pnpm nx e2e e2e            # Playwright browser flows, against the running stack
pnpm nx run events:integration  # EventBus against real NATS
```

## MCP servers (`.mcp.json`)

| Server | What for | Needs |
|---|---|---|
| `nx-mcp` | workspace graph, projects, targets, generators | nothing (runs via `npx`) |
| `prisma` | migrations and schema of a service's database | `pnpm install` |
| `auto` | GhentCDH IT inventory: where Annophis runs, domains, healthchecks, Nomad/Caddy deploy config | the `auto` binary (`curl -fsSL https://raw.githubusercontent.com/GhentCDH/auto/main/scripts/install.sh \| sh`), then `auto login --url <server>` and `auto token create "claude" --save` |

## Skills (`.claude/skills/`)

Plain markdown; any agent can read them.

| Skill | Use when |
|---|---|
| `crouton` | changing `resource.json`, `data-source.json` or `crouton.json` (synced by crouton, tracked in `.crouton/agent-files.json`) |
| `annophis-add-service` | adding a new service under `apps/` |
| `annophis-lib` | adding a shared lib under `libs/` |
| `annophis-contract` | adding or changing a DTO or event schema |
| `annophis-events` | publishing or subscribing to bus events |
| `annophis-service-auth` | protecting endpoints, calling another service, debugging 401s |
| `annophis-e2e` | Playwright tests in `apps/e2e` against the running stack |

## Libs

| Lib | Tags | Holds |
|---|---|---|
| `@annophis/domain-types` | shared | Zod primitives: `TextUrn`, `TextSelector` (NFC code points), W3C `Annotation` |
| `@annophis/contracts` | shared | REST DTOs and event schemas per service; the single source of truth |
| `@annophis/events` | backend | `EventBus` (NATS JetStream); `withEntityEvents()`, which writes every change's event to the transactional outbox; the outbox relay |
| `@annophis/service-auth` | backend | `ServiceAuthGuard`, `@Public()` |
| `@annophis/service-kit` | backend | `AnnophisServiceModule.forRoot(...)`: EventBus, `/health`, `/hello`, global guard |
| `@annophis/testing` | backend | `createEventBusMock()` and other test helpers |

## Ports

Annophis owns fixed port ranges so it can run next to other local projects (which use 3000/4200/5432/8080 and friends). **Always pick new ports inside these ranges and keep the suffix per service the same across ranges.**

| Range | Use |
|---|---|
| 6100–6199 | service backends (`BACKEND_PORT`) |
| 6200–6299 | frontends: the gateway admin UI (6200); reserved for future UIs |
| 6400–6499 | infra host ports |

| Service | Backend | Frontend |
|---|---|---|
| gateway | 6100 | 6200 (the admin UI for all services) |
| ms-projects | 6101 | — |
| ms-corpora | 6102 | — |
| ms-annotation | 6103 | — |
| ms-metadata | 6104 | — |
| text-service-1 | 6110 | — |
| text-service-2 | 6111 | — |
| ml-adapter | 6120 | — |

| Infra | Host port | Inside Docker |
|---|---|---|
| Postgres (DB `annophis`) | 6432 | `postgres:5432` |
| NATS | 6422 | `nats:4222` |
| NATS monitoring | 6482 | `nats:8222` |
| Keycloak (realm `annophis`) | 6480 | `keycloak.localhost:6480` (same port inside and out) |

The next free suffixes are `x05`–`x09` for domain `ms-*` services, `x12`+ for text services and `x21`+ for adapters.

Each service uses Postgres schema `<svc>` with `-` replaced by `_`, owned by a user of the same name (password `dev`). `docker/init-data/01-schemas.sql` creates them. Inside Docker, the compose files override `DATABASE_URL` and `NATS_URL` to use the `postgres` and `nats` hosts; `.env` uses `localhost` for `pnpm dev`.

**Root agent files (GhentCDH/crouton#690).** `.claude/skills/crouton`, `.cursor/rules/crouton.mdc` and the crouton block below are written by crouton. They name *one* project's paths. For any service, read `apps/<svc>/crouton.json` for its resources and data-sources dirs.

<!-- crouton configuration start -->
<!-- Leave the start & end comments to automatically receive updates. -->
# crouton
- Resources live in `apps/gateway/crouton-backend/src/app/resources`, data sources in `apps/gateway/crouton-backend/src/app/data-sources` (see `crouton.json`).
- Use the `crouton` skill for any resource/datasource change.
- After editing any `resource.json` or `crouton.json`, run `crouton validate`.
- Docs for the installed version: `node_modules/@ghentcdh/crouton-cli/agent-docs/README.md`
<!-- crouton configuration end -->
