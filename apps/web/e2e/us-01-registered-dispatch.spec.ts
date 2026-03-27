import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * US-01 — Staff sends a template dispatch to registered recipients.
 *
 * Prerequisites (seeded by `packages/database/prisma/seed.ts`):
 * - Template `appointment_reminder` with at least one approved translation
 * - At least one recipient with a registered channel
 */
test.describe('US-01 — Registered template dispatch', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'fr');
  });

  test('navigate to New Dispatch', async ({ page }) => {
    await page.getByRole('link', { name: /nouveaux envois/i }).click();
    await expect(page).toHaveURL(/\/dispatches\/new/);
    await expect(page.getByText(/étape|step/i)).toBeVisible();
  });

  test('complete dispatch wizard and land on detail page', async ({ page }) => {
    await page.goto('/fr/dispatches/new');

    /* Step 1 — choose a template */
    const firstTemplate = page
      .getByRole('button')
      .filter({ hasText: /appointment|reminder/i })
      .first();
    await firstTemplate.click();
    await page.getByRole('button', { name: /next/i }).click();

    /* Step 2 — variables (skip if none required) */
    await page.getByRole('button', { name: /next/i }).click();

    /* Step 3 — choose at least one recipient */
    const firstRecipient = page.locator('button').filter({ hasText: /.+/ }).first();
    await firstRecipient.click();
    await page.getByRole('button', { name: /next/i }).click();

    /* Step 4 — review and send */
    await expect(page.getByText(/vérifier|review/i)).toBeVisible();
    await page.getByRole('button', { name: /nouvel envoi|new dispatch/i }).click();

    /* Should land on the dispatch detail page */
    await expect(page).toHaveURL(/\/dispatches\/[a-z0-9-]+$/);
    await expect(page.getByText(/queued|en file/i)).toBeVisible();
  });

  test('dispatch detail shows real-time delivery status', async ({ page }) => {
    await page.goto('/fr/dispatches');

    /* Click the first row in history */
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    await expect(page).toHaveURL(/\/dispatches\/[a-z0-9-]+$/);

    /* Verify the deliveries table is visible */
    await expect(page.locator('table')).toBeVisible();
  });

  test('redirect to login when unauthenticated', async ({ page }) => {
    /* Clear cookies to simulate logged-out state */
    await page.context().clearCookies();
    await page.goto('/fr/dispatches');
    await expect(page).toHaveURL(/\/fr\/login/);
  });
});
