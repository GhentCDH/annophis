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
  reporter: process.env['CI'] ? [['html', { open: 'never', outputFolder: 'playwright-report' }], ['github'], ['list']] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: process.env['GATEWAY_URL'] ?? 'http://localhost:6200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // API-only provider contract tests (nx run e2e:contract); no browser, no login
    { name: 'contract', testMatch: /.*\.contract\.ts/ },
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
});
