import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_URLS } from '../constants/urls';
import { PayerData } from '../data/testData';

/**
 * Page Object for the Payer Management module.
 * Wraps the Add Payer wizard, list actions (edit/send for approval/inactivate) and status lookups.
 */
export class PayerManagementPage extends BasePage {
    constructor(page: Page) {
          super(page);
    }

  async goto() {
        await this.page.goto(APP_URLS.payerManagement);
  }

  async openAddPayerWizard() {
        await this.page.getByRole('button', { name: /add payer/i }).click();
  }

  async fillBasicInfo(data: PayerData) {
        await this.page.getByLabel(/payer name$/i).fill(data.payerName);
        await this.page.getByLabel(/arabic/i).first().fill(data.payerNameAr).catch(() => undefined);
        await this.page.getByLabel(/payer type/i).selectOption(data.payerType).catch(() => undefined);
        await this.page.getByRole('button', { name: /next/i }).click();
  }

  async fillContactInfo(data: PayerData) {
        await this.page.getByLabel(/email/i).fill(data.email);
        await this.page.getByLabel(/phone/i).fill(data.phone);
        await this.page.getByLabel(/license number/i).fill(data.licenseNumber);
        await this.page.getByLabel(/country/i).selectOption(data.country).catch(() => undefined);
        await this.page.getByLabel(/city/i).fill(data.city).catch(() => undefined);
        await this.page.getByRole('button', { name: /next/i }).click();
  }

  async fillEffectivePeriod(data: PayerData) {
        await this.page.getByLabel(/effective date/i).fill(data.effectiveDate);
        await this.page.getByLabel(/expiry date/i).fill(data.expiryDate);
        await this.page.getByRole('button', { name: /^save$/i }).click();
  }

  async createPayer(data: PayerData) {
        await this.openAddPayerWizard();
        await this.fillBasicInfo(data);
        await this.fillContactInfo(data);
        await this.fillEffectivePeriod(data);
        await this.expectToast('Saved as draft');
  }

  async searchPayer(name: string) {
        await this.searchByText(/search/i, name);
  }

  async sendForApproval(name: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /send for approval/i }).click();
        await this.confirmDialog(/send for approval|confirm|yes/i);
  }

  async editPayer(name: string, newName: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /^edit$/i }).click();
        await this.page.getByLabel(/payer name$/i).fill(newName);
        await this.page.getByRole('button', { name: /next/i }).click();
        await this.page.getByRole('button', { name: /next/i }).click();
        await this.page.getByRole('button', { name: /^save$/i }).click();
        await this.expectToast('Saved as draft');
  }

  async inactivatePayer(name: string, reason: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /inactivate/i }).click();
        await this.page.getByLabel(/inactivation reason/i).selectOption(reason);
        await this.page.getByRole('dialog').getByRole('button', { name: /inactivate/i }).click();
  }

  async isInactivateReasonRequired(name: string): Promise<boolean> {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /inactivate/i }).click();
        const confirmButton = this.page.getByRole('dialog').getByRole('button', { name: /^inactivate$/i });
        return confirmButton.isDisabled();
  }

  async getSummaryCounters() {
        return {
                total: await this.page.getByText(/total payers/i).innerText(),
                active: await this.page.getByText(/^active$/i).first().innerText(),
        };
  }
}
