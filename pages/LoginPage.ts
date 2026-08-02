import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_URLS } from '../constants/urls';

/**
 * Handles authentication against the PBM application.
 * Used by the auth fixture to auto-login before every test.
 */
export class LoginPage extends BasePage {
    constructor(page: Page) {
          super(page);
    }

  async goto() {
        await this.page.goto(APP_URLS.login);
  }

  async login(username: string, password: string) {
        await this.page.getByLabel(/username/i).fill(username);
        await this.page.getByLabel(/password/i).fill(password);
        await this.page.getByRole('button', { name: /log ?in|sign ?in/i }).click();
  }

  async isLoggedIn(): Promise<boolean> {
        await this.page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15_000 }).catch(() => undefined);
        return !this.page.url().includes('/login');
  }

  async loginIfNeeded(username: string, password: string) {
        if (this.page.url().includes('/login') || this.page.url() === APP_URLS.base + '/') {
                await this.goto();
                await this.login(username, password);
                await this.isLoggedIn();
        }
  }
}
