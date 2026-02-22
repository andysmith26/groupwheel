import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity, generate groups, and show to class.
 */
async function createActivityAndShowToClass(
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
  const activityId = match[1];

  await page.goto(`/activities/${activityId}`);
  await page.getByRole('button', { name: /Generate & Show/i }).click();
  await page.waitForURL(/\/activities\/[^/]+\/live/);

  return activityId;
}

test.describe('Session Timer (WP2.3)', () => {
  test('Timer starts from preset and counts down', async ({ page }) => {
    await createActivityAndShowToClass(page, `Timer Start ${Date.now()}`);

    // Timer should be visible (collapsed initially)
    const timerBtn = page.getByText('Timer');
    await expect(timerBtn).toBeVisible();

    // Expand timer
    await timerBtn.click();

    // Click "5" preset
    await page.getByRole('button', { name: '5', exact: true }).click();

    // Should show countdown near 5:00
    await expect(page.getByText(/[45]:5[0-9]/)).toBeVisible({ timeout: 2000 });

    // Wait 2 seconds and verify it's counting down
    await page.waitForTimeout(2500);
    await expect(page.getByText(/4:5[0-9]|4:5[0-7]/)).toBeVisible();
  });

  test('Timer pause and resume', async ({ page }) => {
    await createActivityAndShowToClass(page, `Timer Pause ${Date.now()}`);

    await page.getByText('Timer').click();
    await page.getByRole('button', { name: '5', exact: true }).click();

    // Wait a moment for timer to start
    await page.waitForTimeout(1500);

    // Pause
    await page.getByRole('button', { name: /Pause/i }).click();
    await expect(page.getByText('(paused)')).toBeVisible();

    // Record time, wait, verify it hasn't changed
    const timerText = await page.locator('p.text-4xl').textContent();
    await page.waitForTimeout(3000);
    const timerTextAfter = await page.locator('p.text-4xl').textContent();
    expect(timerText).toBe(timerTextAfter);

    // Resume
    await page.getByRole('button', { name: /Resume/i }).click();
    await page.waitForTimeout(2000);

    // Time should have decreased
    const timerTextResumed = await page.locator('p.text-4xl').textContent();
    expect(timerTextResumed).not.toBe(timerText);
  });

  test('Timer stop resets to presets', async ({ page }) => {
    await createActivityAndShowToClass(page, `Timer Stop ${Date.now()}`);

    await page.getByText('Timer').click();
    await page.getByRole('button', { name: '10', exact: true }).click();

    // Timer should be running
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();

    // Stop
    await page.getByRole('button', { name: /Stop/i }).click();

    // Should show presets again (expand timer first since it collapsed)
    await page.getByText('Timer').click();
    await expect(page.getByRole('button', { name: '5', exact: true })).toBeVisible();
  });

  test('Timer persists across tab switches', async ({ page }) => {
    await createActivityAndShowToClass(page, `Timer Tab ${Date.now()}`);

    await page.getByText('Timer').click();
    await page.getByRole('button', { name: '5', exact: true }).click();

    // Timer should be counting
    await page.waitForTimeout(1000);

    // Switch to Teacher View
    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Timer should still be visible and running (it's outside the tab content)
    await expect(page.locator('p.text-4xl')).toBeVisible();

    // Switch back to Student View
    await page.getByRole('button', { name: 'Student View' }).click();

    // Timer still visible
    await expect(page.locator('p.text-4xl')).toBeVisible();
  });

  test('Timer not visible without active session', async ({ page }) => {
    const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5`;

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
    await page.locator('#activity-name').fill(`No Timer ${Date.now()}`);
    await page.getByRole('button', { name: /^Save$/ }).click();
    await Promise.all([
      page.waitForURL(/\/activities\/[^/]+\/workspace$/),
      page.getByRole('button', { name: /Create Groups/i }).click()
    ]);

    const url = page.url();
    const match = url.match(/\/activities\/([^/]+)\/workspace/);
    if (!match) throw new Error('Could not extract activity ID from URL');

    // Navigate to live WITHOUT using Generate & Show (no active session)
    await page.goto(`/activities/${match[1]}/live`);

    // Timer should NOT be visible (no active session)
    await expect(page.getByText('Timer')).not.toBeVisible({ timeout: 3000 });
  });
});
