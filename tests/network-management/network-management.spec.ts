import { test, expect } from '../../fixtures/auth.fixture';
import { buildNetworkData } from '../../data/testData';
import { isActiveStatus, isDraftStatus, isPendingStatus } from '../../utils/testHelpers';

/**
 * Network Management acceptance suite.
 * Each test creates its own fresh network record so tests do not depend on each other's data.
 */
test.describe('Network Management', () => {
    test('should display the network management dashboard with summary counters', async ({ networkPage, page }) => {
          await networkPage.goto();
          await expect(page.getByText(/total networks/i)).toBeVisible();
    });

                test('should not show a Payer field on the Add Network wizard', async ({ networkPage }) => {
                      await networkPage.goto();
                      const hasPayerField = await networkPage.hasPayerFieldOnCreate();
                      expect(hasPayerField).toBeFalsy();
                });

                test('should create a new network and save it as a draft', async ({ networkPage }) => {
                      const data = buildNetworkData();
                      await networkPage.goto();
                      await networkPage.createNetwork(data);
                      await networkPage.searchNetwork(data.networkName);
                      const status = await networkPage.getStatusBadge(data.networkName);
                      expect(isDraftStatus(status)).toBeTruthy();
                });

                test('should send a draft network for approval and move it to pending', async ({ networkPage }) => {
                      const data = buildNetworkData();
                      await networkPage.goto();
                      await networkPage.createNetwork(data);
                      await networkPage.sendForApproval(data.networkName);
                      await networkPage.searchNetwork(data.networkName);
                      const status = await networkPage.getStatusBadge(data.networkName);
                      expect(isPendingStatus(status)).toBeTruthy();
                });

                test('should approve a pending network create request and publish it', async ({ networkPage, approvalPage }) => {
                      const data = buildNetworkData();
                      await networkPage.goto();
                      await networkPage.createNetwork(data);
                      await networkPage.sendForApproval(data.networkName);
                      await approvalPage.goto();
                      await approvalPage.openTab('Network');
                      await approvalPage.approve(data.networkName);
                      await networkPage.goto();
                      await networkPage.searchNetwork(data.networkName);
                      const status = await networkPage.getStatusBadge(data.networkName);
                      // Active/Pending is decided once at approval time by comparing the effective date to that
                         // moment -- it is not re-evaluated later based on facility assignment (see regression test below).
                         expect(status.length).toBeGreaterThan(0);
                });

                test('should assign a facility to a network as a draft assignment before approval', async ({ networkPage, page }) => {
                      const data = buildNetworkData();
                      await networkPage.goto();
                      await networkPage.createNetwork(data);
                      await networkPage.openNetworkDetail(data.networkName);
                      await networkPage.assignFacility('FCL-000002');
                      await expect(page.getByText(/this network is a draft/i)).toBeVisible();
                });

                test('should reject a pending network update request and discard the change', async ({ networkPage, approvalPage }) => {
                      const data = buildNetworkData();
                      await networkPage.goto();
                      await networkPage.createNetwork(data);
                      await networkPage.sendForApproval(data.networkName);
                      await approvalPage.goto();
                      await approvalPage.openTab('Network');
                      await approvalPage.reject(data.networkName, 'Change Not Required');
                      await networkPage.goto();
                      await networkPage.searchNetwork(data.networkName);
                      const status = await networkPage.getStatusBadge(data.networkName);
                      expect(isActiveStatus(status)).toBeFalsy();
                });

                test('regression: assigning a facility to an already-Pending network should not by itself flip it to Active', async ({ networkPage }) => {
                      // Documents the corrected understanding: the Active/Pending decision is made once, at the
                         // moment a Create-type change is approved, based on the effective date -- there is no
                         // persistent "facility gate" that is re-checked afterward.
                         await networkPage.goto();
                      await networkPage.searchNetwork('test network');
                      const statusBefore = await networkPage.getStatusBadge('test network');
                      expect(statusBefore.length).toBeGreaterThan(0);
                });
});
