# Release to production (Nomad)

> **Status: proposal.** Nothing is deployed yet. This describes how Annophis goes from a git tag to running on the GhentCDH Nomad cluster, following the conventions of [`nomad-jobs-ns-ghentcdh`](https://github.ugent.be/containers/nomad-jobs-ns-ghentcdh) (see `new_polities`, `mela` and `keycloak` there). Items marked **TODO (phase 1)** must be done before the first deploy.

## Principles

- **One image per service.** There is no PM2 and no combined image. In Nomad each service is its own **task** (container), so it gets its own memory limit, restarts and logs.
- **One Nomad job `annophis`** with one **group**. Tasks in a group share a private network, so the gateway reaches services without service discovery. This is the same pattern as `new_polities` and `mela`.
- **Shared infrastructure is reused**, not shipped:
  - Postgres is the central GhentCDH database server.
  - Keycloak is the shared `auth.ghentcdh.ugent.be`, with a realm `annophis`.
- **Only the gateway is reachable from outside**, through the Nomad load balancer (`nomad-lb` tag). Services, NATS and the admin API stay inside the group.
- **Environments:** `tst` → `qas` → `prd`, one `<env>.vars.yaml` each. The same image tag is promoted through all three; it is never rebuilt.

## The release flow

```mermaid
flowchart LR
  pr["PR merged to main"] --> tag["git tag vX.Y.Z<br/>(Conventional Commits)"]
  tag --> build["docker-build.yml<br/>8 images → ghcr.io/ghentcdh/annophis-#lt;svc#gt;:X.Y.Z<br/>+ GitHub release notes"]
  build --> tst["nomad-jobs: annophis/tst.vars.yaml<br/>version: X.Y.Z → deploy tst"]
  tst --> qas["qas.vars.yaml → deploy qas<br/>(acceptance)"]
  qas --> prd["prd.vars.yaml → deploy prd"]
  tst -. "e2e smoke on tst" .-> tst
```

1. **Tag:** `git tag v0.1.0 && git push --tags` on `main`. Releases are cut from `main` only.
2. **Build:** `.github/workflows/docker-build.yml` builds one image per service for amd64 and arm64, pushes `ghcr.io/ghentcdh/annophis-<svc>:<version>` plus `:<major>.<minor>` and `:latest`, and creates a GitHub release with notes from the Conventional Commits.
3. **Pull through Nexus:** Nomad pulls from `nexus.ugent.be/docker-group-nomad-<env>/…`, as every GhentCDH job does. **TODO (phase 1):** confirm with the infra team that the Nexus group proxies `ghcr.io/ghentcdh`, or whether images must be pushed to Nexus as well.
4. **Deploy:** bump the version in `annophis/<env>.vars.yaml` in the nomad-jobs repo and deploy that environment, `tst` first. The job's `update { max_parallel = 1 }` rolls one allocation at a time.
5. **Promote:** after checks on `tst`, set the same version in `qas`, then `prd`.

## What runs in the Nomad job

```mermaid
flowchart TB
  user([Browser]) --> lb["Nomad LB<br/>annophis.ghentcdh.ugent.be"]
  subgraph job["Nomad job 'annophis' · group 'annophis' (private network)"]
    gw["task gateway<br/>image annophis-gateway<br/>Caddy :9000 (UI + /api) → backend :3000"]
    s1["task ms-projects"]
    s2["task ms-corpora"]
    s3["task ms-annotation · ms-metadata"]
    s4["task text-service-1 · text-service-2"]
    s5["task ml-adapter"]
    nats{{"task nats<br/>JetStream"}}
    mig["prestart tasks #lt;app#gt;-migrate<br/>image #lt;app#gt; with arg 'migrate'"]
  end
  lb --> gw
  gw -- "/#lt;svc#gt;/* (facade proxy)" --> s1 & s2 & s3 & s4 & s5
  s1 & s2 & s3 & s4 & s5 & gw <-.-> nats
  job --> pg[("central Postgres<br/>db annophis, schema per service")]
  gw --> kc["auth.ghentcdh.ugent.be<br/>realm annophis"]
  vault[(Vault kv_nomad/ghentcdh/annophis)] -. env .-> job
```

| Dev (docker compose) | Production (Nomad) |
|---|---|
| `compose.infra.yml` Postgres container | central GhentCDH Postgres. DB `annophis` with a user and schema per service, created once by the DBA. |
| Keycloak container, realm JSON auto-imported | shared `auth.ghentcdh.ugent.be`: import `docker/keycloak/annophis-realm.json` once, then set production redirect URIs and secrets. No dev users. |
| NATS container | `nats` task in the group, with JetStream storage on a CSI volume (see `volumes/` in the nomad-jobs repo). JetStream prefers local disk, so check NFS performance or use a host volume. |
| Vite proxy `/api` → gateway backend | the gateway image's Caddy serves the UI and proxies `/api` → gateway backend in the same container, so no nginx sidecar is needed |
| `.env.example` defaults | Vault `kv_nomad/ghentcdh/annophis`, rendered into each task's env with a `template` block |
| service URLs from `ANNOPHIS_<SVC>_URL` (compose: `http://<svc>-backend:<port>`) | the same env vars, e.g. `ANNOPHIS_MS_PROJECTS_URL=http://{{ env "NOMAD_ADDR_ms_projects" }}` |
| backends run `prisma migrate deploy` on start (compose command) | every image accepts the argument `migrate` (`prisma migrate deploy`, then exit): a prestart task per app in Nomad, a `<app>-migrate` one-shot in `compose.prod.yml` |

### The job template

A copy-ready draft lives in [`deploy/nomad/annophis/`](../deploy/nomad/annophis/README.md): `job.nomad.hcl.j2` plus `tst`/`qas`/`prd` vars. The template loops over an `apps` list (name, port, memory, image), so adding a service is one entry in the vars files.

### Trying the production images locally: `compose.prod.yml`

`compose.prod.yml` runs exactly what Nomad will run: the 8 images, NATS, and the `<app>-migrate` one-shots, with only the gateway published. Postgres and Keycloak are external (`.env.prod`, see `.env.prod.example`). `compose.prod.smoke.yml` adds throwaway Postgres and Keycloak for a self-contained test, and CI runs it on every PR that touches the apps (`docker-build.yml` → *Smoke test compose.prod.yml*):

```sh
for a in gateway ms-projects ms-corpora ms-annotation ms-metadata text-service-1 text-service-2 ml-adapter; do
  docker build -f "apps/$a/Dockerfile.prod" -t "annophis-$a:test" .
done
ANNOPHIS_IMAGE_PREFIX= ANNOPHIS_VERSION=test ANNOPHIS_PORT=6299 ANNOPHIS_ENV_FILE=.env.prod.example \
  docker compose -p annophis-smoke -f compose.prod.yml -f compose.prod.smoke.yml --env-file .env.prod.example up -d --wait
curl localhost:6299/api/health/services
```

## Configuration and secrets

Every task gets its env from Vault (`kv_nomad/ghentcdh/annophis`):

| Key | Notes |
|---|---|
| `DATABASE_URL` per service | `postgresql://<svc_u>:…@<pg-host>:5432/annophis?schema=<svc_u>`. Use one Vault key per service, e.g. `MS_PROJECTS_DATABASE_URL`, mapped in that task's template. |
| `NATS_URL` | `nats://{{ env "NOMAD_ADDR_nats" }}` |
| `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` | `https://auth.ghentcdh.ugent.be`, `annophis` |
| `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_CALLBACK_URL`, `CROUTON_FRONTEND_URL` | gateway only; production URLs |
| `CROUTON_AUTH_SECRET` | one long random value, the same for **all** backends |
| `INTERNAL_JWT_SECRET`, `SERVICE_API_KEYS` | real values, with `SERVICE_AUTH` on |
| `SERVICE_NAME`, `BACKEND_PORT` | per task, can live in the job template itself |

## Releases, migrations and rollback

- **Versioning:** SemVer tags, with release notes generated from Conventional Commits (PR titles are enforced by `pr-title.yml`).
- **Migrations are forward-only.** The `migrate` prestart task runs `prisma migrate deploy` before the new version starts. Write migrations that the *previous* version can still run against: expand first, contract in a later release.
- **Rollback:** set the previous version in `<env>.vars.yaml` and redeploy. A schema migration is not rolled back, which is why expand/contract matters.
- **Events across versions:** `dataVersion` in the event envelope lets consumers handle old and new payloads during a rolling update (see the `annophis-contract` skill).

## Who can reach what

- The **admin UI is the gateway**, and the admin writes straight to the databases. It is protected by the Keycloak `admin` role. For `prd`, also decide whether to restrict the vhost to the UGent network or VPN, as other internal GhentCDH tools do.
- Services, NATS and the migrate task have no load-balancer service, so they're only reachable inside the group.
- Health: the Nomad service check calls the gateway's `GET /api/health/services`. It returns 200 only when the gateway and every service are up and connected to NATS, and 503 otherwise.

## TODO before the first deploy

1. ~~Gateway reads service URLs from env~~: done (`ANNOPHIS_<SVC>_URL`).
2. ~~Migrate step for production~~: done (image argument `migrate`; prestart tasks / `<app>-migrate`).
3. Confirm Nexus ↔ ghcr image pulls with the infra team.
4. Copy `deploy/nomad/annophis/` to the nomad-jobs repo, check the `base/` macro arguments, and create the Vault secrets.
5. Create the DB `annophis` (users, schemas, `GRANT CREATE ON DATABASE`) on the central Postgres, and the realm `annophis` on `auth.ghentcdh.ugent.be` with production redirect URIs.
6. NATS JetStream storage: a CSI volume or host volume, plus a retention policy for stream `ANNOPHIS`.
7. ~~Aggregated health endpoint~~: done (`/api/health/services`, the Nomad check). ~~Image build and smoke test in CI~~: done. Still to do: the e2e suite against `tst`.
8. Register the application, domains and healthchecks in auto (`auto:audit` skill, or the `auto` MCP server in `.mcp.json`).
