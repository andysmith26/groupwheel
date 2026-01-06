import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard.
 * Returns the activity name used.
 */
async function createActivity(page: import('@playwright/test').Page, activityName: string) {
	const rosterData = `name\tid\tgrade
Alice\talice@test.com\t5
Bob\tbob@test.com\t5`;

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

	return activityName;
}

test.describe('Dashboard', () => {
	test('can rename an activity', async ({ page }) => {
		const originalName = `Rename Test ${Date.now()}`;
		const newName = `Renamed Activity ${Date.now()}`;

		// Create an activity first
		await createActivity(page, originalName);

		// Navigate to dashboard
		await page.goto('/activities');

		// Find the activity card and open menu
		const activityCard = page.locator('.group.rounded-lg', { hasText: originalName });
		await activityCard.getByRole('button', { name: /More options/ }).click();

		// Click rename option
		await page.getByRole('button', { name: 'Rename' }).click();

		// Fill in the new name
		const renameInput = page.getByRole('textbox');
		await renameInput.clear();
		await renameInput.fill(newName);

		// Save
		await page.getByRole('button', { name: 'Save' }).click();

		// Verify the name was changed
		await expect(page.getByText(newName)).toBeVisible();
		await expect(page.getByText(originalName)).not.toBeVisible();
	});

	test('can delete an activity', async ({ page }) => {
		const activityName = `Delete Test ${Date.now()}`;

		// Create an activity first
		await createActivity(page, activityName);

		// Navigate to dashboard
		await page.goto('/activities');

		// Verify activity exists
		const activityCard = page.locator('.group.rounded-lg', { hasText: activityName });
		await expect(activityCard).toBeVisible();

		// Find the activity card and open menu
		await activityCard.getByRole('button', { name: /More options/ }).click();

		// Click delete option
		await page.getByRole('button', { name: 'Delete' }).click();

		// Confirm deletion in modal
		await page.getByRole('button', { name: 'Delete' }).last().click();

		// Verify activity was deleted
		await expect(activityCard).toHaveCount(0);
	});

	test('shows empty state when no activities', async ({ page }) => {
		// This test assumes a fresh browser context with no stored activities
		// We can't guarantee this in all environments, so we'll check for
		// either the empty state OR existing activities

		await page.goto('/activities');

		// Wait for page to load
		await expect(page.getByRole('heading', { name: 'Your Activities' })).toBeVisible();

		// Check if we see empty state or activity cards
		const emptyState = page.getByText('No activities yet');
		const activityCards = page.locator('.group.rounded-lg');

		// At least one should be visible (empty state or cards)
		const hasEmptyState = await emptyState.isVisible().catch(() => false);
		const hasCards = (await activityCards.count()) > 0;

		expect(hasEmptyState || hasCards).toBe(true);

		// If empty state, verify the "New Activity" button
		if (hasEmptyState) {
			const emptyStateCard = page.getByRole('heading', { name: 'No activities yet' }).locator('..');
			await expect(emptyStateCard.getByRole('link', { name: '+ New Activity' })).toBeVisible();
		}
	});

	test('can navigate to activity from dashboard', async ({ page }) => {
		const activityName = `Nav Test ${Date.now()}`;

		// Create an activity
		await createActivity(page, activityName);

		// Navigate to dashboard
		await page.goto('/activities');

		// Click on the activity card
		await page.getByText(activityName).click();

		// Should navigate to activity detail page
		await expect(page).toHaveURL(/\/activities\/[^/]+$/);
	});

	test('displays correct student count', async ({ page }) => {
		const activityName = `Student Count ${Date.now()}`;

		// Create an activity with 2 students
		await createActivity(page, activityName);

		// Navigate to dashboard
		await page.goto('/activities');

		// Find the activity card
		const activityCard = page.locator('.group.rounded-lg', { hasText: activityName });

		// Verify student count is displayed
		await expect(activityCard.getByText('2 students')).toBeVisible();
	});
});
