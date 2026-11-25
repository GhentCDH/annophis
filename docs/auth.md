# Auth

There are two separate questions: **may this person use the admin?**, answered by Keycloak plus crouton, and **may this caller use a service's domain API?**, answered by `ServiceAuthGuard`.

```mermaid
flowchart TB
  subgraph admin["Admin UI & crouton routes (CRUD, /_app/*)"]
    direction LR
    kc[Keycloak login<br/>at the gateway] --> tok["crouton session JWT<br/>(CROUTON_AUTH_SECRET)"]
    tok --> guard1["each service: keycloak auth provider<br/>defaultSecurity → role admin"]
  end
  subgraph domain["Domain REST APIs (@UseGuards(ServiceAuthGuard))"]
    direction LR
    key["X-Api-Key<br/>(service → service)"] --> guard2[ServiceAuthGuard]
    jwt["X-Internal-Token from the gateway<br/>iss annophis-gateway, aud = service, sub = user"] --> guard2
    pub["@Public() routes, e.g. /health"] --> guard2
  end
```

## Admin access
- Users and roles live in the Keycloak realm `annophis` (`docker/keycloak/annophis-realm.json`). The dev users are `admin`/`admin` (roles admin, editor, viewer) and `viewer`/`viewer`.
- The gateway does a **server-side login** with the confidential client `annophis-gateway` and issues a crouton session JWT. The OIDC `state` during the redirect lives in an `express-session` stored in Postgres (`gateway.session`, Prisma model `Session`), so several gateway instances can share it. Every backend shares `CROUTON_AUTH_SECRET`, so every backend accepts it.
- Each project's `auth-providers/keycloak/auth-provider.json` requires the `admin` realm role on all crouton routes. A user without it is refused by every service (403), and the merged sidebar shows no service groups.

## Service-to-service and domain APIs
`ServiceAuthGuard` (`@annophis/service-auth`) is **opt-in**: put `@UseGuards(ServiceAuthGuard)` on domain controllers. It is not global, because crouton's own routes use crouton auth. The sample is the guarded `GET /hello` in `AnnophisServiceModule`.

| Caller | Sends | Accepted when | `req.caller` |
|---|---|---|---|
| a user, through the gateway | `X-Internal-Token` (added by the gateway) | HS256 with `INTERNAL_JWT_SECRET`, `iss` = `annophis-gateway`, `aud` = the target's `SERVICE_NAME`, not expired (60 s) | `{ type: 'user', userId, email, roles }` |
| another service | `X-Api-Key: <its SERVICE_API_KEY>` | the key is in the target's `SERVICE_API_KEYS` | `{ type: 'service' }` |
| anyone | nothing | the route is marked `@Public()` | — |

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (crouton session)
  participant G as gateway /api/#lt;svc#gt;/*
  participant S as service (ServiceAuthGuard)

  B->>G: GET /api/ms-projects/hello<br/>Authorization: Bearer #lt;crouton session#gt;
  G->>G: drop any client X-Internal-Token,<br/>verifySession → sign internal token (aud ms-projects, 60 s)
  G->>S: GET /hello + Authorization + X-Internal-Token
  S->>S: verify iss / aud / signature / expiry → req.caller = user
  S-->>B: 200 { caller: { type: 'user', roles: [...] } }
```

- **Two headers, two jobs.** `Authorization` carries the crouton session, for crouton's CRUD routes and their `admin` guard. `X-Internal-Token` carries the gateway's token, for domain routes.
- **Only the gateway mints internal tokens.** It strips any `X-Internal-Token` a client sends.
- **Service auth is on by default** (`SERVICE_AUTH=on`). `off` disables the check for quick local experiments only.
- **API keys:** each service sends its own `SERVICE_API_KEY`. In dev every service accepts all dev keys; in production, list only the real callers.
- Any verification failure is a 401.

## Secrets (dev values, never use in production)

| Env | Used by | Purpose |
|---|---|---|
| `CROUTON_AUTH_SECRET` | all backends | sign and verify admin session tokens |
| `KEYCLOAK_CLIENT_SECRET` | gateway | server-side login (`annophis-gateway` client) |
| `INTERNAL_JWT_SECRET` | all backends | the gateway signs, services verify `X-Internal-Token` |
| `SERVICE_API_KEY` | all backends | the key this service sends as `X-Api-Key` |
| `SERVICE_API_KEYS` | all backends | keys accepted from other services |
