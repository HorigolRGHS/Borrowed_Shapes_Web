import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@borrowed-shapes.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login');
  // Login form labels are not associated to inputs; target by autocomplete attribute
  await page.locator('input[autocomplete="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login|đăng nhập/i }).click();
  // Wait for either a redirect away from login or a 401-style toast
  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10_000 }),
    page.waitForTimeout(8_000),
  ]);
}

test.describe('Wiki Admin — Auth gate', () => {
  test('guest visiting /dashboard/wiki is redirected to login', async ({ page }) => {
    await page.goto('/dashboard/wiki');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test('guest visiting /dashboard/wiki/new is redirected to login', async ({ page }) => {
    await page.goto('/dashboard/wiki/new');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });
});

test.describe('Wiki Admin — Logged in flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // If login failed because no admin exists in DB, skip the rest
    const url = page.url();
    test.skip(
      url.includes('/auth/login'),
      `Admin user ${ADMIN_EMAIL} not seeded; skipping admin tests. Set E2E_ADMIN_EMAIL/PASSWORD env or seed via API.`,
    );
  });

  test('admin list page renders with Create button', async ({ page }) => {
    await page.goto('/dashboard/wiki');
    await expect(page.getByRole('heading', { name: /admin · wiki/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /create wiki|tạo wiki/i })).toBeVisible();
  });

  test('admin list filter buttons are clickable', async ({ page }) => {
    await page.goto('/dashboard/wiki');
    const allBtn = page.getByRole('button', { name: /^all$/i });
    const draftBtn = page.getByRole('button', { name: /draft|bản nháp/i });
    await expect(allBtn).toBeVisible();
    await expect(draftBtn).toBeVisible();
    await draftBtn.click();
    await expect(page).toHaveURL(/filter=draft/);
  });

  test('create form: slug auto-fills from title', async ({ page }) => {
    await page.goto('/dashboard/wiki/new');
    // Form input order: 0=title_en, 1=title_vi, 2=slug_en, 3=slug_vi, 4=summary_en (textarea), 5=summary_vi (textarea)
    const inputs = page.locator('main input[type="text"]');
    await inputs.nth(0).fill('Dragon Knight Test');
    // wait for debounced auto-slug
    await page.waitForTimeout(600);
    await expect(inputs.nth(2)).toHaveValue('dragon-knight-test');
  });

  test('create form: slug auto-strips Vietnamese diacritics', async ({ page }) => {
    await page.goto('/dashboard/wiki/new');
    const inputs = page.locator('main input[type="text"]');
    await inputs.nth(1).fill('Hiệp sĩ rồng');
    await page.waitForTimeout(600);
    await expect(inputs.nth(3)).toHaveValue('hiep-si-rong');
  });

  test('create form: reserved slug shows error', async ({ page }) => {
    await page.goto('/dashboard/wiki/new');
    const inputs = page.locator('main input[type="text"]');
    await inputs.nth(2).fill('admin');
    await expect(page.getByText(/reserved|dành riêng/i)).toBeVisible({ timeout: 3000 });
  });

  test('create form: invalid slug shows error', async ({ page }) => {
    await page.goto('/dashboard/wiki/new');
    const inputs = page.locator('main input[type="text"]');
    await inputs.nth(2).fill('Invalid Slug!');
    await expect(page.getByText(/lowercase|chữ thường/i).first()).toBeVisible({ timeout: 3000 });
  });
});
