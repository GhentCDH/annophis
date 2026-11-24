---
name: annophis-service-auth
description: How Annophis backends authenticate callers (gateway JWT, service API keys, public routes). Use when adding endpoints, calling another service, or debugging 401s.
---

# Service auth

`ServiceAuthGuard` (`@annophis/service-auth`) protects the **domain REST API** of a service. Put `@UseGuards(ServiceAuthGuard)` on every domain controller; `AnnophisServiceModule` provides the guard. Inside a guarded controller, mark exceptions with `@Public()`.

It is deliberately not global. Crouton's own routes (admin CRUD, `/_app/auth/*`) are protected by crouton auth: Keycloak, shared `CROUTON_AUTH_SECRET` session tokens, and the `admin` guard in `auth-providers/keycloak/auth-provider.json`.

| Caller | Sends | Accepted when |
|---|---|---|
| Gateway, on behalf of a user | `X-Internal-Token: <jwt>` (added by the gateway proxy) | HS256, signed with `INTERNAL_JWT_SECRET`, `iss` = `annophis-gateway`, `aud` = the target's `SERVICE_NAME`, 60 s |
| Another service | `X-Api-Key: <its SERVICE_API_KEY>` | key is in the target's comma-separated `SERVICE_API_KEYS` |
| Anyone | nothing | route has `@Public()` (e.g. `/health`) |

- The result is on `req.caller`: either `{ type: 'service' }` or `{ type: 'user', userId, email, roles }`.
- `Authorization` is the crouton session (for crouton routes); never read user identity from it in domain code. Use `req.caller`.
- `SERVICE_AUTH=on` is the default. `off` disables the check for quick local experiments; never use it in production.
- Any verification failure is a 401. A token for another service is rejected (audience check).
- Browsers never talk to services directly. They go through the gateway (`/api/<svc>/*`), which mints the internal token from the user's crouton session (`apps/gateway/crouton-backend/src/internal-token.middleware.ts`).
- **Calling another service:** send `X-Api-Key: process.env['SERVICE_API_KEY']`. The key must be listed in the target's `SERVICE_API_KEYS`.
