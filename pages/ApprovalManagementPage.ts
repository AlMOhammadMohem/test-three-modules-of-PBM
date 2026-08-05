import { Page, expect } from '@playwright/test';
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
        await this.clickRowAction(name, /approve/i);
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

  /** Opens the "Review Submission" side drawer for a queued request, showing its before/after
   *  field changes. Returns the drawer locator so callers can assert on its contents. */
  async openReview(name: string) {
        const row = this.getRowByName(name);
        await row.getByRole('button', { name: /^review$/i }).click();
        const drawer = this.page.getByRole('complementary').filter({ hasText: 'Review Submission' });
        await expect(drawer).toBeVisible();
        return drawer;
  }

  async closeReview() {
        await this.page.getByRole('button', { name: /^close$/i }).first().click();
  }

  /** Reads the pending count badge from a queue tab, e.g. "Payer 8" -> 8. Tabs with zero items
   *  (like "Policy"/"Formulary" when empty) render with no trailing number at all. */
  async getTabCount(tab: ApprovalTab): Promise<number> {
        const label = await this.page.getByRole('tab', { name: new RegExp(`^${tab}`, 'i') }).innerText();
        const match = label.match(/(\d+)/);
        return match ? Number(match[1]) : 0;
  }

  /** Opens the "Approve all pending requests" confirmation dialog without confirming it - the
   *  bulk action affects every pending item in the queue (including ones from other test runs),
   *  so tests only verify the dialog itself, then Cancel out. */
  async openApproveAllDialog() {
        await this.page.getByRole('button', { name: /^approve all$/i }).click();
        const dialog = this.page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        return dialog;
  }

  async openRejectAllDialog() {
        await this.page.getByRole('button', { name: /^reject all$/i }).click();
        const dialog = this.page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        return dialog;
  }

  async cancelDialog() {
        await this.page.getByRole('dialog').getByRole('button', { name: /^cancel$/i }).click();
  }

  /** "All Change Types" is a PrimeNG multiselect whose combobox has no accessible name at all
   *  (unlike Payer/Network's Type/Status filters) - it must be opened via its visible label
   *  text instead, and options are checkboxes rather than single-select entries. */
  async filterByChangeType(changeType: string) {
        await this.page.getByText('All Change Types', { exact: true }).click();
        await this.page.getByRole('option', { name: changeType, exact: true }).click();
        await this.page.keyboard.press('Escape');
  }

  async searchQueue(name: string) {
        await this.searchByText(/search/i, name);
  }

  /** Finds a queued request's row by name, searching the queue to bring it onto the current
   *  page/scroll position first - a record just sent for approval isn't guaranteed to be on
   *  whatever page happens to be showing (same pagination issue as the Payer/Network lists),
   *  and can also lag behind the queue's own server-side index for a few seconds. */
  async findQueueRow(name: string) {
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
              await this.searchQueue(name);
              const row = this.getRowByName(name);
              if (await row.isVisible().catch(() => false)) {
                    return row;
              }
              await this.page.waitForTimeout(2_000);
        }
        throw new Error(`Queue row for "${name}" never became searchable within 45000ms.`);
  }

  /** Clicks an action button (Approve/Reject/Review) on a queued row. A newly created record
   *  reliably appears on the queue's default (unfiltered, newest-first) page, so this looks
   *  the row up directly and only falls back to a search if it isn't on the current page (e.g.
   *  the queue has grown past one page since the record was created). */
  async clickRowAction(name: string, buttonName: RegExp) {
        let row = this.getRowByName(name);
        if (!(await row.isVisible().catch(() => false))) {
              row = await this.findQueueRow(name);
        }
        await row.getByRole('button', { name: buttonName }).click();
  }
}
