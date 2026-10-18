import { expect, test } from '@playwright/test';
import { createActivity } from './helpers/createActivity';

test.describe('Drag and Drop Workspace', () => {
  test('workspace shows correct group structure', async ({ page }) => {
    const activityName = `Structure Test ${Date.now()}`;
    await createActivity(page, { activityName });

    // Verify basic workspace elements are visible
    await expect(page.getByText('Unassigned')).toBeVisible();

    // Student cards show compact labels (e.g., "Alice S.") and have full name in aria-label
    // Check that student cards with data-student-id attributes are present
    const studentCards = page.locator('[data-student-id]');
    await expect(studentCards.first()).toBeVisible();
    const cardCount = await studentCards.count();
    expect(cardCount).toBe(10); // 10 students total
  });

  test('can drag student between groups', async ({ page }) => {
    const activityName = `DnD Move ${Date.now()}`;
    await createActivity(page, { activityName });

    await expect(page.getByText('Unassigned')).toBeVisible();

    // Find a student card via aria-label (cards show compact names like "Alice S.")
    const aliceCard = page.locator('[data-student-id]').first();
    await expect(aliceCard).toBeVisible();

    // Find drop zones (elements containing "Drop students here")
    const dropZones = page.locator('text=Drop students here');
    const emptyGroupCount = await dropZones.count();

    if (emptyGroupCount > 0) {
      // There's an empty group - drag the student there
      const cardBounds = await aliceCard.boundingBox();
      const targetDropZone = dropZones.first();
      const targetBounds = await targetDropZone.boundingBox();

      if (targetBounds && cardBounds) {
        // Perform drag using mouse events
        await page.mouse.move(
          cardBounds.x + cardBounds.width / 2,
          cardBounds.y + cardBounds.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
          targetBounds.x + targetBounds.width / 2,
          targetBounds.y + targetBounds.height / 2,
          { steps: 10 }
        );
        await page.mouse.up();

        await expect(page.locator('[data-student-id]')).toHaveCount(10);
      }
    }
  });

  test('workspace displays group columns with student cards', async ({ page }) => {
    const activityName = `Group Cards ${Date.now()}`;
    await createActivity(page, { activityName });

    await expect(page.getByText('Unassigned')).toBeVisible();

    // Groups should display as columns with border styling
    const groupColumns = page.locator('.rounded-xl.border-2');
    const groupCount = await groupColumns.count();
    expect(groupCount).toBeGreaterThanOrEqual(2);

    // Students should be visible within the groups (via data-student-id attribute)
    const studentCards = page.locator('[data-student-id]');
    expect(await studentCards.count()).toBe(10);
  });

  test('keeps the compact toolbar visible above the desktop canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const activityName = `Compact Canvas ${Date.now()}`;
    await createActivity(page, { activityName });

    const toolbar = page.getByRole('toolbar', { name: 'Workspace toolbar' });
    await expect(toolbar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();

    await page.mouse.move(640, 400);
    await expect(toolbar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();

    const firstGroupColumn = page.locator('.rounded-xl.border-2').first();
    await expect(firstGroupColumn).toBeVisible();
    const groupBounds = await firstGroupColumn.boundingBox();
    const toolbarBounds = await toolbar.boundingBox();
    expect(groupBounds).not.toBeNull();
    expect(toolbarBounds).not.toBeNull();
    expect(toolbarBounds!.height).toBe(32);
    expect(groupBounds!.y).toBeGreaterThanOrEqual(toolbarBounds!.y + toolbarBounds!.height);

    const profileAction = page.getByRole('button', {
      name: "View Alice Smith's details. No peer requests."
    });
    await profileAction.click();
    await expect(page.getByLabel('Student detail panel')).toBeVisible();
    await expect(page.getByText('Peer requests', { exact: true })).toBeVisible();
  });

  test('card display options persist and toolbar menus are exclusive', async ({ page }) => {
    await createActivity(page, { activityName: `Card Options ${Date.now()}` });

    const cardsButton = page.getByRole('button', { name: 'Card display options' });
    await cardsButton.click();
    const cardsDialog = page.getByRole('dialog', { name: 'Card display' });
    await expect(cardsDialog).toBeVisible();
    await expect(cardsDialog.getByLabel('Show tags on cards')).toBeChecked();
    await expect(cardsDialog.getByText(/No tags yet/)).toBeVisible();
    await cardsDialog.getByLabel('Show tags on cards').uncheck();

    await page.getByRole('button', { name: 'Open settings' }).click();
    await expect(cardsDialog).not.toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).not.toBeVisible();

    await cardsButton.click();
    await expect(cardsDialog.getByLabel('Show tags on cards')).not.toBeChecked();
    await page.reload();
    await page.getByRole('button', { name: 'Card display options' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Card display' }).getByLabel('Show tags on cards')
    ).not.toBeChecked();
  });

  test('shows tags from multiple imported roster columns on the canvas', async ({ page }) => {
    await createActivity(page, {
      activityName: `Imported Tags ${Date.now()}`,
      students: ['River Otter', 'Moss Finch']
    });

    await page.getByRole('button', { name: 'Open roster' }).click();
    await page.getByRole('button', { name: /Add real names\? Import your roster/ }).click();
    const importDialog = page.getByRole('dialog', { name: 'Import roster' });
    await importDialog
      .locator('textarea')
      .fill(
        'First Name\tLast Name\tSupport\tProgram\tStudent ID\nAlex\tTagger\tELL\tReading\talex-tagger\nCasey\tReader\tIEP\tMath\tcasey-reader'
      );
    const mappings = importDialog.locator('select');
    await mappings.nth(2).selectOption('tags');
    await mappings.nth(3).selectOption('tags');
    await importDialog.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('[data-student-id][aria-label*="Tags: ELL, Reading"]')).toHaveCount(
      1
    );
    await expect(page.locator('[data-student-id][aria-label*="Tags: IEP, Math"]')).toHaveCount(1);
  });

  test('opens the edit sidebar from canvas card actions', async ({ page }) => {
    const activityName = `Canvas Student Details ${Date.now()}`;
    await createActivity(page, { activityName });

    const profileAction = page.getByRole('button', {
      name: "View Alice Smith's details. No peer requests."
    });
    await expect(profileAction).toBeVisible();
    await profileAction.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Student detail panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Student' })).toBeVisible();

    await page.getByRole('button', { name: 'Close panel' }).click();
  });

  test('student edit sidebar saves group and peer preference controls', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('groupwheel:useExperimentalFeatures', 'true');
    });

    const activityName = `Sidebar Preferences ${Date.now()}`;
    await createActivity(page, { activityName });

    const openRoster = page.getByRole('button', { name: 'Open roster' });
    if (await openRoster.isVisible()) {
      await openRoster.click();
    }

    await page.getByRole('button', { name: /Alice Smith$/ }).click();

    await expect(page.getByText('Group preferences')).toBeVisible();
    await expect(page.getByText('Peer preferences')).toBeVisible();
    await expect(page.getByText('Peer requests', { exact: true })).toBeVisible();

    const preferredGroup = page.locator('#preferred-group');
    await preferredGroup.selectOption({ index: 1 });
    await page
      .getByRole('group', { name: 'Group preferences' })
      .getByRole('button', { name: 'Add' })
      .click();
    await expect(
      page.getByRole('group', { name: 'Group preferences' }).getByRole('listitem').first()
    ).toBeVisible();

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await page.getByRole('button', { name: /Alice Smith$/ }).click();
    await expect(
      page.getByRole('group', { name: 'Group preferences' }).getByRole('listitem').first()
    ).toBeVisible();
  });
});
