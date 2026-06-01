import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './projects',
  testMatch: ['**/finance/**/e2e/**/*.spec.ts', '**/todos/**/e2e/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'finance',
      testMatch: '**/finance/**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001/finance' },
    },
    {
      name: 'todos',
      testMatch: '**/todos/**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000/todos' },
    },
  ],

  webServer: {
    command: 'npm run finance:build && npm run finance:dev',
    url: 'http://localhost:3001/finance',
    reuseExistingServer: !process.env.CI,
  },
});
