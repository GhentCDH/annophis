# Architecture

Annophis is a set of small services. Each **owns its data** (its own Postgres schema) and talks to the others only through **REST** or **events on the bus**. The **gateway** is the only entry point for browsers.

## Overview

```mermaid
flowchart TB
  user([Browser])

  subgraph gw[Gateway]
    ui["gateway UI<br/>crouton-frontend :6200"]
    bff["gateway backend<br/>crouton-backend :6100"]
  end

  subgraph svc[Services]
    projects["ms-projects :6101"]
    corpora["ms-corpora :6102"]
    annotation["ms-annotation :6103"]
    metadata["ms-metadata :6104"]
    text1["text-service-1 :6110"]
    text2["text-service-2 :6111"]
    ml["ml-adapter :6120"]
  end

  subgraph infra[Infra · Docker]
    pg[("Postgres :6432<br/>schema per service")]
    nats{{"NATS JetStream :6422<br/>stream ANNOPHIS"}}
    kc["Keycloak :6480<br/>realm annophis"]
  end

  user --> ui
  ui -- "/api" --> bff
  user -. login .-> kc
  bff -- "/#lt;svc#gt;/* proxy" --> svc
  bff --> kc
  svc --> pg
  bff --> pg
  svc <-. events .-> nats
  bff <-. events .-> nats
```

- **Gateway UI** is the only frontend. It is the crouton admin for *all* services (see [admin-gateway.md](admin-gateway.md)).
- **Gateway backend** logs users in with Keycloak, merges the service admins into one sidebar, and proxies `/<svc>/*` to the services.
- **Services** are crouton/NestJS backends. Each has its own Postgres schema (`ms_projects`, …), publishes entity events and can subscribe to others (see [events.md](events.md)).
- **ml-adapter** bridges to external ML models. The text services serve text collections.

## What every backend contains

```mermaid
flowchart TB
  subgraph backend["apps/#lt;svc#gt;/crouton-backend"]
    crouton["CroutonApiModule<br/>resources → REST CRUD + admin schemas<br/>baseUrl '/#lt;svc#gt;'"]
    kit["AnnophisServiceModule.forRoot()<br/>EventBus · /health · /hello"]
    ds["data source<br/>withEntityEvents(PrismaClient, '#lt;svc#gt;')"]
    auth["InternalAdminGuard<br/>via CroutonApiModule security<br/>admin role required"]
  end
  crouton --> ds
  ds -->|"writes → events"| kit
  ds --> pg[("Postgres schema #lt;svc#gt;")]
  kit --> nats{{NATS}}
```

| Piece | Where | Purpose |
|---|---|---|
| crouton resources | `crouton-backend/src/app/resources/*/resource.json` | REST CRUD + the admin UI definition, generated from Prisma |
| admin guard | `app.module.ts` → `CroutonApiModule` `security` option | `InternalAdminGuard` verifies the gateway's `X-Internal-Token` and requires `admin` |
| data source | `crouton-backend/src/app/data-sources/default/index.ts` | the Prisma client, wrapped with `withEntityEvents` |
| service kit | `@annophis/service-kit` | event bus, `/health`, `/hello` |
| contracts | `@annophis/contracts` | Zod schemas for DTOs and events: the single source of truth |

## Repository layout

```mermaid
flowchart LR
  root["annophis/"] --> apps["apps/"]
  root --> libs["libs/"]
  root --> gen["generated/"]
  root --> docker["docker/"]
  apps --> gwapp["gateway/<br/>crouton-backend + crouton-frontend"]
  apps --> svcapp["#lt;svc#gt;/<br/>crouton-backend, prisma/, .env.example"]
  apps --> e2e["e2e/<br/>Playwright"]
  libs --> shared["domain-types · contracts<br/>(scope:shared)"]
  libs --> back["events · service-auth · service-kit · testing<br/>(scope:backend)"]
  gen --> gensvc["#lt;svc#gt;/default/{client,types}<br/>never edit"]
  docker --> init["init-data/ (Postgres) · keycloak/ (realm)"]
```

Module boundaries are enforced by lint: backend never imports frontend code, shared libs stay framework-free, and apps never import other apps. See the table in [AGENTS.md](../AGENTS.md#module-boundaries-enforced-by-lint).

## Running it

| Mode | Command | When |
|---|---|---|
| Infra in Docker, apps on the host | `docker compose up -d postgres nats keycloak` + `pnpm dev` | day-to-day development, and what CI's e2e does |
| Everything in Docker | `docker compose up` | a quick demo; heavy (one dev container per app) |

Ports live in fixed ranges so Annophis runs next to other stacks: backends 61xx, UI 62xx, infra 64xx.
