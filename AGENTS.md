# Annophis — agent guide

Entry point for every coding agent (Claude, Codex, Copilot, Cursor). `CLAUDE.md` only imports this file.

## Layout

```
apps/<svc>/                one crouton project per service
  crouton.json             resource/data-source dirs for this service
  crouton-backend/         NestJS (crouton-api)
  crouton-frontend/        Vue (crouton-vue), the service's DB admin; absent for API-only services
  prisma/default/          schema.prisma + prisma.config.ts
  .env.example             copy to .env
libs/<lib>/                shared TypeScript, imported as @annophis/<lib>
generated/<svc>/default/   Prisma client + Zod types. NEVER edit by hand.
docker/                    infra init files (postgres, keycloak)
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

Use the `annophis-lib` skill to pick the right lib kind.

## Rules

- **Service boundaries.** A service owns its Postgres schema (`?schema=<svc>`). It never reads another service's schema. Services talk to each other via REST or bus events only.
- **Contracts are the single source of truth.** REST DTOs and event schemas (Zod) live in `libs/contracts/<svc>/`. Every schema has fixture payloads in a test.
- **Admin writes go through Prisma.** Events are emitted from the Prisma client extension in `libs/events`, not from controllers, so admin CRUD also produces events.
- **The admin UIs are internal tools.** They sit behind Keycloak with the `admin` role and are never exposed publicly.
- Code style: TypeScript strict, `type` over `interface`, arrow functions, `import type` for type-only imports.
- Commit messages follow Conventional Commits.

## Commands

```sh
pnpm install
pnpm nx run-many -t lint typecheck test build
pnpm nx affected -t lint typecheck test build --base=origin/main
pnpm nx run <svc>-backend:serve
docker compose up
```

## Skills (`.claude/skills/`)

Plain markdown; any agent can read them.

| Skill | Use when |
|---|---|
| `crouton` | changing `resource.json`, `data-source.json` or `crouton.json` (synced by crouton, tracked in `.crouton/agent-files.json`) |
| `annophis-add-service` | adding a new service under `apps/` |
| `annophis-lib` | adding a shared lib under `libs/` |

Contract, event and service-auth skills arrive together with those libs.

## Ports

| Service | Backend | Frontend |
|---|---|---|
| gateway | 3000 | 4200 |
| ms-projects | 3001 | 4201 |
| ms-corpora | 3002 | 4202 |
| ms-annotation | 3003 | 4203 |
| ms-metadata | 3004 | 4204 |
| text-service-1 | 3010 | 4210 |
| text-service-2 | 3011 | 4211 |
| ml-adapter | 3020 | none (API only) |

Infra (`compose.infra.yml`): Postgres `5442` (DB `annophis`), NATS `4222` (monitoring `8222`), Keycloak `8080` (realm `annophis`).

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
