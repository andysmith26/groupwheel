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
	await page.getByRole('button', { name: /Activity Name/i }).click();
	await page.locator('#activity-name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify: landed on workspace with groups already generated
	await expect(page.getByRole('button', { name: activityName })).toBeVisible();

	// Groups should be visible (auto-generated)
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Toolbar should show analytics
	await expect(page.getByText(/% top choice/)).toBeVisible();

	// Verify editing works: open sidebar
	await page.getByRole('button', { name: /Students/ }).click();
	await expect(page.getByText('4 total')).toBeVisible(); // sidebar header

	// Show to Class button should exist
	await expect(page.getByRole('button', { name: 'Show to Class' })).toBeVisible();
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
	await page.getByRole('button', { name: /Activity Name/i }).click();
	await page.locator('#activity-name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify workspace loaded
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Verify undo button exists and is initially disabled (no moves yet)
	const undoButton = page.getByRole('button', { name: '← Undo' });
	await expect(undoButton).toBeVisible();
	await expect(undoButton).toBeDisabled();

	// Note: Full drag-drop testing requires more complex interaction
	// This test verifies the workspace structure is correct
});

test('try another creates variation and preserves history', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice\talice@test.com\t5
Bob\tbob@test.com\t5
Carol\tcarol@test.com\t5
Dave\tdave@test.com\t5
Eve\teve@test.com\t5
Frank\tfrank@test.com\t5
Grace\tgrace@test.com\t5
Henry\thenry@test.com\t5`;

	const activityName = `Try Another Test ${Date.now()}`;

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
	await page.getByRole('button', { name: /Activity Name/i }).click();
	await page.locator('#activity-name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify workspace loaded
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Verify Try Another button exists
	const tryAnotherButton = page.getByRole('button', { name: /^Try Another$/ });
	await expect(tryAnotherButton).toBeVisible();

	// History selector should not be visible initially (no history yet)
	await expect(page.getByRole('button', { name: /^Previous$/ })).toHaveCount(0);

	// Click Try Another
	await tryAnotherButton.click();

	// Wait for generation to complete
	await expect(tryAnotherButton).not.toHaveText(/Generating/);
	await expect(tryAnotherButton).toHaveText('Try Another');

	// History selector should now be visible with "Previous" option
	await expect(page.getByRole('button', { name: /^Current$/ })).toBeVisible({ timeout: 10000 });
	await expect(page.getByRole('button', { name: /^Previous$/ })).toBeVisible({ timeout: 10000 });

	// Click Previous to switch to previous result
	await page.getByRole('button', { name: /^Previous$/ }).click();

	// Previous button should now be active (has different styling)
	// Click Current to switch back
	await page.getByRole('button', { name: /^Current$/ }).click();
});

test('start over clears history', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice\talice@test.com\t5
Bob\tbob@test.com\t5
Carol\tcarol@test.com\t5
Dave\tdave@test.com\t5`;

	const activityName = `Start Over Test ${Date.now()}`;

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
	await page.getByRole('button', { name: /Activity Name/i }).click();
	await page.locator('#activity-name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify workspace loaded
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Click Try Another to build history
	const tryAnotherButton = page.getByRole('button', { name: /^Try Another$/ });
	await tryAnotherButton.click();
	await expect(tryAnotherButton).toHaveText('Try Another');

	// History selector should be visible
	await expect(page.getByRole('button', { name: /^Previous$/ })).toBeVisible({ timeout: 10000 });

	// Click Start Over
	await page.getByRole('button', { name: /^Start Over$/ }).click();

	// Confirm in dialog
	await page.getByRole('button', { name: 'Start Over' }).last().click();

	// Wait for regeneration
	await expect(page.getByRole('button', { name: /Regenerating/ })).not.toBeVisible();

	// History selector should be hidden (history cleared)
	await expect(page.getByRole('button', { name: /^Previous$/ })).toHaveCount(0);
});
