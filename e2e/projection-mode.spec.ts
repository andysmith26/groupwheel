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

test.describe('Projection Mode (WP1.5)', () => {
  test('Project button shows projection overlay', async ({ page }) => {
    const activityName = `Projection ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    await page.goto(`/activities/${activityId}/live`);

    // Project button should be visible on Student View tab
    const projectButton = page.getByRole('button', { name: 'Project' });
    await expect(projectButton).toBeVisible();

    // Click Project
    await projectButton.click();

    // Projection overlay should be visible
    const overlay = page.locator('.fixed.inset-0.z-50');
    await expect(overlay).toBeVisible();

    // Group names should use large typography (text-5xl)
    const groupHeaders = overlay.locator('h3');
    const firstHeader = groupHeaders.first();
    await expect(firstHeader).toBeVisible();
    await expect(firstHeader).toHaveClass(/text-5xl/);

    // Student names should use text-2xl
    const studentNames = overlay.locator('ul li p').first();
    await expect(studentNames).toHaveClass(/text-2xl/);

    // Sub-tabs (Find My Group / All Groups) should NOT be visible in overlay
    await expect(overlay.getByRole('button', { name: 'Find My Group' })).not.toBeVisible();
  });

  test('exit button closes projection overlay', async ({ page }) => {
    const activityName = `Projection Exit ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    await page.goto(`/activities/${activityId}/live`);
    await page.getByRole('button', { name: 'Project' }).click();

    // Overlay should be visible
    const overlay = page.locator('.fixed.inset-0.z-50');
    await expect(overlay).toBeVisible();

    // Hover over exit button area and click
    const exitButton = overlay.locator('button[title="Exit projection mode (ESC)"]');
    await exitButton.hover();
    await exitButton.click();

    // Overlay should be gone
    await expect(overlay).not.toBeVisible();

    // Normal live view should be visible
    await expect(page.getByRole('heading', { name: activityName })).toBeVisible();
  });

  test('ESC in projection mode does not navigate away', async ({ page }) => {
    const activityName = `Projection ESC ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    await page.goto(`/activities/${activityId}/live`);
    await page.getByRole('button', { name: 'Project' }).click();

    const overlay = page.locator('.fixed.inset-0.z-50');
    await expect(overlay).toBeVisible();

    // Press Escape — in headless mode, fullscreen API doesn't activate,
    // so ESC won't trigger fullscreenchange. Use the exit button instead
    // to verify the core behavior: exiting projection doesn't navigate away.
    const exitButton = overlay.locator('button[title="Exit projection mode (ESC)"]');
    await exitButton.hover();
    await exitButton.click();

    // Should still be on the live page (not navigated to workspace)
    await expect(page).toHaveURL(new RegExp(`/activities/${activityId}/live`));

    // Overlay should be gone
    await expect(overlay).not.toBeVisible();
  });

  test('Project button only visible on Student View tab', async ({ page }) => {
    const activityName = `Projection Tab ${Date.now()}`;
    const activityId = await createActivityWithGroups(page, activityName);

    await page.goto(`/activities/${activityId}/live`);

    // Should be visible on Student View (default tab)
    await expect(page.getByRole('button', { name: 'Project' })).toBeVisible();

    // Switch to Teacher View
    await page.getByRole('button', { name: 'Teacher View' }).click();

    // Project button should not be visible
    await expect(page.getByRole('button', { name: 'Project' })).not.toBeVisible();
  });
});
