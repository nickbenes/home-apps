import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './projects',
  testMatch: ['**/bills/**/e2e/**/*.spec.ts', '**/benes-finance/**/e2e/**/*.spec.ts'],
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
      name: 'bills',
      testMatch: '**/bills/**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'benes-finance',
      testMatch: '**/benes-finance/**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
    },
  ],

  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
