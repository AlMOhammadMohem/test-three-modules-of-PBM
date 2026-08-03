import { Page, expect } from '@playwright/test';
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
  async fillBasicInfo(data: PayerData) {
        await this.page.getByPlaceholder('e.g. Bupa Arabia').fill(data.payerName);
        await this.page.getByPlaceholder('مثال. بوبا العربية').fill(data.payerNameAr);
        await this.page.getByText('Select', { exact: true }).first().click();
        await this.selectDropdownOption(data.payerType);
        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
  }

  async fillContactInfo(data: PayerData) {
        await this.page.getByPlaceholder('e.g. email@mail.com').fill(data.email);
        // The phone input's own placeholder is just the local number - country code is a
        // separate "+966" dropdown next to it.
        await this.page.getByPlaceholder('5XXXXXXXX').fill(data.phone);
        await this.page.locator('text=License Number').locator('..').locator('input[type="text"]').fill(data.licenseNumber);

        // Country defaults to "Saudi Arabia" already selected - only reopen the dropdown if
        // a different value is requested.
        const countryDropdown = this.page.locator('text=Country').locator('..').getByRole('combobox');
        const currentCountry = await countryDropdown.textContent();
        if (currentCountry?.trim() !== data.country) {
              await countryDropdown.click();
              await this.page.getByRole('searchbox').or(this.page.locator('input[type="text"]').last()).fill(data.country);
              await this.selectDropdownOption(data.country);
        }

        await this.page.locator('text=City').locator('..').getByRole('combobox').click();
        await this.selectDropdownOption(data.city);

        await this.page.locator('text=Preferred Language').locator('..').getByRole('combobox').click();
        await this.selectDropdownOption(data.preferredLanguage);

        await this.page.locator('text=Preferred Contact Method').locator('..').getByRole('combobox').click();
        await this.selectDropdownOption(data.preferredContactMethod);

        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
  }

  async fillEffectivePeriod(data: PayerData) {
        const effectiveDateInput = this.page.getByPlaceholder('DD/MM/YYYY').first();
        const expiryDateInput = this.page.getByPlaceholder('DD/MM/YYYY').last();
        await this.fillDate(effectiveDateInput, data.effectiveDate);
        // Expiry Date is required, like Network's.
        await this.fillDate(expiryDateInput, data.expiryDate);
        await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async createPayer(data: PayerData) {
        await this.openAddPayerWizard();
        await this.fillBasicInfo(data);
        await this.fillContactInfo(data);
        await this.fillEffectivePeriod(data);
        await this.expectToast('Saved as draft');
  }

  async searchPayer(name: string) {
        await this.searchUntilRowFound(/search/i, name);
  }

  async sendForApproval(name: string) {
        // The list has grown well past one page across repeated test runs - a newly created
        // record isn't guaranteed to be on whatever page happens to be showing, so search first.
        await this.searchPayer(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /send for approval/i }).click();
        await this.confirmDialog(/send for approval|confirm|yes/i);
        // The click+confirm can return before the row's badge actually updates - callers that
        // immediately read the badge afterward would otherwise race and see the stale "Draft"
        // value, so wait here for the transition to actually land.
        const badge = row.locator('td', { hasText: /v\d+\s*·/ });
        await expect(badge).not.toHaveText(/draft/i, { timeout: 20_000 });
  }

  async editPayer(name: string, newName: string) {
        await this.searchPayer(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /^edit$/i }).click();
        const payerNameInput = this.page.getByPlaceholder('e.g. Bupa Arabia');
        // The Edit drawer fetches the existing payer and patches the form asynchronously;
        // filling before that patch arrives gets silently clobbered when it lands.
        await payerNameInput.waitFor({ state: 'visible' });
        await this.page.waitForFunction(
          (el) => (el as HTMLInputElement).value.trim().length > 0,
          await payerNameInput.elementHandle()
        );
        await payerNameInput.fill(newName);
        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
        await this.page.getByRole('button', { name: 'Save', exact: true }).click();
        await this.expectToast('Saved as draft');
        // Same race as sendForApproval - the row's badge cell is visible immediately with its
        // pre-edit value (e.g. "Published") and only flips to "Draft" a moment later.
        const badge = row.locator('td', { hasText: /v\d+\s*·/ });
        await expect(badge).toHaveText(/draft/i, { timeout: 20_000 });
  }

  // Both methods below open the "Inactivate Payer" panel - it's rendered as a side drawer
  // (accessibility role "complementary"), not a "dialog", so getByRole('dialog') never
  // matched it. The reason field is also a PrimeNG dropdown, not a native <select>.
  async inactivatePayer(name: string, reason: string) {
        await this.searchPayer(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /inactivate/i }).click();
        await this.page.locator('text=Inactivation Reason').locator('..').getByRole('combobox').click();
        await this.selectDropdownOption(reason);
        await this.page.getByRole('button', { name: 'Inactivate', exact: true }).click();
  }

  async isInactivateReasonRequired(name: string): Promise<boolean> {
        await this.searchPayer(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /inactivate/i }).click();
        // The confirm button itself stays enabled regardless of the reason field - validation
        // happens on submit attempt (an inline "required" error), not by disabling it upfront.
        await this.page.getByRole('button', { name: 'Inactivate', exact: true }).click();
        return this.page.getByText(/required/i).isVisible();
  }

  async getSummaryCounters() {
        return {
                total: await this.page.getByText(/total payers/i).innerText(),
                active: await this.page.getByText(/^active$/i).first().innerText(),
        };
  }
}
