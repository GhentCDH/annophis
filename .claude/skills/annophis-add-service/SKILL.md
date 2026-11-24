---
name: annophis-add-service
description: Add a new Annophis service (crouton project) under apps/. Use when asked to create a microservice, ms, adapter or text service.
---

# Add a service

`<svc>` is kebab-case (e.g. `projects-ms`). `<svc_u>` is the same name with `_` instead of `-` (Postgres user and schema).

1. Scaffold it with the layout flags. Never move folders by hand afterwards.
   ```sh
   pnpm exec crouton create project <svc> \
     --prefix apps/<svc> --apps-dir apps/<svc> \
     --backend-dir crouton-backend --frontend-dir crouton-frontend \
     --generated-dir generated/<svc> \
     --frontend \
     --backend-port <port> \
     --db-url "postgresql://<svc_u>:dev@localhost:5432/annophis?schema=<svc_u>" -y
   ```
   Use `--no-frontend` instead of `--frontend` for an API-only service. Take a free port from the Ports table in `AGENTS.md`.
2. Generate code without a DB: `pnpm exec crouton update resources --project apps/<svc> --yes --skip-pull`.
3. Make sure the root `compose.yml` `include:` lists `compose.app.<svc>.yml`.
4. Add the service to the CI install-command loop in `.github/workflows/ci.yml`.
5. Update `AGENTS.md` (ports table) when the service adds structure.
6. Verify: `pnpm nx run-many -t lint typecheck build -p <svc>-backend <svc>-frontend`.

Never edit `generated/<svc>/` by hand.
