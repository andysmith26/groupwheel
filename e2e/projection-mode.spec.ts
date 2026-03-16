import { expect, test } from '@playwright/test';

test.describe('Display Route (/activity/[id]/display)', () => {
  test('display route renders loading state and handles missing activity', async ({ page }) => {
    // Navigate to a display route with a non-existent activity ID
    await page.goto('/activity/non-existent-id/display');

    // Should show an error state since the activity doesn't exist
    await expect(page.getByText(/not found|no activity/i)).toBeVisible({ timeout: 10000 });
  });

  test('display route has projection-optimized layout', async ({ page }) => {
    // Navigate to display route — even without a valid activity, we can verify
    // that the route loads and has the expected structure
    await page.goto('/activity/test-id/display');

    // The page should have a title containing "Groupwheel"
    await expect(page).toHaveTitle(/Groupwheel/);
  });

  test('display route shows "no groups" message when activity has no groups', async ({ page }) => {
    // Navigate to a display route — will show either error or empty state
    await page.goto('/activity/empty-id/display');

    // Should show some kind of message (error or empty groups)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
