import { expect, test } from '@playwright/test';

/**
 * Helper to create an activity via the wizard and navigate to setup page.
 * The setup page redirects to /activities/[id] which serves as the hub.
 */
async function createActivityAndGoToSetup(
	page: import('@playwright/test').Page,
	activityName: string
) {
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

	// Step 3: Review - Edit the auto-generated name
	await page.getByRole('button', { name: /^Edit$/ }).click();
	await page.locator('#activity-name').fill(activityName);
	await page.getByRole('button', { name: /^Save$/ }).click();
	await Promise.all([
		page.waitForURL(/\/activities\/[^/]+\/workspace$/),
		page.getByRole('button', { name: /Create Groups/i }).click()
	]);

	// Extract activity ID from URL and navigate to activity detail page (hub)
	const url = page.url();
	const match = url.match(/\/activities\/([^/]+)\/workspace/);
	if (!match) throw new Error('Could not extract activity ID from URL');
	const activityId = match[1];

	await page.goto(`/activities/${activityId}`);
	await expect(page.getByRole('heading', { name: activityName })).toBeVisible();

	return activityId;
}

test.describe('Setup Page', () => {
	test('can add a student manually', async ({ page }) => {
		const activityName = `Setup Add Student ${Date.now()}`;
		await createActivityAndGoToSetup(page, activityName);

		// Expand students section
		const studentsSectionToggle = page.getByRole('button', { name: /^Students/ });
		await studentsSectionToggle.click();

		// Verify initial student count
		await expect(studentsSectionToggle).toContainText('4 students');

		// Click add student button
		await page.getByRole('button', { name: '+ Add Student' }).click();

		// Fill in the new student form (inputs use placeholders, not labels)
		await page.getByPlaceholder('First name').fill('Eve');
		await page.getByPlaceholder('Last name').fill('Wilson');

		// Submit the form
		await page.getByRole('button', { name: 'Add Student', exact: true }).click();

		// Verify student was added
		await expect(page.getByText('Eve Wilson')).toBeVisible();
		await expect(studentsSectionToggle).toContainText('5 students');
	});

	test('can remove a student', async ({ page }) => {
		const activityName = `Setup Remove Student ${Date.now()}`;
		await createActivityAndGoToSetup(page, activityName);

		// Expand students section
		const studentsSectionToggle = page.getByRole('button', { name: /^Students/ });
		await studentsSectionToggle.click();

		// Verify initial student count
		await expect(studentsSectionToggle).toContainText('4 students');

		// Find Alice and click remove button (aria-label includes grade)
		const removeButton = page.getByRole('button', { name: /Remove Alice Smith/ });
		await removeButton.click();

		// Confirm removal in dialog
		const confirmButton = page.getByRole('button', { name: 'Remove' }).last();
		await confirmButton.click();

		// Verify student was removed - wait for dialog to close, then check in the student list
		await expect(page.locator('.max-h-64').getByText('Alice Smith')).not.toBeVisible();
		await expect(studentsSectionToggle).toContainText('3 students');
	});

	test('can change group configuration', async ({ page }) => {
		const activityName = `Setup Groups ${Date.now()}`;
		await createActivityAndGoToSetup(page, activityName);

		// Expand the GroupCard to customize shells (if currently in compact mode)
		const customizeButton = page.getByRole('button', {
			name: /Customize group names & caps/i
		});
		if (await customizeButton.isVisible().catch(() => false)) {
			await customizeButton.click();
		}

		// Find group name input and change it
		const groupNameInput = page.locator('[data-gc-name="0"]');
		await groupNameInput.clear();
		await groupNameInput.fill('Team Alpha');

		// Verify the change was applied
		await expect(groupNameInput).toHaveValue('Team Alpha');

		// Add capacity
		const capacityInput = page.locator('[data-gc-capacity="0"]');
		await capacityInput.fill('3');
		await expect(capacityInput).toHaveValue('3');
	});

	test('can navigate back to workspace', async ({ page }) => {
		const activityName = `Setup Nav ${Date.now()}`;
		const activityId = await createActivityAndGoToSetup(page, activityName);

		// Click the "Edit current groups" action
		await page.getByRole('button', { name: /Edit current groups/i }).click();

		// Should navigate to workspace
		await expect(page).toHaveURL(`/activities/${activityId}/workspace`);
		await expect(page.getByTestId('workspace-shell')).toBeVisible();
	});

	test('shows error for invalid activity ID', async ({ page }) => {
		await page.goto('/activities/nonexistent-id-12345');

		// Should show error message
		await expect(page.getByText(/not found/i)).toBeVisible();

		// Should have link back to activities
		await expect(page.getByText('Back to activities')).toBeVisible();
	});
});
