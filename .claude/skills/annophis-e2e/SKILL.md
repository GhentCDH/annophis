---
name: annophis-e2e
description: Write or run Annophis end-to-end tests (Playwright, apps/e2e) against the running docker compose stack. Use for cross-service flows, admin UI flows and health checks.
---

# E2E tests

`apps/e2e` is a single Playwright project for the whole stack. It is tagged `scope:e2e` and `type:e2e`, so it may import shared libs only (e.g. `@annophis/contracts` for fixtures).

- **Run:** start the stack (`docker compose up`), then `pnpm nx e2e e2e`. For one spec: `cd apps/e2e && pnpm exec playwright test health.spec.ts`. First time: `pnpm exec playwright install chromium`.
- **Targets:**
  - `baseURL` is the gateway UI: `GATEWAY_URL`, default `http://localhost:6200`.
  - Service backends come from `src/services.ts`: ports from `AGENTS.md`, overridable with `E2E_<SVC>_URL`.
- **No `webServer`.** The tests expect the stack to be running. Never start services from a test.
- **Specs** go in `apps/e2e/src/<area>.spec.ts`. Use `request` for API checks and `page` for UI.
  - Use semantic locators (`getByRole`, `getByLabel`), not CSS or XPath.
  - Assert with web-first `expect(...)`. No `waitForTimeout`.
- **Keep them independent.** Each test creates the data it needs and does not rely on order or on other tests' data.
- `e2e` is **not** part of `nx affected -t test`. CI runs it in its own workflow against compose.
