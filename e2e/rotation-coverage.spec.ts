import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard and return its ID.
 */
async function createActivityWithGroups(
  page: import('@playwright/test').Page,
  activityName: string
) {
  const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5
Eve Davis\teve@example.com\t5
Frank Miller\tfrank@example.com\t5`;

  await page.goto('/activities/new');

  const startHeading = page.getByRole('heading', { name: 'Start from' });
  try {
    if (await startHeading.isVisible({ timeout: 500 })) {
      await page.getByRole('button', { name: /Continue/ }).click();
    }
  } catch {
    // ignore
  }

  await page.locator('#roster-paste').fill(rosterData);
  await page.getByRole('button', { name: /Continue/ }).click();

  await page.getByText('Just split students into groups').click();
  await page.getByRole('button', { name: /Continue/ }).click();

  await page.getByRole('button', { name: /^Edit$/ }).click();
  await page.locator('#activity-name').fill(activityName);
  await page.getByRole('button', { name: /^Save$/ }).click();
  await Promise.all([
    page.waitForURL(/\/activities\/[^/]+\/workspace$/),
    page.getByRole('button', { name: /Create Groups/i }).click()
  ]);

  const url = page.url();
  const match = url.match(/\/activities\/([^/]+)\/workspace/);
  if (!match) throw new Error('Could not extract activity ID from URL');
  return match[1];
}

/**
 * Generate groups and show to class from the activity detail page,
 * then press Done to archive the session.
 */
async function generateShowAndDone(page: import('@playwright/test').Page, activityId: string) {
  await page.goto(`/activities/${activityId}`);

  // Click "Generate & Show"
  await page.getByRole('button', { name: /Generate & Show/i }).click();

  // Wait for live page
  await page.waitForURL(new RegExp(`/activities/${activityId}/live`), { timeout: 10000 });

  // Click Done to archive session and return to workspace
  await page.getByRole('button', { name: /Done/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 10000 });
}

test.describe('Rotation Coverage (WP1.4)', () => {
  test('rotation coverage section appears after 2+ sessions', async ({ page }) => {
    const activityName = `Rotation ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Generate & show twice to create 2 published sessions
    await generateShowAndDone(page, activityId);
    await generateShowAndDone(page, activityId);

    // Navigate to activity detail
    await page.goto(`/activities/${activityId}`);

    // Rotation Coverage section should be visible
    const rotationButton = page.getByRole('button', { name: /Rotation Coverage/i });
    await expect(rotationButton).toBeVisible();

    // Expand the section
    await rotationButton.click();

    // Should show a coverage percentage
    await expect(page.getByText(/possible pairings/i)).toBeVisible();
  });

  test('rotation coverage section hidden with < 2 sessions', async ({ page }) => {
    const activityName = `Rotation Single ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    // Generate & show only once
    await generateShowAndDone(page, activityId);

    // Navigate to activity detail
    await page.goto(`/activities/${activityId}`);

    // Rotation Coverage section should NOT be visible
    const rotationButton = page.getByRole('button', { name: /Rotation Coverage/i });
    await expect(rotationButton).not.toBeVisible();
  });
});
