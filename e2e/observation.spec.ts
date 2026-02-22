import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity, generate groups, and show to class.
 * Lands on /live with an active session.
 */
async function createActivityAndShowToClass(
  page: import('@playwright/test').Page,
  activityName: string
) {
  const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5
Eve Wilson\teve@example.com\t5
Frank Miller\tfrank@example.com\t5`;

  await page.goto('/activities/new');

  // Handle optional "Start from" step
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

  // Extract activity ID
  const url = page.url();
  const match = url.match(/\/activities\/([^/]+)\/workspace/);
  if (!match) throw new Error('Could not extract activity ID from URL');
  const activityId = match[1];

  // Navigate to activity detail and use Generate & Show
  await page.goto(`/activities/${activityId}`);
  await page.getByRole('button', { name: /Generate & Show/i }).click();
  await page.waitForURL(/\/activities\/[^/]+\/live/);

  return activityId;
}

test.describe('Observation UI (WP2.1)', () => {
  test('Sentiment tap records observation and shows updated count', async ({ page }) => {
    await createActivityAndShowToClass(page, `Obs Count ${Date.now()}`);

    // Switch to Teacher View
    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Find the first group card's "+" button
    const positiveBtn = page.getByRole('button', { name: /Positive observation/i }).first();
    await positiveBtn.click();

    // Should show "+1" in the card header
    await expect(page.locator('text=+1').first()).toBeVisible();

    // Tap "~" on same card
    const neutralBtn = page.getByRole('button', { name: /Neutral observation/i }).first();
    await neutralBtn.click();

    // Should show both counts
    await expect(page.locator('text=~1').first()).toBeVisible();
  });

  test('Note input persists after sentiment tap until dismissed', async ({ page }) => {
    await createActivityAndShowToClass(page, `Obs Persist ${Date.now()}`);

    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Tap "+" on first group
    await page
      .getByRole('button', { name: /Positive observation/i })
      .first()
      .click();

    // Note input should appear
    const noteInput = page.getByPlaceholder('Add a note...');
    await expect(noteInput.first()).toBeVisible();

    // Wait 5 seconds (exceeds old 3-second timeout)
    await page.waitForTimeout(5000);

    // Note input should STILL be visible
    await expect(noteInput.first()).toBeVisible();

    // Dismiss with ✕ button
    await page
      .getByRole('button', { name: /Dismiss note input/i })
      .first()
      .click();

    // Note input should be hidden
    await expect(noteInput.first()).not.toBeVisible();
  });

  test('Tapping sentiment on Group B dismisses note input on Group A', async ({ page }) => {
    await createActivityAndShowToClass(page, `Obs Cross ${Date.now()}`);

    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Tap "+" on first group card
    const positiveBtns = page.getByRole('button', { name: /Positive observation/i });
    await positiveBtns.first().click();

    // Note input should be visible
    const noteInputs = page.getByPlaceholder('Add a note...');
    await expect(noteInputs).toHaveCount(1);

    // Tap "~" on second group card
    const neutralBtns = page.getByRole('button', { name: /Neutral observation/i });
    await neutralBtns.nth(1).click();

    // Still only one note input visible (moved to second group)
    await expect(noteInputs).toHaveCount(1);
  });

  test('Quick Note button opens sheet and saves observation', async ({ page }) => {
    await createActivityAndShowToClass(page, `Quick Note ${Date.now()}`);

    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Click floating Quick Note button
    await page.getByRole('button', { name: /Add a quick note/i }).click();

    // Bottom sheet should appear
    await expect(page.getByRole('dialog', { name: /Quick Note/i })).toBeVisible();

    // Type a note
    await page.getByPlaceholder('Type your note...').fill('Great collaboration today');

    // Click Save
    await page.getByRole('button', { name: /Save Note/i }).click();

    // Sheet should close
    await expect(page.getByRole('dialog', { name: /Quick Note/i })).not.toBeVisible();
  });

  test('Note submission via inline input', async ({ page }) => {
    await createActivityAndShowToClass(page, `Inline Note ${Date.now()}`);

    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Tap "+" on first group
    await page
      .getByRole('button', { name: /Positive observation/i })
      .first()
      .click();

    // Type a note and press Enter
    const noteInput = page.getByPlaceholder('Add a note...').first();
    await noteInput.fill('Needs more structure');
    await noteInput.press('Enter');

    // Note input should dismiss after submission
    await expect(noteInput).not.toBeVisible();
  });
});
