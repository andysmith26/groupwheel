import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity and generate & show groups.
 * Returns the activity ID.
 */
async function createActivityAndGenerateShow(
  page: import('@playwright/test').Page,
  activityName: string
) {
  const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

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
 * Generate & Show groups, record observations, then end session.
 */
async function generateShowAndRecordObservations(
  page: import('@playwright/test').Page,
  activityId: string
) {
  await page.goto(`/activities/${activityId}`);
  await page.getByRole('button', { name: /Generate & Show/i }).click();
  await page.waitForURL(/\/activities\/[^/]+\/live/);

  // Switch to Teacher View
  await page.getByRole('button', { name: 'Teacher View' }).click();

  // Record a couple sentiment taps
  const positiveBtns = page.getByRole('button', { name: /Positive observation/i });
  await positiveBtns.first().click();
  await page.waitForTimeout(500);

  const neutralBtns = page.getByRole('button', { name: /Neutral observation/i });
  if ((await neutralBtns.count()) > 1) {
    await neutralBtns.nth(1).click();
    await page.waitForTimeout(500);
  }

  // End session
  await page.getByRole('button', { name: /Done/i }).click();
  await page.waitForURL(/\/activities\/[^/]+\/workspace/);
}

test.describe('Observation Trends (WP2.2)', () => {
  test('Observation section appears on activity detail after recording observations', async ({
    page
  }) => {
    const activityName = `Trends ${Date.now()}`;
    const activityId = await createActivityAndGenerateShow(page, activityName);

    // Run 3 sessions with observations
    await generateShowAndRecordObservations(page, activityId);
    await generateShowAndRecordObservations(page, activityId);
    await generateShowAndRecordObservations(page, activityId);

    // Navigate to activity detail
    await page.goto(`/activities/${activityId}`);

    // The Observations section should be visible
    await expect(page.getByText('Observations')).toBeVisible({ timeout: 5000 });

    // Should show a positive sentiment percentage
    await expect(page.getByText(/\d+% positive sentiment/)).toBeVisible();
  });

  test('Drill-through shows session observations', async ({ page }) => {
    const activityName = `Drill ${Date.now()}`;
    const activityId = await createActivityAndGenerateShow(page, activityName);

    // Run 3 sessions with observations
    await generateShowAndRecordObservations(page, activityId);
    await generateShowAndRecordObservations(page, activityId);
    await generateShowAndRecordObservations(page, activityId);

    // Navigate to activity detail
    await page.goto(`/activities/${activityId}`);

    // Wait for observations section to load
    await expect(page.getByText('Observations')).toBeVisible({ timeout: 5000 });

    // Click on a session row (the first "obs" label in the trend chart)
    const obsLabels = page.getByText(/\d+ obs/);
    if ((await obsLabels.count()) > 0) {
      // Click the first session row (which contains the obs label)
      await obsLabels.first().click();

      // Should show individual observations inline
      await expect(page.getByText(/Positive|Neutral|Needs work/).first()).toBeVisible({
        timeout: 3000
      });
    }
  });
});
