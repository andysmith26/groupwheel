import { expect, test } from '@playwright/test';

test.describe('Help Page', () => {
  test('shows help content', async ({ page }) => {
    await page.goto('/help');

    await expect(page.getByRole('heading', { name: /How to use Groupwheel/i })).toBeVisible();
  });
});
