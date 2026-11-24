---
name: annophis-service-auth
description: How Annophis backends authenticate callers (gateway JWT, service API keys, public routes). Use when adding endpoints, calling another service, or debugging 401s.
---

# Service auth

`ServiceAuthGuard` (`@annophis/service-auth`) protects the **domain REST API** of a service. Put `@UseGuards(ServiceAuthGuard)` on every domain controller; `AnnophisServiceModule` provides the guard. Inside a guarded controller, mark exceptions with `@Public()`.

It is deliberately not global. Crouton's own routes (admin CRUD, `/_app/auth/*`) are protected by crouton auth: Keycloak, shared `CROUTON_AUTH_SECRET` session tokens, and the `admin` guard in `auth-providers/keycloak/auth-provider.json`.

| Caller | Sends | Accepted when |
|---|---|---|
| Gateway, on behalf of a user | `Authorization: Bearer <jwt>` | HS256, signed with `INTERNAL_JWT_SECRET`, `iss` = `annophis-gateway`, `aud` = the target's `SERVICE_NAME` |
| Another service | `X-Api-Key: <key>` | key is in the target's comma-separated `SERVICE_API_KEYS` |
| Anyone | nothing | route has `@Public()` (e.g. `/health`) |

- The result is on `req.caller`: either `{ type: 'service' }` or `{ type: 'user', userId, projectId, projectRole, ... }`.
- `SERVICE_AUTH=off` (the dev default in `.env`) disables the check. Never use it in production.
- Any verification failure is a 401. A token for another service is rejected (audience check).
- Browsers never talk to services directly. They go through the gateway, which mints the internal JWT.
- **Calling another service:** send your own key, which must be listed in the target's `SERVICE_API_KEYS`.
