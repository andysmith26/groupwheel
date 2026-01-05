import { expect, test } from '@playwright/test';

test('can backtrack through wizard in specific groups mode', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

	const activityName = `Backtrack Test ${Date.now()}`;

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
	await page.getByLabel('Roster data').fill(rosterData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Step 2: Groups - Select "specific groups" mode
	await page.getByRole('button', { name: /I have specific groups to fill/ }).click();

	// Add a group with name and capacity
	await page.getByPlaceholder('Enter group name').first().fill('Team Alpha');
	await page.getByPlaceholder('--').first().fill('2');

	// Add another group
	await page.getByRole('button', { name: /Add group/ }).click();
	await page.getByPlaceholder('Enter group name').nth(1).fill('Team Beta');
	await page.getByPlaceholder('--').nth(1).fill('2');

	// Continue button should now be enabled
	const continueButton = page.getByRole('button', { name: /Continue/ });
	await expect(continueButton).toBeEnabled();

	// Click Continue to go to Preferences step
	await continueButton.click();

	// We should now be on the Preferences step
	await expect(page.getByText(/Import preferences/i)).toBeVisible();

	// Now click Back to return to Groups step
	await page.getByRole('button', { name: /Back/ }).click();

	// We should be back on the Groups step
	await expect(page.getByRole('button', { name: /I have specific groups to fill/ })).toBeVisible();

	// The groups we defined should still be visible
	await expect(page.getByPlaceholder('Enter group name').first()).toHaveValue('Team Alpha');
	await expect(page.getByPlaceholder('--').first()).toHaveValue('2');
	await expect(page.getByPlaceholder('Enter group name').nth(1)).toHaveValue('Team Beta');
	await expect(page.getByPlaceholder('--').nth(1)).toHaveValue('2');

	// Most importantly: Continue button should STILL be enabled
	// This is the bug we're fixing - it was disabled after backtracking
	await expect(continueButton).toBeEnabled();

	// Verify we can continue forward again
	await continueButton.click();
	await expect(page.getByText(/Import preferences/i)).toBeVisible();

	// Complete the wizard
	await page.getByRole('button', { name: /Continue/ }).click(); // Skip preferences
	await page.getByLabel('Activity name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify: landed on workspace
	await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

	// Verify the specific groups we defined are present
	await expect(page.getByText('Team Alpha')).toBeVisible();
	await expect(page.getByText('Team Beta')).toBeVisible();
});

test('can backtrack through wizard in auto split mode', async ({ page }) => {
	const rosterData = `name\tid\tgrade
Alice Smith\talice@example.com\t5
Bob Jones\tbob@example.com\t5
Carol White\tcarol@example.com\t5
Dave Brown\tdave@example.com\t5`;

	const activityName = `Auto Split Test ${Date.now()}`;

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
	await page.getByLabel('Roster data').fill(rosterData);
	await page.getByRole('button', { name: /Continue/ }).click();

	// Step 2: Groups - Select "auto split" mode
	await page.getByRole('button', { name: /Just split students into groups/ }).click();

	// Continue button should be enabled (auto mode is always valid)
	const continueButton = page.getByRole('button', { name: /Continue/ });
	await expect(continueButton).toBeEnabled();

	// Click Continue to go to Preferences step
	await continueButton.click();

	// We should now be on the Preferences step
	await expect(page.getByText(/Import preferences/i)).toBeVisible();

	// Now click Back to return to Groups step
	await page.getByRole('button', { name: /Back/ }).click();

	// We should be back on the Groups step with auto mode selected
	await expect(page.getByRole('button', { name: /Just split students into groups/ })).toBeVisible();

	// Continue button should STILL be enabled
	await expect(continueButton).toBeEnabled();

	// Verify we can continue forward again
	await continueButton.click();
	await expect(page.getByText(/Import preferences/i)).toBeVisible();

	// Complete the wizard
	await page.getByRole('button', { name: /Continue/ }).click(); // Skip preferences
	await page.getByLabel('Activity name').fill(activityName);
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Verify: landed on workspace
	await expect(page.getByRole('heading', { name: activityName })).toBeVisible();
});
