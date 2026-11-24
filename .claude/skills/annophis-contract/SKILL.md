---
name: annophis-contract
description: Add or change a REST DTO or event schema shared between Annophis services. Use whenever a service's API or bus event shape changes.
---

# Contracts

`libs/contracts` (`@annophis/contracts`, `scope:shared`) is the single source of truth for every shape that crosses a service boundary. It contains Zod only: no NestJS, no Vue.

1. Put the schema in `libs/contracts/src/lib/<svc>/<name>.ts`, or in `events.ts` for cross-cutting events. Export it from `src/index.ts`.
2. Events: wrap the payload with `eventEnvelope(z.object({...}))` and export both the schema and `type X = z.infer<typeof X>`.
3. Primitives (URNs, selectors, W3C annotation parts) come from `@annophis/domain-types`. Never redefine them.
4. **Fixture test, required:** `<name>.spec.ts` next to it, with at least one valid payload that must parse and the invalid cases that must fail (`it.each`). See `src/lib/events.spec.ts`.
5. **Breaking change** (a field removed or renamed, or a type narrowed): bump `dataVersion` for events, or add a new versioned schema. Keep the old one until every consumer has moved. Additive optional fields are not breaking.
6. Verify: `pnpm nx run-many -t lint typecheck test -p contracts`. Every service depends on contracts, so `nx affected` rebuilds all of them.
