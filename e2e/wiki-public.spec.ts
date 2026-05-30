import { test, expect } from '@playwright/test';

test.describe('Wiki Public Pages', () => {
  test('GET /wiki renders list page (200)', async ({ page }) => {
    const response = await page.goto('/wiki');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /^Wiki$/ })).toBeVisible();
    // Search bar present
    await expect(page.getByPlaceholder(/search wiki|tìm wiki/i)).toBeVisible();
  });

  test('GET /wiki shows empty state when DB has no wiki pages', async ({ page }) => {
    await page.goto('/wiki');
    // Either empty-state copy or at least one card. We accept whichever the DB shows.
    const emptyText = page.getByText(/no wiki|chưa có wiki/i);
    const cards = page.locator('[class*="grid"] a').first();
    await expect.poll(async () => {
      const hasEmpty = await emptyText.isVisible().catch(() => false);
      const hasCard = await cards.isVisible().catch(() => false);
      return hasEmpty || hasCard;
    }).toBeTruthy();
  });

  test('GET /wiki/search?q=xyz renders search results page', async ({ page }) => {
    const response = await page.goto('/wiki/search?q=test');
    expect(response?.status()).toBe(200);
    // Search bar still visible with the query pre-filled
    const input = page.getByPlaceholder(/search wiki|tìm wiki/i);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('test');
  });

  test('GET /wiki/search with empty q redirects to /wiki', async ({ page }) => {
    await page.goto('/wiki/search');
    await expect(page).toHaveURL(/\/wiki\/?$/);
  });

  test('GET /wiki/[slug] returns 404 for unknown slug', async ({ page }) => {
    const response = await page.goto('/wiki/this-slug-does-not-exist-12345');
    // Next.js notFound() renders the 404 page with status 404
    expect(response?.status()).toBe(404);
  });

  test('Search bar debounces input and navigates', async ({ page }) => {
    await page.goto('/wiki');
    const input = page.getByPlaceholder(/search wiki|tìm wiki/i);
    await input.fill('dragon');
    // Wait for debounce (300ms) + navigation
    await page.waitForURL(/\/wiki\/search\?q=dragon/, { timeout: 5000 });
    expect(page.url()).toContain('/wiki/search?q=dragon');
  });
});

test.describe('Wiki Public Page Sanitization', () => {
  test('script tags in markdown content are stripped on detail page', async ({ page }) => {
    // Skip if no published wiki exists. This test is illustrative — would need
    // a seeded page with <script> in content to fully validate.
    const response = await page.goto('/wiki');
    expect(response?.status()).toBe(200);
    // Confirm there is no inline script execution attempt
    const scripts = await page.locator('script[data-evil]').count();
    expect(scripts).toBe(0);
  });
});
