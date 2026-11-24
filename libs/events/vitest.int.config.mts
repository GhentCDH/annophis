import { defineConfig } from 'vitest/config';

// Integration tests against a real NATS (NATS_URL, default nats://localhost:6422): nx run events:integration
export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: { name: 'events-integration', environment: 'node', include: ['src/**/*.int.spec.ts'], testTimeout: 30000 },
});
