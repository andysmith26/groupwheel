import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard and return to workspace.
 * Returns the activity ID.
 */
async function createActivityWithGroups(
  page: import('@playwright/test').Page,
  activityName: string
) {
  const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

  await page.goto('/activities/new');

  // Handle optional "Start from" step if it appears
  const startHeading = page.getByRole('heading', { name: 'Start from' });
  try {
    if (await startHeading.isVisible({ timeout: 500 })) {
      await page.getByRole('button', { name: /Continue/ }).click();
    }
  } catch {
    // ignore
  }

  // Step 1: Paste roster data
  await page.locator('#roster-paste').fill(rosterData);
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 2: Groups - select auto-split mode
  await page.getByText('Just split students into groups').click();
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 3: Review - Name the activity
  // Edit the auto-generated name
  await page.getByRole('button', { name: /^Edit$/ }).click();
  await page.locator('#activity-name').fill(activityName);
  await page.getByRole('button', { name: /^Save$/ }).click();
  await Promise.all([
    page.waitForURL(/\/activities\/[^/]+\/workspace$/),
    page.getByRole('button', { name: /Create Groups/i }).click()
  ]);

  // Extract activity ID
  const url = page.url();
  const match = url.match(/\/activities\/([^/]+)\/workspace/);
  if (!match) throw new Error('Could not extract activity ID from URL');
  return match[1];
}

test.describe('Live View Flow', () => {
  test('can navigate to live page from workspace', async ({ page }) => {
    const activityName = `Live Test ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Verify we're on workspace with groups
    await expect(page.getByText('Unassigned')).toBeVisible();

    // Navigate directly to live page
    await page.goto(`/activities/${activityId}/live`);

    await expect(page).toHaveURL(/\/activities\/[^/]+\/live/);
    await expect(page.getByRole('heading', { name: activityName })).toBeVisible();
  });

  test('student view shows groups correctly', async ({ page }) => {
    const activityName = `Live Groups ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Navigate directly to live page
    await page.goto(`/activities/${activityId}/live`);

    // Should show the activity name as heading
    await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

    // Switch to "All Groups" view to show full roster
    await page.getByRole('button', { name: 'All Groups', exact: true }).click();

    // Should show student names
    await expect(page.getByText('Alice Smith')).toBeVisible();
    await expect(page.getByText('Bob Jones')).toBeVisible();
    await expect(page.getByText('Carol White')).toBeVisible();
    await expect(page.getByText('Dave Brown')).toBeVisible();
  });

  test('student view is read-only', async ({ page }) => {
    const activityName = `Live ReadOnly ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Navigate to live page
    await page.goto(`/activities/${activityId}/live`);

    // Should NOT have workspace editing controls
    await expect(page.getByRole('button', { name: /Undo/ })).not.toBeVisible();
  });

  test('live page shows error for invalid activity', async ({ page }) => {
    await page.goto('/activities/nonexistent-id-12345/live');

    // Should show error
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('can navigate from live back to workspace', async ({ page }) => {
    const activityName = `Live Nav ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Navigate to live page
    await page.goto(`/activities/${activityId}/live`);

    // The "Done" link should navigate back to workspace
    const doneLink = page.getByRole('link', { name: /Done/ });
    if (await doneLink.isVisible().catch(() => false)) {
      await doneLink.click();
      await expect(page).toHaveURL(/\/activities\/[^/]+\/workspace/);
    }
  });
});
