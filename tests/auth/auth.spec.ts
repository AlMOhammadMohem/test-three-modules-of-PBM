import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { CREDENTIALS } from '../../data/testData';

/**
 * Authentication edge cases. Deliberately does NOT use the auto-login fixture from
 * fixtures/auth.fixture.ts - these tests need to control the login flow themselves
 * (an invalid attempt, and a real login followed by logout).
 */
test.describe('Authentication', () => {
    test('should show an error and stay on the login page for invalid credentials', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('wrong@example.com', 'WrongPassword123');
        await loginPage.expectLoginError();
        expect(page.url()).toContain('/login');
    });

    test('should log out and return to the login page', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
        await loginPage.isLoggedIn();
        await loginPage.logout();
        expect(page.url()).toContain('/login');
    });
});
