---
name: annophis-lib
description: Add a shared TypeScript library under libs/. Use when logic is needed by more than one service or app, and to pick the right lib kind (backend, frontend, shared).
---

# Add a shared lib

Only create a lib when two or more apps need the code. Otherwise keep it in the app.

## 1. Pick the kind

Every project has one `scope:*` and one `type:*` tag. ESLint (`@nx/enforce-module-boundaries`, root `eslint.config.mjs`) enforces them.

| Kind | Tags | May import libs tagged | Banned packages | Examples |
|---|---|---|---|---|
| backend lib | `scope:backend`, `type:lib` | `scope:backend` + `scope:shared` | `vue`, `@vue/*`, `vue-router`, `@ghentcdh/crouton-vue` | events (NATS), service-auth, service-kit |
| frontend lib | `scope:frontend`, `type:lib` | `scope:frontend` + `scope:shared` | `@nestjs/*`, `@prisma/*`, `@nats-io/*`, `@ghentcdh/crouton-api` | Vue components, composables |
| shared lib | `scope:shared`, `type:lib` | `scope:shared` only | everything banned above (no NestJS, no Vue, no Prisma, no NATS) | domain-types, contracts (Zod + types) |

Hard rules:
- **Backend never imports frontend, and frontend never imports backend.** Code both need goes in a shared lib.
- **A shared lib stays framework-free:** plain TypeScript and Zod only.
- **Libs never import apps or generated code.** `type:lib` may only depend on `type:lib`. Apps depend on libs, never the other way round.
- **Apps never import other apps.** Services talk via REST and events, not imports.

## 2. Generate

Check `pnpm nx g @nx/js:library --help` if the flags differ.

```sh
pnpm nx g @nx/js:library libs/<lib> --importPath=@annophis/<lib> \
  --bundler=none --unitTestRunner=vitest --linter=eslint \
  --tags=scope:<backend|frontend|shared>,type:lib --no-interactive
```

For a frontend lib with Vue components, use `@nx/vue:library` with the same `--importPath` and `--tags`.

## 3. Finish

- Export everything from `libs/<lib>/src/index.ts`.
- Tests go in `*.spec.ts` next to the source.
- Verify: `pnpm nx run-many -t lint typecheck test -p <lib>`. Lint fails on any boundary violation.
