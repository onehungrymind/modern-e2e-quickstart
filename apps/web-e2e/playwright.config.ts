import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { workspaceRoot } from '@nx/devkit';
import * as path from 'node:path';

// playwright-bdd config is wired up here so `bddgen` runs cleanly even before
// any .feature files exist. Module 01 adds the first feature; until then this
// generates zero spec files and the smoke project below carries the suite.
defineBddConfig({
  features: './src/features/**/*.feature',
  steps: ['./src/steps/**/*.ts', './src/fixtures/**/*.ts'],
  outputDir: './src/.features-gen',
  verbose: false,
});

const webBaseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';
const apiBaseURL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';

export default defineConfig({
  fullyParallel: true,
  workers: process.env['CI'] ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI']
    ? [['dot'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: webBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    extraHTTPHeaders: {
      'x-e2e-api-base-url': apiBaseURL,
    },
  },

  webServer: [
    {
      command: 'npx nx run api:serve',
      url: `${apiBaseURL}/auth/me`,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
      cwd: workspaceRoot,
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev-not-secret-pin-for-local-do-not-use-in-production',
      },
    },
    {
      command: 'npx nx run web:preview',
      url: webBaseURL,
      reuseExistingServer: !process.env['CI'],
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 90_000,
      cwd: workspaceRoot,
      env: {
        VITE_API_BASE_URL: apiBaseURL,
      },
    },
  ],

  projects: [
    {
      name: 'smoke',
      testDir: path.resolve(__dirname, 'src'),
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
