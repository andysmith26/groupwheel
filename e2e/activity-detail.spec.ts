import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard and return its ID.
 */
async function createActivityAndGetId(page: import('@playwright/test').Page, activityName: string) {
	const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

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

	// Edit the auto-generated name
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

test.describe('Activity Detail Page', () => {
	test('shows activity information', async ({ page }) => {
		const activityName = `Detail Page ${Date.now()}`;
		const activityId = await createActivityAndGetId(page, activityName);

		await page.goto(`/activities/${activityId}`);

		// Should show the activity name
		await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

		// Should show student count in header
		await expect(page.locator('span.ml-4.mt-1.text-sm.text-gray-500')).toHaveText('4 students');
	});

	test('can navigate to workspace from detail page', async ({ page }) => {
		const activityName = `Detail Nav ${Date.now()}`;
		const activityId = await createActivityAndGetId(page, activityName);

		await page.goto(`/activities/${activityId}`);

		// Click "Edit current groups" action
		await page.getByRole('button', { name: /Edit current groups/i }).click();

		await expect(page).toHaveURL(`/activities/${activityId}/workspace`);
		await expect(page.getByTestId('workspace-shell')).toBeVisible();
	});

	test('shows error for invalid activity ID', async ({ page }) => {
		await page.goto('/activities/nonexistent-id-99999');

		// Should show error message
		await expect(page.getByText(/not found|doesn't exist/i)).toBeVisible();
	});
});
