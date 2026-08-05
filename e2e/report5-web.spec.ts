/**
 * Report5 system-test cases for FE-17 Web Auth, FE-18 Manage Account and
 * FE-23 Manage Report. Each test name carries its report case ID so one run
 * line maps to exactly one reported case.
 *
 * Scope note: these are the cases that run without a database. Flows that need
 * seeded accounts, mail delivery or Google OAuth are reported N/A with their
 * blocking prerequisite instead of being asserted here.
 */
import { test, expect, Page } from '@playwright/test';

/** Fills the register form and submits it. */
async function submitRegister(
  page: Page,
  values: { displayName: string; email: string; password: string; confirm: string },
) {
  await page.goto('/auth/register');
  const texts = page.locator('form input[type="text"]');
  await texts.nth(0).fill(values.displayName);
  await page.locator('form input[type="email"]').fill(values.email);
  const passwords = page.locator('form input[type="password"]');
  await passwords.nth(0).fill(values.password);
  await passwords.nth(1).fill(values.confirm);
  await page.getByRole('button', { name: /^sign up$/i }).click();
}

test.describe('Web Auth — Register Account', () => {
  test('TC_RA_01 - rejects a two-character display name', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'Ab',
      email: 'player@example.com',
      password: 'Valid1!a',
      confirm: 'Valid1!a',
    });
    await expect(page.getByText('Display name must be at least 3 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('TC_RA_02 - rejects a display name longer than twenty characters', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'a'.repeat(21),
      email: 'player@example.com',
      password: 'Valid1!a',
      confirm: 'Valid1!a',
    });
    await expect(page.getByText('Display name must not exceed 20 characters')).toBeVisible();
  });

  test('TC_RA_03 - rejects a display name containing an unsupported character', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'Player!',
      email: 'player@example.com',
      password: 'Valid1!a',
      confirm: 'Valid1!a',
    });
    await expect(
      page.getByText('Only letters, numbers, spaces, underscores, and hyphens allowed'),
    ).toBeVisible();
  });

  test('TC_RA_04 - rejects a seven-character password', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'BorrowedPlayer',
      email: 'player@example.com',
      password: 'Valid1!',
      confirm: 'Valid1!',
    });
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('TC_RA_05 - rejects a password with no special character', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'BorrowedPlayer',
      email: 'player@example.com',
      password: 'Valid1aa',
      confirm: 'Valid1aa',
    });
    await expect(
      page.getByText('Password must contain uppercase, lowercase, number and special character'),
    ).toBeVisible();
  });

  test('TC_RA_06 - rejects mismatched password confirmation', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'BorrowedPlayer',
      email: 'player@example.com',
      password: 'Valid1!a',
      confirm: 'Other1!a',
    });
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('TC_RA_07 - blocks submission of a malformed email address', async ({ page }) => {
    await submitRegister(page, {
      displayName: 'BorrowedPlayer',
      email: 'invalid-email',
      password: 'Valid1!a',
      confirm: 'Valid1!a',
    });
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

test.describe('Web Auth — Log In', () => {
  test('TC_LI_01 - shows the login form to a guest', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^log in$/i })).toBeVisible();
  });

  test('TC_LI_02 - blocks submission of a malformed email address', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[autocomplete="email"]').fill('invalid-email');
    await page.locator('input[autocomplete="current-password"]').fill('Admin@1234');
    await page.getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC_LI_03 - rejects an empty password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[autocomplete="email"]').fill('admin@borrowed-shapes.local');
    await page.getByRole('button', { name: /^log in$/i }).click();
    await expect(page.getByText('Password is required')).toBeVisible();
  });
});

test.describe('Web Auth — Log In With Google', () => {
  test('TC_LIWG_01 - offers Google sign-in on the login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /continue with google/i })).toBeVisible();
  });

  test('TC_LIWG_02 - offers Google sign-in on the register page', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByRole('link', { name: /continue with google/i })).toBeVisible();
  });
});

test.describe('Web Auth — Forgot Password', () => {
  test('TC_FP_01 - reaches the recovery page from the login page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
  });

  test('TC_FP_02 - rejects a malformed recovery email address', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.locator('form input').first().fill('invalid-email');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('TC_FP_03 - rejects an empty recovery email address', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.getByRole('button', { name: /send otp/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByRole('button', { name: /send otp/i })).toBeVisible();
  });
});

test.describe('Web Auth — Change Password', () => {
  test('TC_CP_01 - redirects a guest away from the change-password page', async ({ page }) => {
    await page.goto('/auth/change-password');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Web Auth — Log Out', () => {
  test('TC_LO_01 - does not accept logout without a session', async ({ page }) => {
    const response = await page.request.delete('/api/auth/logout', { failOnStatusCode: false });
    expect(response.ok()).toBeFalsy();
  });
});

test.describe('Manage Account — guest access', () => {
  test('TC_VAL_01 - redirects a guest away from the account list', async ({ page }) => {
    await page.goto('/dashboard/accounts');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC_VSAL_01 - redirects a guest away from the system audit log', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Manage Report — guest access', () => {
  test('TC_VRL_01 - redirects a guest away from the report list', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('TC_VRD_01 - redirects a guest away from report details', async ({ page }) => {
    await page.goto('/dashboard/reports/any-report');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
