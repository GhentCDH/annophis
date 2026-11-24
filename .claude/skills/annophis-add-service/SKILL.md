---
name: annophis-add-service
description: Add a new Annophis service (crouton project) under apps/. Use when asked to create a microservice, ms, adapter or text service.
---

# Add a service

`<svc>` is kebab-case (e.g. `ms-projects`). `<svc_u>` is the same name with `_` instead of `-` (Postgres user and schema). Take free ports from the Ports table in `AGENTS.md`.

1. Scaffold with the layout flags. Never move folders by hand afterwards.
   ```sh
   pnpm exec crouton create project <svc> \
     --apps-dir apps/<svc> --backend-dir crouton-backend --frontend-dir crouton-frontend \
     --generated-dir generated/<svc> \
     --frontend --frontend-port <fport> --backend-port <bport> \
     --db-url "postgresql://<svc_u>:dev@localhost:5432/annophis?schema=<svc_u>" -y
   ```
   - For an API-only service, use `--no-frontend` without `--frontend-port`, then delete `FRONTEND_PORT` from its `.env` and `.env.example`.
   - In zsh, pass flags held in a variable as an array, otherwise they are not split.
2. **Revert the root agent files.** Crouton re-stamps them with the last project's paths (crouton issue 16):
   ```sh
   git checkout -- .claude/skills/crouton .cursor .crouton AGENTS.md
   ```
3. Append to `apps/<svc>/.env` and `.env.example`:
   ```
   SERVICE_NAME=<svc>
   NATS_URL=nats://localhost:4222
   SERVICE_AUTH=off
   SERVICE_API_KEYS=dev-key-<svc>
   INTERNAL_JWT_SECRET=dev-only-change-me
   ```
4. Backend tweaks, so it can import `@annophis/*` libs:
   - `crouton-backend/tsconfig.json`: remove `rootDir`.
   - `crouton-backend/tsup.config.ts`: `noExternal: [/@<svc>\/.*/, /@annophis\/.*/]`.
   - `crouton-backend/nodemon.json`: add `"../../../libs"` to `watch`.
5. Tags:
   - Backend `project.json`: `["scope:backend", "type:app"]`.
   - Frontend `project.json`: `["scope:frontend", "type:app"]`.
   - `generated/<svc>/default/types/package.json`: `"nx": { "tags": ["scope:shared", "type:generated"] }`.
6. Generate without a DB, then revert the agent files again (step 2):
   ```sh
   pnpm exec crouton update resources --project apps/<svc> --yes --skip-pull
   ```
7. Add the service to the Ports table in `AGENTS.md`. CI and `compose.yml` pick it up automatically: CI loops over `apps/*/crouton.json`, and crouton adds the compose include.
8. Verify: `pnpm nx run-many -t lint typecheck build`.

Never edit `generated/<svc>/` by hand.
