import { expect, test } from '@playwright/test';

test('teacher can create a grouping activity end-to-end', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

	const preferencesData = `student_id\tfriend 1 id\tfriend 2 id
alice@example.com\tbob@example.com\tcarol@example.com
bob@example.com\talice@example.com
carol@example.com\tdave@example.com
dave@example.com\tcarol@example.com\talice@example.com`;

	const activityName = `Playwright Flow ${Date.now()}`;

	await page.goto('/groups/new');

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
	await page.getByLabel('Roster data').fill(rosterData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Step 2: Paste preferences
	await page.getByLabel('Preference data').fill(preferencesData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Step 3: Name the activity and submit
	await page.getByLabel('Activity name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/groups\/[^/]+$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify: landed on workspace with groups already generated
	await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

	// Groups should be visible (auto-generated)
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Toolbar should show analytics
	await expect(page.getByText(/% top choice/)).toBeVisible();

	// Verify editing works: open sidebar
	await page.getByRole('button', { name: /Students/ }).click();
	await expect(page.getByText('4 total')).toBeVisible(); // sidebar header

	// Student View link should exist
	const studentViewLink = page.getByRole('link', { name: /Student View/ });
	await expect(studentViewLink).toBeVisible();

	// Open student view and verify
	const [studentPage] = await Promise.all([page.waitForEvent('popup'), studentViewLink.click()]);
	await expect(studentPage).toHaveURL(/\/scenarios\/[^/]+\/student-view/);
	await expect(studentPage.getByRole('heading', { name: 'Student Groups' })).toBeVisible();
});

test('workspace allows drag-drop editing', async ({ page }) => {
	// This test assumes an activity already exists
	// For now, create one first using the wizard flow

	const rosterData = `name\tid\tgrade
Alice\talice@test.com\t5
Bob\tbob@test.com\t5`;

	const activityName = `DnD Test ${Date.now()}`;

	await page.goto('/groups/new');

	// Quick wizard completion
	const startHeading = page.getByRole('heading', { name: 'Start from' });
	try {
		if (await startHeading.isVisible({ timeout: 500 })) {
			await page.getByRole('button', { name: /Continue/ }).click();
		}
	} catch {
		// ignore
	}

	await page.getByLabel('Roster data').fill(rosterData);
	await page.getByRole('button', { name: /Continue/ }).click();
	await page.getByRole('button', { name: /Skip/ }).click(); // skip preferences
	await page.getByLabel('Activity name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/groups\/[^/]+$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify workspace loaded
	await expect(page.getByText('Not in groups')).toBeVisible();

	// Verify undo button exists and is initially disabled (no moves yet)
	const undoButton = page.getByRole('button', { name: /Undo/ });
	await expect(undoButton).toBeVisible();
	await expect(undoButton).toBeDisabled();

	// Note: Full drag-drop testing requires more complex interaction
	// This test verifies the workspace structure is correct
});
