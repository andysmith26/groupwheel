import type { Page } from '@playwright/test';

const DEFAULT_STUDENTS = [
  'Alice Smith',
  'Bob Jones',
  'Carol White',
  'Dave Brown',
  'Eve Wilson',
  'Frank Miller',
  'Grace Lee',
  'Henry Ford',
  'Ivy Chen',
  'Jack Liu'
];

interface CreateActivityOptions {
  activityName: string;
  students?: string[];
  generateGroups?: boolean;
}

/** Create an activity through the /activity/new wizard. */
export async function createActivity(
  page: Page,
  { activityName, students = DEFAULT_STUDENTS, generateGroups = true }: CreateActivityOptions
): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Activity' }).click();
  await page.waitForURL(/\/activity\/new$/);
  await page.locator('#an-roster-paste').fill(students.join('\n'));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#an-name').fill(activityName);

  await Promise.all([
    page.waitForURL(/\/activity\/(?!new)[^/?]+(?:\?.*)?$/),
    page.getByRole('button', { name: 'Create Groups' }).click()
  ]);

  const match = page.url().match(/\/activity\/([^/?]+)/);
  if (!match) throw new Error('Could not extract the activity ID from the current URL');

  if (generateGroups) {
    await page.locator('[data-student-id]').first().waitFor();
  }

  return match[1];
}
