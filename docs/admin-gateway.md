# The admin gateway: one UI for every service

There is **one** admin UI: the gateway's crouton frontend at http://localhost:6200. Services have no frontend of their own.

crouton-vue talks to exactly one backend per app, so the **gateway backend acts as a facade**: to the UI it looks like a single crouton backend, while it actually fans out to every service.

Code: `apps/gateway/crouton-backend/src/admin-facade.ts`, `merge-layouts.ts`, `services.ts`.

## The pieces

```mermaid
flowchart LR
  ui["gateway UI :6200<br/>(crouton-vue)"]
  vite["vite dev proxy<br/>/api → :6100"]
  subgraph bff["gateway backend :6100"]
    layout["GET /_app/layout<br/>merge sidebars"]
    proxy["/#lt;svc#gt;/* → reverse proxy<br/>(prefix stripped)"]
    login["/_app/auth/keycloak/*<br/>crouton login"]
    own["gateway's own crouton<br/>resources"]
  end
  svc["#lt;svc#gt; backend<br/>baseUrl '/#lt;svc#gt;'"]
  kc[Keycloak]

  ui --> vite --> bff
  layout -->|"GET /_app/layout per service"| svc
  proxy --> svc
  login <--> kc
```

## Logging in

One login at the gateway gives a **crouton session token** (a JWT signed with `CROUTON_AUTH_SECRET`). Every backend shares that secret, so the same token works for all services.

```mermaid
sequenceDiagram
  autonumber
  actor U as Browser
  participant UI as gateway UI :6200
  participant GW as gateway backend :6100
  participant KC as Keycloak :6480

  U->>UI: open http://localhost:6200
  UI->>GW: GET /api/_app/auth
  GW-->>UI: one provider: keycloak (server login)
  UI->>GW: GET /api/_app/auth/keycloak/login
  GW-->>U: 302 to Keycloak (state kept in express-session)
  U->>KC: username + password
  KC-->>U: 302 /api/_app/auth/keycloak/callback?code=…
  U->>GW: callback with code
  GW->>KC: exchange code (client annophis-gateway + secret)
  KC-->>GW: tokens with realm_access.roles
  GW-->>U: 302 /auth/callback#token=#lt;crouton session JWT#gt;
  Note over U: token stored in localStorage (crouton.session),<br/>sent as Bearer on every request
```

## One sidebar for all services

```mermaid
sequenceDiagram
  autonumber
  participant UI as gateway UI
  participant GW as gateway backend
  participant S as each service (in parallel)

  UI->>GW: GET /api/_app/layout (Bearer token)
  GW->>GW: own layout + GET /_app/me (roles)
  alt user has the admin role
    GW->>S: GET /_app/layout (Bearer forwarded)
    S-->>GW: sidebar of that service
  else no admin role
    Note over GW: service groups are skipped
  end
  GW-->>UI: merged sidebar
```

`mergeLayouts` keeps the gateway's own items at the top level and adds **one group per service** (title from `services.ts`). Every leaf is prefixed so it stays unique and routes through the proxy:

| Service sends | Merged sidebar gets |
|---|---|
| `{ id: 'project', route: 'project' }` | `{ id: 'ms-projects.project', route: 'ms-projects/project' }` |

A service that is down is skipped, with a warning in the gateway log.

Service URLs come from `ANNOPHIS_<SVC>_URL` (e.g. `ANNOPHIS_MS_PROJECTS_URL`), falling back to `http://localhost:<port>` for `pnpm dev`.

## Health of the whole stack

`GET /api/health/services` (public) calls the gateway and every service's `/health`. It returns `{ status: 'ok' | 'degraded', services: [...] }`: HTTP 200 when everything is up and on the bus, 503 otherwise. Compose and Nomad use it as the gateway's health check.

In the UI: **http://localhost:6200/system-status** shows the same data as a table that refreshes every 10 s. It requires a login, like the rest of the admin. The raw JSON is at `/api/health/services`. Each row shows:
- status and event-bus connection (`/health`);
- the crouton self-check summary (`/crouton/status.json`: database and resource errors), which also counts towards the overall status. Below the table, a collapsible block per service shows the main parts of crouton's status: app and crouton version, environment, databases, and resources (valid / invalid / warnings / draft / needs migration), problems first. Services with problems open automatically;
- links to the service's **API docs** (Swagger at `/api/<svc>/docs`, the gateway's at `/api/docs`) and its crouton status JSON.

Every service's OpenAPI document lists two servers: `/api/<svc>` (through the gateway) and `/` (the service directly). Swagger's "Try it out" therefore works from the admin UI.

## Opening and editing a resource

```mermaid
sequenceDiagram
  autonumber
  participant UI as gateway UI
  participant GW as gateway backend
  participant P as ms-projects :6101
  participant DB as Postgres (ms_projects)

  UI->>GW: GET /api/ms-projects/project/schemas
  GW->>P: GET /project/schemas (proxy, Bearer forwarded)
  P-->>UI: schemas with operation URIs /ms-projects/project…
  UI->>GW: POST /api/ms-projects/project
  GW->>P: POST /project
  P->>P: admin guard (crouton token, realm role admin)
  P->>DB: insert (Prisma + entity events)
  P-->>UI: 201 Created
```

Because each service sets `baseUrl: '/<svc>'`, the URIs it puts in its schemas already carry the prefix. The UI just calls them under `/api`.

## Adding a service to the admin UI
1. In the service's `app.module.ts`: `CroutonApiModule.forResourceDir(..., { baseUrl: '/<svc>' })`.
2. In `apps/gateway/crouton-backend/src/services.ts`: add `{ name, title, port }`.

The `annophis-add-service` skill has the full checklist.

## Limits (by design, for now)
- One `isDev`/language setting for the whole UI, the gateway's.
- No relations *between* services in the admin. Relations inside one service work.
- The admin writes straight to the databases, so **never expose it publicly**. It needs the Keycloak `admin` role.
- A crouton feature, "multi-backend frontend" (one crouton context per route subtree), would make this facade unnecessary.
