import type { Page } from '@playwright/test';

/** Credentials of the seeded staff user (matches `packages/database/prisma/seed.ts`). */
const TEST_USER = {
  email: 'admin@i18n-chat.local',
  password: 'password',
} as const;

/**
 * Performs a full login via the UI and waits for the redirect to the dispatches page.
 * Call this at the start of any test that requires authentication.
 */
export async function login(page: Page, locale = 'fr'): Promise<void> {
  await page.goto(`/${locale}/login`);
  await page.getByLabel(/adresse e-mail|email/i).fill(TEST_USER.email);
  await page.getByLabel(/mot de passe|password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /se connecter|sign in|inloggen/i }).click();
  await page.waitForURL(`**/${locale}/dispatches`);
}
