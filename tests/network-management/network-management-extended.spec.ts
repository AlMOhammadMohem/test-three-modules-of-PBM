import { test, expect } from '../../fixtures/auth.fixture';
import { buildNetworkData } from '../../data/testData';

/**
 * Additional Network Management coverage beyond the core create/send/approve/reject lifecycle
 * already covered in network-management.spec.ts: validation, delete, facility unassignment,
 * detail-page tabs, filters, and search.
 */
test.describe('Network Management - extended', () => {
    test('should block Next when required Basic Info fields are empty', async ({ networkPage, page }) => {
        await networkPage.goto();
        await networkPage.openAddNetworkWizard();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page.getByPlaceholder('DD/MM/YYYY').first()).not.toBeVisible();
        await expect(page.getByText(/required/i).first()).toBeVisible();
    });

    test('should reject an Expiry Date earlier than the Effective Date', async ({ networkPage, page }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.openAddNetworkWizard();
        await networkPage.fillBasicInfo(data);

        // data.effectiveDate is today; expiry one day *before* today is unambiguously invalid.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const invalidExpiry = `${dd}/${mm}/${yesterday.getFullYear()}`;

        const effectiveDateInput = page.getByPlaceholder('DD/MM/YYYY').first();
        const expiryDateInput = page.getByPlaceholder('DD/MM/YYYY').last();
        await effectiveDateInput.click();
        await effectiveDateInput.pressSequentially(data.effectiveDate, { delay: 30 });
        await page.keyboard.press('Tab');
        await expiryDateInput.click();
        await expiryDateInput.pressSequentially(invalidExpiry, { delay: 30 });
        await page.keyboard.press('Tab');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText(/expiry date/i).first()).toBeVisible();
    });

    test('should discard changes when the Add Network wizard is cancelled', async ({ networkPage, page }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.openAddNetworkWizard();
        await page.getByPlaceholder('e.g. National Pharmacy Network').fill(data.networkName);
        await networkPage.cancelAddNetworkWizard();
        await expect(page.getByText('Add New Network')).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Add Network' })).toBeVisible();
    });

    test('should delete a draft network', async ({ networkPage }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.createNetwork(data);
        await networkPage.deleteNetwork(data.networkName);
    });

    test('should return no results when searching for a nonexistent network', async ({ networkPage, page }) => {
        await networkPage.goto();
        await networkPage.searchByText(/search/i, 'Nonexistent Network XYZ123456789');
        await expect(page.locator('tbody tr')).toHaveCount(0);
    });

    test('should filter the list by Network Type', async ({ networkPage, page }) => {
        await networkPage.goto();
        await networkPage.filterByType('HMO');
        const typeCells = page.locator('table tbody tr td:nth-child(4)');
        // Applying the filter re-fetches the list - the table can still show the unfiltered
        // rows for a moment, so poll rather than reading count() immediately.
        await expect(async () => {
              expect(await typeCells.count()).toBeGreaterThan(0);
        }).toPass({ timeout: 10_000 });
        const count = await typeCells.count();
        for (let i = 0; i < count; i++) {
              await expect(typeCells.nth(i)).toHaveText('HMO');
        }
    });

    test('should assign then unassign a facility from a network', async ({ networkPage, page }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.createNetwork(data);
        await networkPage.openNetworkDetail(data.networkName);
        // The live environment's facility pool is small and license-expiry-gated - FCL-000002
        // is only assignable while its license hasn't expired. When it (or every facility) is
        // unavailable, this still exercises the Assign Facilities drawer's empty state.
        const assigned = await networkPage.assignFacility('FCL-000002');
        test.skip(!assigned, 'FCL-000002 is not currently an assignable pharmacy in this environment (license expired or otherwise excluded).');
        await expect(page.getByRole('row', { name: /FCL-000002/ })).toBeVisible();

        await networkPage.unassignFacility('FCL-000002');
        await expect(page.getByText(/no facilities assigned/i)).toBeVisible();
    });

    test('should show Version History and Audit History for a network', async ({ networkPage, page }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.createNetwork(data);
        await networkPage.openNetworkDetail(data.networkName);

        await networkPage.openVersionHistoryTab();
        await expect(page.getByRole('columnheader', { name: 'Version' })).toBeVisible();
        await expect(page.getByText('v1').first()).toBeVisible();

        await networkPage.openAuditHistoryTab();
        await expect(page.getByRole('button', { name: 'Audit History' })).toBeVisible();
    });

    test('should show an empty Linked Policies tab for a new network', async ({ networkPage, page }) => {
        const data = buildNetworkData();
        await networkPage.goto();
        await networkPage.createNetwork(data);
        await networkPage.openNetworkDetail(data.networkName);
        await networkPage.openLinkedPoliciesTab();
        await expect(page.getByRole('button', { name: /linked policies \(0\)/i })).toBeVisible();
    });
});
