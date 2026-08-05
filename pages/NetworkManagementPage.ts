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

  async cancelAddNetworkWizard() {
        await this.page.getByRole('button', { name: 'Cancel', exact: true }).click();
        // Cancelling with unsaved field values triggers a confirmation dialog first.
        await this.page.getByRole('button', { name: 'Discard Changes' }).click();
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

  /** Opens the Assign Facilities drawer and, if the given facility is in the assignable
   *  pharmacies list, assigns it. Returns whether it was actually assigned - the live
   *  environment's facility pool is small and license-expiry-gated, so a named facility
   *  (e.g. one with an expired license) can legitimately be unavailable at any given time. */
  async assignFacility(facilityLabel: string): Promise<boolean> {
        // The detail page's section switcher renders as plain buttons, not ARIA tabs.
        await this.page.getByRole('button', { name: /assigned facilities/i }).click();
        await this.page.getByRole('button', { name: /assign facilities/i }).click();
        // The "Pharmacies" field is a PrimeNG multiselect - it must be clicked open before its
        // options become visible; the underlying combobox input itself is hidden/unclickable.
        await this.page.getByText('Select pharmacies to assign').click();
        const option = this.page.getByRole('option', { name: new RegExp(facilityLabel) });
        if (!(await option.isVisible().catch(() => false))) {
              await this.page.keyboard.press('Escape');
              await this.page.getByRole('button', { name: /^cancel$/i }).click();
              return false;
        }
        await option.click();
        await this.page.getByRole('button', { name: /^assign$/i }).click();
        return true;
  }

  async hasPayerFieldOnCreate(): Promise<boolean> {
        await this.openAddNetworkWizard();
        const count = await this.page.getByLabel(/^payer$/i).count();
        await this.page.keyboard.press('Escape');
        return count > 0;
  }

  /** Removes a facility from a network's "Assigned Facilities" tab. Assumes that tab is
   *  already open (assignFacility leaves it open, and openNetworkDetail lands on Overview,
   *  so callers navigate to the tab themselves first). */
  async unassignFacility(facilityLabel: string) {
        const row = this.page.getByRole('row', { name: new RegExp(facilityLabel) });
        await row.getByRole('button', { name: /^remove$/i }).click();
        // "Delete facility" is a real dialog, unlike the drawer-based Inactivate panels.
        await this.confirmDialog('Remove');
        await expect(row).not.toBeVisible({ timeout: 10_000 });
  }

  /** Deletes a network from the list and confirms the row is actually gone. */
  async deleteNetwork(name: string) {
        await this.searchNetwork(name);
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /^delete$/i }).click();
        await this.confirmDialog('Yes');
        await expect(this.getRowByName(name)).not.toBeVisible({ timeout: 10_000 });
  }

  async filterByType(type: string) {
        await this.filterByDropdown(/all types/i, type);
  }

  async filterByStatus(status: string) {
        await this.filterByDropdown(/all statuses/i, status);
  }

  async filterByPayer(payerName: string) {
        await this.filterByDropdown(/all payers/i, payerName);
  }

  // Detail-page tabs render as plain buttons, not ARIA tabs.
  async openVersionHistoryTab() {
        await this.page.getByRole('button', { name: /^version history$/i }).click();
  }

  async openAuditHistoryTab() {
        await this.page.getByRole('button', { name: /^audit history$/i }).click();
  }

  async openLinkedPoliciesTab() {
        await this.page.getByRole('button', { name: /linked policies/i }).click();
  }

  async openAssignedFacilitiesTab() {
        await this.page.getByRole('button', { name: /assigned facilities/i }).click();
  }

  async getSummaryCounters() {
        return {
                total: await this.page.getByText(/total networks/i).innerText(),
                active: await this.page.getByText(/^active$/i).first().innerText(),
        };
  }
}
