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
        // .fill() dispatches the input event synchronously, but the framework's own change
        // detection that binds it to the search model can lag a tick behind - pressing Enter
        // immediately after fill() can fire the search on the previous (stale/empty) value.
        // Confirming the value actually landed avoids that race.
        await expect(search).toHaveValue(value);
        await this.page.keyboard.press('Enter');
  }

  getRowByName(name: string): Locator {
        return this.page.getByRole('row', { name: new RegExp(name) });
  }

  /**
   * Searches, then keeps retrying if the row doesn't show up - a record created moments
   * earlier by this same test can take a few seconds to become server-side searchable
   * (confirmed by direct inspection: records from prior runs are searchable instantly).
   */
  async searchUntilRowFound(placeholder: RegExp, name: string, timeoutMs = 60_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
              // Re-filling the identical value is a no-op (no input/change event fires), which
              // would silently turn every retry after the first into a dead check against the
              // same stale DOM - clear the field first so each attempt genuinely re-triggers
              // the search.
              const search = this.page.getByPlaceholder(placeholder);
              await search.fill('');
              await this.searchByText(placeholder, name);
              if (await this.getRowByName(name).isVisible().catch(() => false)) {
                    return;
              }
              await this.page.waitForTimeout(2_000);
        }
        throw new Error(`Row for "${name}" never became searchable within ${timeoutMs}ms.`);
  }

  /**
   * Returns the "Approval Status" cell text (e.g. "v0 · Draft", "v1 · Pending",
   * "v4 · Published") - the draft/pending/published workflow state. This is distinct from
   * the row's plain "Status" cell (Active/Inactive), which reflects whether the record is
   * enabled, not where it is in the approval cycle - a freshly created draft record already
   * shows "Active" there, so that column can't be used to detect draft/pending state.
   *
   * The cell's actual textContent has a leading space (e.g. " v0 · Draft "), confirmed by
   * direct inspection - an anchored /^v\d+/ pattern never matches because of it, which looks
   * exactly like a timing issue (element "not found") but isn't one at all.
   */
  async getStatusBadge(name: string): Promise<string> {
        const badge = this.getRowByName(name).locator('td', { hasText: /v\d+\s*·/ });
        await expect(badge).toBeVisible({ timeout: 15_000 });
        return badge.innerText();
  }

  /** Selects an option from a PrimeNG combobox filter (Type/Status/Payer, etc). */
  async filterByDropdown(comboboxName: RegExp, optionText: string) {
        await this.page.getByRole('combobox', { name: comboboxName }).click();
        await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  /** Removes an active filter chip by its visible text (the chip shows the text plus a "remove" button). */
  async clearFilterChip(chipText: string) {
        await this.page
              .locator('div')
              .filter({ has: this.page.getByText(chipText, { exact: true }) })
              .getByRole('button', { name: /remove/i })
              .first()
              .click();
  }

  async goToPage(pageNumber: number) {
        await this.page.getByRole('button', { name: String(pageNumber), exact: true }).click();
  }
}
