import { expect, test } from '@playwright/test';

test('home page shows landing or redirects to dashboard', async ({ page }) => {
	await page.goto('/');

	// For first-time visitors: landing page with main heading
	// For returning users: redirects to /activities
	const landingHeading = page.getByRole('heading', {
		name: 'Stop wrestling with spreadsheets to make student groups.'
	});
	const dashboardHeading = page.getByRole('heading', { name: 'Your Activities' });

	// Wait for either the landing page or dashboard to appear
	await expect(landingHeading.or(dashboardHeading)).toBeVisible({ timeout: 10000 });

	// Check which page we're on
	const onLanding = await landingHeading.isVisible().catch(() => false);

	if (onLanding) {
		// First-time visitor sees landing page
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('link', { name: /Get Started/ })).toBeVisible();
	} else {
		// Returning user gets redirected to dashboard
		await expect(page).toHaveURL('/activities');
		await expect(dashboardHeading).toBeVisible();
	}
});
