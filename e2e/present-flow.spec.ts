import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard and return to workspace.
 * Returns the activity ID.
 */
async function createActivityWithGroups(page: import('@playwright/test').Page, activityName: string) {
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
	await page.getByRole('button', { name: /Activity Name/i }).click();
	await page.locator('#activity-name').fill(activityName);
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

test.describe('Present Flow', () => {
	test('can open student view from workspace', async ({ page }) => {
		const activityName = `Present Test ${Date.now()}`;
		await createActivityWithGroups(page, activityName);

		// Verify we're on workspace with groups
		await expect(page.getByText('Not in groups')).toBeVisible();

		// Open present view via Show to Class
		const showToClassButton = page.getByRole('button', { name: 'Show to Class' });
		await expect(showToClassButton).toBeVisible();
		await showToClassButton.click();

		const justPreviewButton = page.getByRole('button', { name: 'Just Preview' });
		if (await justPreviewButton.isVisible().catch(() => false)) {
			await justPreviewButton.click();
		}

		await expect(page).toHaveURL(/\/activities\/[^/]+\/present/);
		await expect(page.getByRole('heading', { name: activityName })).toBeVisible();
	});

	test('student view shows groups correctly', async ({ page }) => {
		const activityName = `Present Groups ${Date.now()}`;
		const activityId = await createActivityWithGroups(page, activityName);

		// Navigate directly to present page
		await page.goto(`/activities/${activityId}/present`);

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
		const activityName = `Present ReadOnly ${Date.now()}`;
		const activityId = await createActivityWithGroups(page, activityName);

		// Navigate to present page
		await page.goto(`/activities/${activityId}/present`);

		// Should NOT have editing controls
		await expect(page.getByRole('button', { name: /^Try Another$/ })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /Undo/ })).not.toBeVisible();
		await expect(page.getByRole('button', { name: /^Start Over$/ })).not.toBeVisible();
	});

	test('present page shows 404 for invalid activity', async ({ page }) => {
		await page.goto('/activities/nonexistent-id-12345/present');

		// Should show error
		await expect(page.getByText(/not found|doesn't exist/i)).toBeVisible();
	});

	test('can navigate from present to workspace via link', async ({ page }) => {
		const activityName = `Present Nav ${Date.now()}`;
		const activityId = await createActivityWithGroups(page, activityName);

		// Navigate to present page
		await page.goto(`/activities/${activityId}/present`);

		// Look for edit/workspace link (if exists in the UI)
		const editLink = page.getByRole('link', { name: /Edit|Workspace|Back/ });

		// If there's an edit link, clicking it should go to workspace
		if (await editLink.isVisible().catch(() => false)) {
			await editLink.click();
			await expect(page).toHaveURL(/\/activities\/[^/]+\/workspace/);
		}
	});
});
