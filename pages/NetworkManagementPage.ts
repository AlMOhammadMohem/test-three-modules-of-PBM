import { Page, expect } from '@playwright/test';
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

  /** Selects an option from a PrimeNG dropdown that is currently open. */
  private async selectDropdownOption(optionText: string) {
        await this.page.getByRole('option', { name: optionText, exact: true }).click()
              .catch(async () => {
                    await this.page.getByText(optionText, { exact: true }).last().click();
              });
  }

  /**
   * Fills a PrimeNG masked calendar input by typing each character. `.fill()` sets the raw
   * DOM value without going through the mask directive's key handlers, so the field gets
   * wiped back to empty on blur - pressSequentially() avoids that.
   */
  private async fillDate(locator: ReturnType<Page['getByPlaceholder']>, value: string) {
        await locator.click();
        await locator.pressSequentially(value, { delay: 30 });
        await this.page.keyboard.press('Tab');
  }

  // The live form has no <label>-associated inputs - fields are floating text divs next to
  // plain inputs, so getByLabel never matches. Locate by placeholder / role instead.
  async fillBasicInfo(data: NetworkData) {
        await this.page.getByPlaceholder('e.g. National Pharmacy Network').fill(data.networkName);
        await this.page.getByPlaceholder('مثال. شبكة الصيدليات الوطنية').fill(data.networkNameAr);
        await this.page.getByText('Select', { exact: true }).first().click();
        await this.selectDropdownOption(data.networkType);
        await this.page.getByPlaceholder('Purpose or coverage area (optional)').fill(data.description).catch(() => undefined);
        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
  }

  async fillEffectivePeriod(data: NetworkData) {
        const effectiveDateInput = this.page.getByPlaceholder('DD/MM/YYYY').first();
        const expiryDateInput = this.page.getByPlaceholder('DD/MM/YYYY').last();
        await this.fillDate(effectiveDateInput, data.effectiveDate);
        await this.fillDate(expiryDateInput, data.expiryDate);
        await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async createNetwork(data: NetworkData) {
        await this.openAddNetworkWizard();
        await this.fillBasicInfo(data);
        await this.fillEffectivePeriod(data);
        await this.expectToast('Saved as draft');
  }

  async searchNetwork(name: string) {
        await this.searchUntilRowFound(/search/i, name);
  }

  async sendForApproval(name: string) {
        // The list spans multiple pages across repeated test runs - a newly created record
        // isn't guaranteed to be on whatever page happens to be showing, so search first.
        await this.searchNetwork(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /send for approval/i }).click();
        await this.confirmDialog(/send for approval|confirm|yes/i);
        // Same race as Payer's sendForApproval - wait for the badge to actually leave Draft
        // before returning, rather than trusting the click+confirm to be reflected instantly.
        const badge = row.locator('td', { hasText: /v\d+\s*·/ });
        await expect(badge).not.toHaveText(/draft/i, { timeout: 20_000 });
  }

  async openNetworkDetail(name: string) {
        await this.searchNetwork(name);
        // Clicking the row's name text doesn't navigate anywhere - only the "View" button does.
        await this.getRowByName(name).getByRole('button', { name: 'View', exact: true }).click();
  }

  async assignFacility(facilityLabel: string) {
        // The detail page's section switcher renders as plain buttons, not ARIA tabs.
        await this.page.getByRole('button', { name: /assigned facilities/i }).click();
        await this.page.getByRole('button', { name: /assign facilities/i }).click();
        // The "Pharmacies" field is a PrimeNG multiselect - it must be clicked open before its
        // options become visible; the underlying combobox input itself is hidden/unclickable.
        await this.page.getByText('Select pharmacies to assign').click();
        await this.page.getByRole('option', { name: new RegExp(facilityLabel) }).click();
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
