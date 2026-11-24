import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true }, // @annophis/* libs via tsconfig paths
  test: { include: ['src/**/*.spec.ts'], environment: 'node' },
});
