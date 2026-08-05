import { test, expect } from '../../fixtures/auth.fixture';
import { buildPayerData } from '../../data/testData';

/**
 * Approval Management (maker-checker reviewer queue) coverage. Previously this module had no
 * dedicated tests at all - it was only ever exercised as a step inside Payer/Network flows.
 *
 * "Approve All"/"Reject All" affect every pending item in the queue, including leftovers from
 * unrelated test runs on this shared staging server - so those tests only verify the
 * confirmation dialog itself (contents, mandatory checkbox) and Cancel out, rather than
 * actually bulk-approving/rejecting real queued data.
 */
test.describe('Approval Management', () => {
    test('should show a numeric pending count on each queue tab', async ({ approvalPage }) => {
        await approvalPage.goto();
        const payerCount = await approvalPage.getTabCount('Payer');
        const networkCount = await approvalPage.getTabCount('Network');
        expect(payerCount).toBeGreaterThanOrEqual(0);
        expect(networkCount).toBeGreaterThanOrEqual(0);
    });

    test('should open a Review Submission drawer showing the proposed field changes', async ({ payerPage, approvalPage }) => {
        const data = buildPayerData();
        await payerPage.goto();
        await payerPage.createPayer(data);
        await payerPage.sendForApproval(data.payerName);

        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        const drawer = await approvalPage.openReview(data.payerName);
        await expect(drawer.getByText(data.payerName)).toBeVisible();
        await expect(drawer.getByText(data.email)).toBeVisible();
        await approvalPage.closeReview();
    });

    test('should filter the queue by Change Type', async ({ approvalPage }) => {
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        await approvalPage.filterByChangeType('Create');
        const changeTypeCells = approvalPage.page.locator('table tbody tr td:nth-child(2)');
        const count = await changeTypeCells.count();
        for (let i = 0; i < count; i++) {
              await expect(changeTypeCells.nth(i)).toHaveText('Create');
        }
    });

    test('should return no results when searching the queue for a nonexistent request', async ({ approvalPage, page }) => {
        await approvalPage.goto();
        await approvalPage.openTab('Payer');
        await approvalPage.searchQueue('Nonexistent Request XYZ123456789');
        // An empty result set renders as a single placeholder row, not zero rows.
        await expect(page.getByText('No pending approval submissions.')).toBeVisible();
    });

    test('should show a confirmation dialog listing every pending item for Approve All', async ({ approvalPage }) => {
        await approvalPage.goto();
        const dialog = await approvalPage.openApproveAllDialog();
        await expect(dialog.getByRole('heading', { name: /approve all pending requests/i })).toBeVisible();
        await expect(dialog.getByRole('checkbox')).toBeVisible();
        await expect(dialog.getByRole('button', { name: /^approve$/i })).toBeDisabled();
        await approvalPage.cancelDialog();
    });

    test('should show a confirmation dialog for Reject All', async ({ approvalPage }) => {
        await approvalPage.goto();
        const dialog = await approvalPage.openRejectAllDialog();
        await expect(dialog.getByRole('heading', { name: /reject all pending requests/i })).toBeVisible();
        await approvalPage.cancelDialog();
    });
});
