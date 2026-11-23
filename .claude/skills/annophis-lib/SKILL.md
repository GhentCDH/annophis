---
name: annophis-lib
description: Add a shared TypeScript library under libs/. Use when logic is needed by more than one service.
---

# Add a shared lib

1. Only create a lib when two or more services need the code. Otherwise keep it in the service.
2. Generate it (check `pnpm nx g @nx/js:library --help` if flags differ):
   ```sh
   pnpm nx g @nx/js:library libs/<lib> --importPath=@annophis/<lib> \
     --bundler=none --unitTestRunner=vitest --linter=eslint --no-interactive
   ```
3. Tag it in `libs/<lib>/project.json`:
   - `scope:shared`: no NestJS and no Vue (e.g. Zod schemas and types).
   - `scope:api`: NestJS allowed, no Vue.
4. Export everything from `libs/<lib>/src/index.ts`.
5. Tests go in `*.spec.ts` next to the source.
6. Verify: `pnpm nx run-many -t lint typecheck test -p <lib>`.
