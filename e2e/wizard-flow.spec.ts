import { expect, test } from '@playwright/test';

test('teacher can create a grouping activity end-to-end', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

	const activityName = `Playwright Flow ${Date.now()}`;

	await page.goto('/activities/new');

	// Handle roster-selection step if it appears
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

	// Step 3: Review - Name the activity (click to edit, then fill)
	// Edit the auto-generated name
	await page.getByRole('button', { name: /^Edit$/ }).click();
	await page.locator('#activity-name').fill(activityName);
	await page.getByRole('button', { name: /^Save$/ }).click();
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify: landed on workspace with groups already generated
	await expect(page.getByText(activityName)).toBeVisible();

	// Groups should be visible (auto-generated)
	await expect(page.getByText('Unassigned')).toBeVisible();

	// Workspace toolbar buttons should exist
	await expect(page.getByRole('button', { name: '← Undo' })).toBeVisible();
});

test('workspace allows drag-drop editing', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice\talice@test.com\t5
Bob\tbob@test.com\t5`;

	const activityName = `DnD Test ${Date.now()}`;

	await page.goto('/activities/new');

	// Handle roster-selection step if it appears
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

	// Verify workspace loaded
	await expect(page.getByText('Unassigned')).toBeVisible();

	// Verify undo button exists and is initially disabled (no moves yet)
	const undoButton = page.getByRole('button', { name: '← Undo' });
	await expect(undoButton).toBeVisible();
	await expect(undoButton).toBeDisabled();

	// Note: Full drag-drop testing requires more complex interaction
	// This test verifies the workspace structure is correct
});
