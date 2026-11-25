---
name: annophis-add-service
description: Add a new Annophis service (crouton project) under apps/. Use when asked to create a microservice, ms, adapter or text service.
---

# Add a service

`<svc>` is kebab-case (e.g. `ms-projects`). `<svc_u>` is the same name with `_` instead of `-` (Postgres user and schema). Take a backend port from the Annophis range in `AGENTS.md` (61xx). Services have no frontend: their admin is served by the gateway's single admin UI. Never use ports outside the ranges.

1. Scaffold with the layout flags. Never move folders by hand afterwards.
   ```sh
   pnpm exec crouton create project <svc> \
     --apps-dir apps/<svc> --backend-dir crouton-backend \
     --generated-dir generated/<svc> \
     --no-frontend --backend-port <bport> \
     --db-url "postgresql://<svc_u>:dev@localhost:6432/annophis?schema=<svc_u>" -y
   ```
   - Delete `FRONTEND_PORT` from its `.env` and `.env.example`: crouton writes it even with `--no-frontend` (GhentCDH/crouton#691).
   - In zsh, pass flags held in a variable as an array, otherwise they are not split.
2. **Revert the root agent files.** Crouton re-stamps them with the last project's paths (GhentCDH/crouton#690):
   ```sh
   git checkout -- .claude/skills/crouton .cursor .crouton AGENTS.md
   ```
3. Append to `apps/<svc>/.env` and `.env.example`:
   ```
   SERVICE_NAME=<svc>
   NATS_URL=nats://localhost:6422
   SERVICE_AUTH=on
   SERVICE_API_KEYS=dev-key-<svc>
   INTERNAL_JWT_SECRET=dev-only-change-me
   ```
4. Backend tweaks, so it can import `@annophis/*` libs:
   - `crouton-backend/tsconfig.json`: remove `rootDir`.
   - `crouton-backend/tsup.config.ts`: `noExternal: [/@<svc>\/.*/, /@annophis\/.*/]`.
   - `crouton-backend/nodemon.json`: add `"../../../libs"` to `watch`.
5. Outbox: copy `model Outbox` from another service's `prisma/default/schema.prisma`, add `"excludeTables": ["outbox"]` to `data-source.json`, and generate its migration (`prisma migrate dev`, or `prisma migrate diff --from-empty --to-schema … --script` offline). Wrap the Prisma client in `crouton-backend/src/app/data-sources/default/index.ts`: `const client = withEntityEvents(new PrismaClient({ adapter }), '<svc>');` (from `@annophis/events`). Add `AnnophisServiceModule.forRoot()` after `ConfigModule` in `app.module.ts`, and copy the service env vars from another service's `.env.example` (no Keycloak/auth-provider vars: the gateway handles login).
6. Tags:
   - Backend `project.json`: `["scope:backend", "type:app"]`.
   - `generated/<svc>/default/types/package.json`: `"nx": { "tags": ["scope:shared", "type:generated"] }`.
7. Generate without a DB, then revert the agent files again (step 2):
   ```sh
   pnpm exec crouton update resources --project apps/<svc> --yes --skip-pull
   ```
8. Infra:
   - Add `CREATE USER <svc_u> WITH PASSWORD 'dev' CREATEDB; CREATE SCHEMA <svc_u> AUTHORIZATION <svc_u>; GRANT CREATE ON DATABASE annophis TO <svc_u>;` to `docker/init-data/01-schemas.sql`. It runs on an empty volume only, so reset with `docker compose down && rm -rf var/pgdata`.
   - Fix `DATABASE_URL` in `.env.example`: crouton writes its default there, not `--db-url` (crouton bug, not yet reported upstream).
   - In `compose.app.<svc>.yml`, give the backend `DATABASE_URL=postgresql://<svc_u>:dev@postgres:5432/annophis?schema=<svc_u>` and `NATS_URL=nats://nats:4222` under `environment`, plus `depends_on` on `postgres` and `nats` with `condition: service_healthy`. Copy the block from an existing service.
9. Admin UI: set `baseUrl: '/<svc>'` and `security: { default: { guard: 'admin' }, guards: { admin: InternalAdminGuard } }` in `CroutonApiModule.forResourceDir` (`crouton-backend/src/app/app.module.ts`) and add `{ name, title, port }` to `apps/gateway/crouton-backend/src/services.ts` and the service to `apps/e2e/src/services.ts`. Then add the service to the Ports table in `AGENTS.md`. CI and `compose.yml` pick it up automatically: CI loops over `apps/*/crouton.json`, and crouton adds the compose include.
10. Verify: `pnpm nx run-many -t lint typecheck build`, then `docker compose up`.

Never edit `generated/<svc>/` by hand.
