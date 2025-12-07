import { expect, test } from '@playwright/test';

test('teacher can create a grouping activity end-to-end', async ({ page }) => {
	const rosterData = `name	id	grade
Alice Smith	alice@example.com	5
Bob Jones	bob@example.com	5
Carol White	carol@example.com	5
Dave Brown	dave@example.com	5`;

	const preferencesData = `student_id	friend 1 id	friend 2 id
alice@example.com	bob@example.com	carol@example.com
bob@example.com	alice@example.com
carol@example.com	dave@example.com
dave@example.com	carol@example.com	alice@example.com`;

	const activityName = `Playwright Flow ${Date.now()}`;

	await page.goto('/groups/new');

	// Some runs may start with a roster-selection step if data already exists.
	const startHeading = page.getByRole('heading', { name: 'Start from' });
	try {
		if (await startHeading.isVisible({ timeout: 500 })) {
			await page.getByRole('button', { name: /Continue/ }).click();
		}
	} catch {
		// ignore if the wizard opens directly on the roster step
	}

	// Paste roster data
	await page.getByLabel('Roster data').fill(rosterData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Paste preferences
	await page.getByLabel('Preference data').fill(preferencesData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Name the activity and submit
	await page.getByLabel('Activity name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/groups\/[^/]+$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

	// Generate groups and wait for analytics to render
	await page.getByRole('button', { name: /Generate Groups/i }).click();
	await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
	await expect(page.getByText('Top choice satisfied')).toBeVisible();

	// Open the student view and verify it loads
	const [studentPage] = await Promise.all([
		page.waitForEvent('popup'),
		page.getByRole('link', { name: /View for class/i }).click()
	]);
	await expect(studentPage).toHaveURL(/\/scenarios\/[^/]+\/student-view/);
	await expect(studentPage.getByRole('heading', { name: 'Student Groups' })).toBeVisible();
});
