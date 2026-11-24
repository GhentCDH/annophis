import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/events',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'events',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // *.int.spec.ts need a running NATS: nx run events:integration (vitest.int.config.mts)
    exclude: ['**/*.int.spec.ts', '**/node_modules/**'],
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/events',
      provider: 'v8' as const,
    },
  },
}));
