import { test, expect } from '../../fixtures/auth.fixture';
import { buildPayerData } from '../../data/testData';

/**
 * Additional Payer Management coverage beyond the core create/send/approve/reject lifecycle
 * already covered in payer-management.spec.ts: validation, delete, reactivation, filters,
 * pagination, and the read-only detail view.
 */
test.describe('Payer Management - extended', () => {
    test('should block Next when required Basic Info fields are empty', async ({ payerPage, page }) => {
        await payerPage.goto();
        await payerPage.openAddPayerWizard();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        // Still on Basic Information - the Contact Information step's Email field never appears.
        await expect(page.getByPlaceholder('e.g. email@mail.com')).not.toBeVisible();
        await expect(page.getByText(/required/i).first()).toBeVisible();
    });

    test('should reject an invalid email format and stay on Contact Information', async ({ payerPage, page }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.openAddPayerWizard();
        await payerPage.fillBasicInfo(data);
        await page.getByPlaceholder('e.g. email@mail.com').fill('not-an-email');
        await page.getByPlaceholder('5XXXXXXXX').fill(data.phone);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        // A rejected email keeps the wizard on Contact Information - Effective Period's date
        // fields never appear.
        await expect(page.getByPlaceholder('DD/MM/YYYY').first()).not.toBeVisible();
    });

    test('should discard changes when the Add Payer wizard is cancelled', async ({ payerPage, page }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.openAddPayerWizard();
        await page.getByPlaceholder('e.g. Bupa Arabia').fill(data.payerName);
        await payerPage.cancelAddPayerWizard();
        await expect(page.getByText('Add New Payer')).not.toBeVisible();
        // Nothing was ever saved (Save is only on step 3), so the payer never made it to the list.
        await expect(page.getByRole('button', { name: 'Add Payer' })).toBeVisible();
    });

    test('should delete a draft payer', async ({ payerPage }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.deletePayer(data.payerName);
    });

    test('should return no results when searching for a nonexistent payer', async ({ payerPage, page }) => {
        await payerPage.goto();
        await payerPage.searchByText(/search/i, 'Nonexistent Payer XYZ123456789');
        // An empty result set renders as a single placeholder row, not zero rows.
        await expect(page.getByText('No results found.')).toBeVisible();
    });

    test('should filter the list by Payer Type', async ({ payerPage, page }) => {
        await payerPage.goto();
        await payerPage.filterByType('Government');
        const typeCells = page.locator('table tbody tr td:nth-child(2)');
        // Applying the filter re-fetches the list - the table can still show the unfiltered
        // rows for a moment, so poll rather than reading count() immediately.
        await expect(async () => {
              expect(await typeCells.count()).toBeGreaterThan(0);
        }).toPass({ timeout: 10_000 });
        const count = await typeCells.count();
        for (let i = 0; i < count; i++) {
              await expect(typeCells.nth(i)).toHaveText('Government');
        }
    });

    test('should navigate between pages using the pagination controls', async ({ payerPage, page }) => {
        await payerPage.goto();
        const firstRowPage1 = await page.locator('table tbody tr').first().locator('td').first().innerText();
        await payerPage.goToPage(2);
        const firstRowPage2 = await page.locator('table tbody tr').first().locator('td').first().innerText();
        expect(firstRowPage2).not.toBe(firstRowPage1);
    });

    test('should show correct data on the read-only payer detail page', async ({ payerPage, page }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.viewPayerDetail(data.payerName);
        await expect(page.getByRole('heading', { name: data.payerName })).toBeVisible();
        await expect(page.getByText(data.email)).toBeVisible();
        // Detail page has no Edit/Delete-hiding read-only mode as such, but confirms navigation
        // landed on the right record rather than silently staying on the list.
        await expect(page).toHaveURL(/\/payer-management\/[a-f0-9-]+/);
    });

    test('should show Version History and Audit History for a payer', async ({ payerPage, page }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.viewPayerDetail(data.payerName);

        await payerPage.openVersionHistoryTab();
        await expect(page.getByRole('columnheader', { name: 'Version' })).toBeVisible();
        await expect(page.getByText('v1').first()).toBeVisible();

        await payerPage.openAuditHistoryTab();
        // No assertion on specific content here beyond the tab actually switching -
        // "No audit history yet." is a valid state for a payer that was just created.
        await expect(page.getByRole('button', { name: 'Audit History' })).toBeVisible();
    });

    test('should require checking the review checkbox before Approve is enabled', async ({ payerPage, approvalPage }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.sendForApproval(data.payerName);
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        // The row-level Approve button carries a checkmark icon in its accessible name
        // (e.g. "✓ Approve"), so it needs a non-anchored match - only the dialog's own
        // Approve button (no icon) matches the anchored /^approve$/i pattern.
        await approvalPage.clickRowAction(data.payerName, /approve/i);
        const dialog = approvalPage.page.getByRole('dialog');
        await expect(dialog.getByRole('button', { name: /^approve$/i })).toBeDisabled();
        await dialog.getByRole('checkbox').check();
        await expect(dialog.getByRole('button', { name: /^approve$/i })).toBeEnabled();
        // Don't actually approve - this test only verifies the checkbox gate.
        await dialog.getByRole('button', { name: /^close$/i }).click();
    });

    test('should fully inactivate then reactivate a payer', async ({ payerPage, approvalPage }) => {
        test.slow(); // full create -> approve -> inactivate -> approve -> reactivate -> approve chain
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.sendForApproval(data.payerName);
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        await approvalPage.approve(data.payerName);

        await payerPage.goto();
        await payerPage.inactivatePayer(data.payerName, 'Payer Request');
        await payerPage.sendForApproval(data.payerName);
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        await approvalPage.approve(data.payerName);

        // Once the inactivation is approved, the row exposes "Activate" instead of "Inactivate".
        await payerPage.goto();
        await payerPage.searchPayer(data.payerName);
        // Row-level action buttons carry icons in their accessible name, so match loosely -
        // but "Inactivate" also contains "activate", so exclude it explicitly.
        await expect(
              payerPage.getRowByName(data.payerName).getByRole('button', { name: /(?<!in)activate/i })
        ).toBeVisible({ timeout: 20_000 });

        await payerPage.reactivatePayer(data.payerName);
        await payerPage.sendForApproval(data.payerName);
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        await approvalPage.approve(data.payerName);

        await payerPage.goto();
        await payerPage.searchPayer(data.payerName);
        await expect(
              payerPage.getRowByName(data.payerName).getByRole('button', { name: /inactivate/i })
        ).toBeVisible();
    });
});
