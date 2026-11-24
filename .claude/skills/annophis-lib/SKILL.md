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

The generator depends on the kind. All flags below were verified with Nx 24.

**Backend lib (NestJS):**
```sh
pnpm nx g @nx/nest:library libs/<lib> --importPath=@annophis/<lib> \
  --unitTestRunner=vitest --linter=eslint \
  --tags=scope:backend,type:lib --no-interactive
```

Use `@nx/nest:library` for every backend lib, even a plain helper lib such as `testing`: it sets `experimentalDecorators`, which is needed as soon as the lib imports Nest code.

**Shared lib (framework-free):**
```sh
pnpm nx g @nx/js:library libs/<lib> --importPath=@annophis/<lib> \
  --bundler=none --unitTestRunner=vitest --linter=eslint \
  --tags=scope:shared,type:lib --no-interactive
```

**Frontend lib (Vue):** use `@nx/vue:library` with the same `--importPath` and `--tags=scope:frontend,type:lib`. Install `@nx/vue` first, at the same version as `nx`.

## 3. Finish

- **Every kind:** delete `"module": "commonjs"` from `libs/<lib>/tsconfig.json`. Both `@nx/nest` and `@nx/js` add it, and it clashes with `moduleResolution: bundler` in `tsconfig.base.json` (TS5095). Backends are bundled by tsup, so the base `module: preserve` is fine.
- Libs use `noPropertyAccessFromIndexSignature`, so read env as `process.env['NAME']`.

- Export everything from `libs/<lib>/src/index.ts`.
- Tests go in `*.spec.ts` next to the source.
- Verify: `pnpm nx run-many -t lint typecheck test -p <lib>`. Lint fails on any boundary violation.
