import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { PayerManagementPage } from '../pages/PayerManagementPage';
import { NetworkManagementPage } from '../pages/NetworkManagementPage';
import { ApprovalManagementPage } from '../pages/ApprovalManagementPage';
import { CREDENTIALS } from '../data/testData';

type Fixtures = {
    loginPage: LoginPage;
    payerPage: PayerManagementPage;
    networkPage: NetworkManagementPage;
    approvalPage: ApprovalManagementPage;
};

/**
 * Extends the base Playwright test with an auto-login step, so every test that imports
 * `test` from this file starts already authenticated against the PBM application.
 */
export const test = base.extend<Fixtures>({
    page: async ({ page }, use) => {
          const loginPage = new LoginPage(page);
          await loginPage.goto();
          await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
          await loginPage.isLoggedIn();
          await use(page);
    },

    loginPage: async ({ page }, use) => {
          await use(new LoginPage(page));
    },

    payerPage: async ({ page }, use) => {
          await use(new PayerManagementPage(page));
    },

    networkPage: async ({ page }, use) => {
          await use(new NetworkManagementPage(page));
    },

    approvalPage: async ({ page }, use) => {
          await use(new ApprovalManagementPage(page));
    },
});

export { expect } from '@playwright/test';
