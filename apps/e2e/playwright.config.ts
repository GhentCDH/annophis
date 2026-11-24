import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the running stack (`docker compose up`).
 * No webServer: start the stack first, then `pnpm nx e2e e2e`.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:6200',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
});
