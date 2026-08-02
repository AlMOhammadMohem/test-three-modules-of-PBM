import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the PBM (Pharmacy Benefit Management) automation framework.
 * Covers the Payer Management and Network Management modules.
 */
export default defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: {
          timeout: 10_000,
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [
          ['html', { outputFolder: 'reports/html-report', open: 'never' }],
          ['list'],
          ['json', { outputFile: 'reports/results.json' }],
        ],
    use: {
          baseURL: process.env.BASE_URL || 'http://20.75.201.176',
          trace: 'retain-on-failure',
          screenshot: 'only-on-failure',
          video: 'retain-on-failure',
          actionTimeout: 15_000,
          navigationTimeout: 30_000,
    },
    projects: [
      {
              name: 'chromium',
              use: { ...devices['Desktop Chrome'] },
      },
        ],
    outputDir: 'test-results/',
});
