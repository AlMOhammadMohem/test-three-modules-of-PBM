import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_URLS } from '../constants/urls';

export type ApprovalTab = 'Payer' | 'Network' | 'Plan' | 'Policy' | 'Formulary';

/**
 * Page Object for the Approval Management (maker-checker reviewer queue) module.
 * Every Approve/Reject action requires ticking a mandatory review confirmation checkbox.
 */
export class ApprovalManagementPage extends BasePage {
    constructor(page: Page) {
          super(page);
    }

  async goto() {
        await this.page.goto(APP_URLS.approvalManagement);
  }

  async openTab(tab: ApprovalTab) {
        await this.page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
  }

  async approve(name: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /approve/i }).click();
        await this.page.getByRole('dialog').getByRole('checkbox').check();
        await this.page.getByRole('dialog').getByRole('button', { name: /^approve$/i }).click();
        await this.expectToast('Submission approved.');
  }

  async reject(name: string, reason: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /reject/i }).click();
        // Rejection Reason is a PrimeNG dropdown, not a native <select>, so getByLabel().selectOption()
        // never matches it.
        const dialog = this.page.getByRole('dialog');
        await dialog.getByRole('combobox').click();
        await this.page.getByRole('option', { name: reason, exact: true }).click()
              .catch(async () => {
                    await this.page.getByText(reason, { exact: true }).last().click();
              });
        await dialog.getByRole('checkbox').check();
        await dialog.getByRole('button', { name: /^reject$/i }).click();
        await this.expectToast('Submission rejected.');
  }
}
