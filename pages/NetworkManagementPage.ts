import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_URLS } from '../constants/urls';
import { NetworkData } from '../data/testData';

/**
 * Page Object for the Network Management module.
 * Note: the Add Network wizard has no Payer field -- networks are payer-agnostic at creation.
 */
export class NetworkManagementPage extends BasePage {
    constructor(page: Page) {
          super(page);
    }

  async goto() {
        await this.page.goto(APP_URLS.networkManagement);
  }

  async openAddNetworkWizard() {
        await this.page.getByRole('button', { name: /add network/i }).click();
  }

  async fillBasicInfo(data: NetworkData) {
        await this.page.getByLabel(/network name$/i).fill(data.networkName);
        await this.page.getByLabel(/arabic/i).first().fill(data.networkNameAr).catch(() => undefined);
        await this.page.getByLabel(/network type/i).selectOption(data.networkType).catch(() => undefined);
        await this.page.getByLabel(/^description$/i).fill(data.description).catch(() => undefined);
        await this.page.getByRole('button', { name: /next/i }).click();
  }

  async fillEffectivePeriod(data: NetworkData) {
        await this.page.getByLabel(/effective date/i).fill(data.effectiveDate);
        await this.page.getByLabel(/expiry date/i).fill(data.expiryDate);
        await this.page.getByRole('button', { name: /^save$/i }).click();
  }

  async createNetwork(data: NetworkData) {
        await this.openAddNetworkWizard();
        await this.fillBasicInfo(data);
        await this.fillEffectivePeriod(data);
        await this.expectToast('Saved as draft');
  }

  async searchNetwork(name: string) {
        await this.searchByText(/search/i, name);
  }

  async sendForApproval(name: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /send for approval/i }).click();
        await this.confirmDialog(/send for approval|confirm|yes/i);
  }

  async openNetworkDetail(name: string) {
        await this.getRowByName(name).getByText(name).click();
  }

  async assignFacility(facilityLabel: string) {
        await this.page.getByRole('tab', { name: /assigned facilities/i }).click();
        await this.page.getByRole('button', { name: /assign facilities/i }).click();
        await this.page.getByText(facilityLabel).click();
        await this.page.getByRole('button', { name: /^assign$/i }).click();
  }

  async hasPayerFieldOnCreate(): Promise<boolean> {
        await this.openAddNetworkWizard();
        const count = await this.page.getByLabel(/^payer$/i).count();
        await this.page.keyboard.press('Escape');
        return count > 0;
  }

  async getSummaryCounters() {
        return {
                total: await this.page.getByText(/total networks/i).innerText(),
                active: await this.page.getByText(/^active$/i).first().innerText(),
        };
  }
}
