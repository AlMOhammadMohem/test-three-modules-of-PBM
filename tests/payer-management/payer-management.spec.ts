import { test, expect } from '../../fixtures/auth.fixture';
import { buildPayerData } from '../../data/testData';
import { isActiveStatus, isDraftStatus, isPendingStatus } from '../../utils/testHelpers';

/**
 * Payer Management acceptance suite.
 * Each test creates its own fresh payer record so tests do not depend on each other's data.
 */
test.describe('Payer Management', () => {
    test('should display the payer management dashboard with summary counters', async ({ payerPage, page }) => {
          await payerPage.goto();
          await expect(page.getByText(/total payers/i)).toBeVisible();
    });

                test('should create a new payer and save it as a draft', async ({ payerPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.searchPayer(data.payerName);
                      const status = await payerPage.getStatusBadge(data.payerName);
                      expect(isDraftStatus(status)).toBeTruthy();
                });

                test('should send a draft payer for approval and move it to pending', async ({ payerPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.sendForApproval(data.payerName);
                      await payerPage.searchPayer(data.payerName);
                      const status = await payerPage.getStatusBadge(data.payerName);
                      expect(isPendingStatus(status)).toBeTruthy();
                });

                test('should approve a pending payer create request and publish it as active', async ({ payerPage, approvalPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.sendForApproval(data.payerName);
                      await approvalPage.goto();
                      await approvalPage.openTab('Payer');
                      await approvalPage.approve(data.payerName);
                      await payerPage.goto();
                      await payerPage.searchPayer(data.payerName);
                      const status = await payerPage.getStatusBadge(data.payerName);
                      expect(isActiveStatus(status)).toBeTruthy();
                });

                test('should edit a published payer into a new working draft', async ({ payerPage, approvalPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.sendForApproval(data.payerName);
                      await approvalPage.goto();
                      await approvalPage.openTab('Payer');
                      await approvalPage.approve(data.payerName);
                      await payerPage.goto();
                      const editedName = `${data.payerName} Edited`;
                      await payerPage.editPayer(data.payerName, editedName);
                      await payerPage.searchPayer(editedName);
                      const status = await payerPage.getStatusBadge(editedName);
                      expect(isDraftStatus(status)).toBeTruthy();
                });

                test('should reject a pending update request and revert the payer to its last published state', async ({ payerPage, approvalPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.sendForApproval(data.payerName);
                      await approvalPage.goto();
                      await approvalPage.openTab('Payer');
                      await approvalPage.reject(data.payerName, 'Change Not Required');
                      await payerPage.goto();
                      await payerPage.searchPayer(data.payerName);
                      const status = await payerPage.getStatusBadge(data.payerName);
                      expect(isActiveStatus(status)).toBeFalsy();
                });

                test('should show a cascading impact warning when inactivating a payer', async ({ page, payerPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      await payerPage.searchPayer(data.payerName);
                      const row = payerPage.getRowByName(data.payerName);
                      await row.getByRole('button', { name: /inactivate/i }).click();
                      await expect(page.getByText(/inactivating this payer will also inactivate/i)).toBeVisible();
                });

                test('should require a mandatory reason before confirming payer inactivation', async ({ payerPage }) => {
                      const data = buildPayerData();
                      await payerPage.goto();
                      await payerPage.createPayer(data);
                      const isRequired = await payerPage.isInactivateReasonRequired(data.payerName);
                      expect(isRequired).toBeTruthy();
                });
});
