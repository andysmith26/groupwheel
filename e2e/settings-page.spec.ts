import { expect, test } from '@playwright/test';

test.describe('Settings Page', () => {
  test('shows settings heading and data storage section', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data Storage' })).toBeVisible();
    await expect(page.getByText(/stored locally in your browser/)).toBeVisible();
  });
});
