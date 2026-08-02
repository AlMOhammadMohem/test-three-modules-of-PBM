import { Page, Locator, expect } from '@playwright/test';

/**
 * Base class that all Page Object Model (POM) classes extend.
 * Holds shared helpers used across the Payer Management and Network Management modules.
 */
export class BasePage {
    readonly page: Page;

  constructor(page: Page) {
        this.page = page;
  }

  async expectToast(text: string) {
        const toast = this.page.getByText(text, { exact: false }).first();
        await expect(toast).toBeVisible({ timeout: 10_000 });
  }

  async confirmDialog(buttonName: string | RegExp) {
        const dialog = this.page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: buttonName }).click();
  }

  async searchByText(placeholder: RegExp, value: string) {
        const search = this.page.getByPlaceholder(placeholder);
        await search.fill(value);
        await this.page.keyboard.press('Enter');
  }

  getRowByName(name: string): Locator {
        return this.page.getByRole('row', { name: new RegExp(name) });
  }

  async getStatusBadge(name: string): Promise<string> {
        const row = this.getRowByName(name);
        return row.locator('.badge, [class*="status"]').first().innerText();
  }
}
