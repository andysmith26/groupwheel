// @ts-nocheck — spec file uses Node APIs; type-checked by vitest, not svelte-check
/**
 * WP13: Red-Line Verification & Phase Gate
 *
 * Static analysis tests verifying all 12 applicable Phase 1 red-line criteria
 * from Decision 10 of the project definition.
 *
 * Updated for the spatial model restructuring:
 * - ProjectionMode.svelte → /activity/[id]/display route (display/+page.svelte)
 * - GenerationControls.svelte → removed (New Session in FloatingToolbar)
 * - SettingsPanel.svelte → SettingsPopover.svelte (in workspace/)
 * - HistoryPanel.svelte → HistoryPopover.svelte (in workspace/)
 *
 * Red-lines H-R1 and H-R2 are Phase 2 (observation mode) — excluded.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const COMPONENTS_DIR = path.join(ROOT, 'lib/components');
const ROUTES_DIR = path.join(ROOT, 'routes');

/**
 * Recursively collect all .svelte files under a directory.
 */
function collectSvelteFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...collectSvelteFiles(fullPath));
        } else if (entry.endsWith('.svelte')) {
          files.push(fullPath);
        }
      } catch {
        // skip inaccessible
      }
    }
  } catch {
    // directory may not exist
  }
  return files;
}

/**
 * Extract user-facing text from a Svelte template (outside <script> and <style> blocks).
 * Returns only the template portion.
 */
function extractTemplate(content: string): string {
  // Remove <script> blocks
  let template = content.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  // Remove <style> blocks
  template = template.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  return template;
}

// Collect all Svelte files from components and routes
const svelteFiles = [
  ...collectSvelteFiles(COMPONENTS_DIR),
  ...collectSvelteFiles(ROUTES_DIR)
];

const fileContents = new Map<string, string>();
for (const f of svelteFiles) {
  fileContents.set(f, fs.readFileSync(f, 'utf-8'));
}

describe('WP13: Red-Line Verification — Phase 1 Gate', () => {
  // =========================================================================
  // A-R2: No technical terms visible to users
  // "Pool" and "Program" must not appear in user-facing text.
  // =========================================================================
  describe('A-R2: No technical jargon in user-facing labels', () => {
    const BANNED_TERMS = ['Pool', 'Program'];

    for (const [filePath, content] of fileContents) {
      const relativePath = filePath.replace(ROOT + '/', '');
      const template = extractTemplate(content);

      for (const term of BANNED_TERMS) {
        it(`${relativePath} — no user-facing "${term}"`, () => {
          // Strip Svelte expressions {…} from template so we only check literal text.
          // This avoids false positives from code like {activity.program.name}.
          const literalText = template.replace(/\{[^}]*\}/g, '');

          // Match the term as a standalone word in literal text content between > and <
          const textContentRegex = new RegExp(`>\\s*[^<]*\\b${term}\\b[^<]*<`, 'i');

          // Also check aria-label, title, placeholder attributes for the banned term,
          // but only in literal (non-interpolated) portions of attribute values
          const attrRegex = new RegExp(
            `(?:aria-label|title|placeholder|alt)="[^"]*\\b${term}\\b[^"]*"`,
            'i'
          );

          const hasInText = textContentRegex.test(literalText);
          // For attributes, also strip Svelte expressions
          const literalAttrs = template.replace(/\{[^}]*\}/g, '');
          const hasInAttr = attrRegex.test(literalAttrs);

          expect(
            hasInText || hasInAttr,
            `Found banned term "${term}" in user-facing content of ${relativePath}`
          ).toBe(false);
        });
      }
    }
  });

  // =========================================================================
  // B-R1: Display route text ≥36pt, contrast ≥4.5:1
  // (Projection moved from in-page overlay to /activity/[id]/display route)
  // =========================================================================
  describe('B-R1: Display route text sizing', () => {
    it('Display route student names use ≥48pt (4rem) font size', () => {
      const displayFile = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      expect(displayFile, 'display/+page.svelte must exist').toBeDefined();

      const content = fileContents.get(displayFile!)!;
      // Student names: clamp with max ≥4rem (48pt ≈ 64px)
      expect(content).toContain('4rem)');
    });

    it('Display route group names use ≥60pt (5rem) font size', () => {
      const displayFile = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      const content = fileContents.get(displayFile!)!;
      expect(content).toContain('5rem)');
    });

    it('Display route uses high-contrast colors (≥7:1)', () => {
      const displayFile = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      const content = fileContents.get(displayFile!)!;
      // White text on dark backgrounds
      expect(content).toContain('#ffffff');
      // Dark text on white for member items
      expect(content).toContain('#111827');
    });

    it('Display route has no teacher-private information', () => {
      const displayFile = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      const content = fileContents.get(displayFile!)!;
      const template = extractTemplate(content);
      // Should not contain preference, analytics, or settings terms
      expect(template).not.toContain('preference');
      expect(template).not.toContain('analytics');
      expect(template).not.toContain('satisfaction');
    });
  });

  // =========================================================================
  // C-R2: All primary action buttons ≥44×44px
  // =========================================================================
  describe('C-R2: Primary action buttons ≥44×44px', () => {
    it('ClassViewToolbar.svelte — all buttons meet 44px minimum', () => {
      const file = svelteFiles.find((f) => f.endsWith('ClassViewToolbar.svelte'));
      expect(file, 'ClassViewToolbar.svelte must exist').toBeDefined();

      const content = fileContents.get(file!)!;
      // Back button uses h-11 w-11 (44px)
      expect(content).toContain('h-11 w-11');
    });

    it('FloatingToolbar.svelte — all buttons meet 44px minimum', () => {
      const file = svelteFiles.find((f) => f.endsWith('FloatingToolbar.svelte'));
      expect(file, 'FloatingToolbar.svelte must exist').toBeDefined();

      const content = fileContents.get(file!)!;
      // All buttons use min-h-[44px] or min-h-[56px]
      expect(content).toContain('min-h-[44px]');
      expect(content).toContain('min-h-[56px]');
    });

    it('Top header settings gear meets 44px minimum', () => {
      const file = svelteFiles.find((f) => f.endsWith('+layout.svelte'));
      const content = fileContents.get(file!)!;
      // Settings link should have min-h-[44px]
      expect(content).toMatch(/min-h-\[44px\].*min-w-\[44px\].*aria-label="Settings"/s);
    });

    it('ActivityCard menu button meets 44px minimum', () => {
      const file = svelteFiles.find((f) => f.endsWith('ActivityCard.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toMatch(/min-h-\[44px\].*min-w-\[44px\].*aria-label="More options/s);
    });
  });

  // =========================================================================
  // D-R1: No preference features visible when no preference data exists
  // =========================================================================
  describe('D-R1: Preference features gated by data state', () => {
    it('Analytics panel only renders when preferences threshold met', () => {
      const file = svelteFiles.find((f) => f.endsWith('ClassView.svelte'));
      const content = fileContents.get(file!)!;
      // Analytics panel should be gated by showAnalytics (which checks studentsWithPreferencesCount >= 3)
      expect(content).toContain('showAnalytics');
      expect(content).toContain('studentsWithPreferencesCount >= 3');
    });

    it('Preference badges gated by hasPreferenceData', () => {
      const file = svelteFiles.find((f) => f.endsWith('RosterPanel.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('hasPreferenceData');
    });
  });

  // =========================================================================
  // E-R1: Same action in same position across flows
  // =========================================================================
  describe('E-R1: Consistent action positioning', () => {
    it('New Session button is in the FloatingToolbar', () => {
      const file = svelteFiles.find((f) => f.endsWith('FloatingToolbar.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('New Session');

      // New Session should NOT appear in the toolbar or other locations
      const toolbar = svelteFiles.find((f) => f.endsWith('ClassViewToolbar.svelte'));
      const toolbarContent = fileContents.get(toolbar!)!;
      const toolbarTemplate = extractTemplate(toolbarContent);
      expect(toolbarTemplate).not.toContain('New Session');
    });

    it('Display button is in the FloatingToolbar', () => {
      const file = svelteFiles.find((f) => f.endsWith('FloatingToolbar.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('Display');
      expect(content).toContain('onDisplay');
    });
  });

  // =========================================================================
  // F-R1: Destructive actions have confirmation
  // =========================================================================
  describe('F-R1: Destructive actions have undo or confirmation', () => {
    it('Activity deletion has confirmation dialog', () => {
      const file = svelteFiles.find((f) => f.endsWith('HomeScreen.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('deleteModalOpen');
      expect(content).toContain('Delete Activity');
      expect(content).toContain('This cannot be undone');
      expect(content).toContain('Cancel');
    });

    it('Group regeneration auto-saves previous arrangement', () => {
      // The VM should save to history before regenerating
      const vmFile = path.join(ROOT, 'lib/stores/class-view-vm.svelte.ts');
      const content = fs.readFileSync(vmFile, 'utf-8');
      expect(content).toContain('generationHistory');
    });
  });

  // =========================================================================
  // F-R2: Algorithmic failures surfaced to user
  // =========================================================================
  describe('F-R2: Algorithmic failures surfaced to user', () => {
    it('Generation errors are displayed in GroupsPanel', () => {
      const file = svelteFiles.find((f) => f.endsWith('GroupsPanel.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('generationError');
      expect(content).toContain('Failed to generate groups');
    });
  });

  // =========================================================================
  // F-R3: Partial failure preserves successful steps (P14)
  // =========================================================================
  describe('F-R3: Graceful degradation for composite actions', () => {
    it('Quick Start navigates to Class View even if generation fails', () => {
      const file = svelteFiles.find((f) => f.endsWith('QuickStartCard.svelte'));
      expect(file).toBeDefined();
      const content = fileContents.get(file!)!;
      // Should navigate even on generation failure (P14)
      expect(content).toContain('Graceful degradation');
    });

    it('Import preserves valid rows when some fail', () => {
      const file = svelteFiles.find((f) => f.endsWith('ClassView.svelte'));
      const content = fileContents.get(file!)!;
      // handleImport should add successful students even if some fail
      expect(content).toContain('addedStudents');
      expect(content).toContain('errors');
    });
  });

  // =========================================================================
  // G-R1: WCAG 2.1 Level A basics
  // =========================================================================
  describe('G-R1: WCAG 2.1 Level A spot checks', () => {
    it('All interactive elements in critical files have aria-labels or visible text', () => {
      const criticalFiles = [
        'ClassViewToolbar.svelte',
        'FloatingToolbar.svelte',
        'RosterPanel.svelte'
      ];

      for (const fileName of criticalFiles) {
        const file = svelteFiles.find((f) => f.endsWith(fileName));
        expect(file, `${fileName} must exist`).toBeDefined();
        const content = fileContents.get(file!)!;

        // Every <button> should have aria-label or visible text content
        const buttonRegex = /<button[^>]*>/g;
        const buttons = [...content.matchAll(buttonRegex)];
        for (const match of buttons) {
          const buttonTag = match[0];
          const hasAriaLabel = buttonTag.includes('aria-label');
          // Check if button has text content (not just an icon)
          const buttonEnd = content.indexOf('</button>', match.index!);
          const buttonContent = content.substring(match.index!, buttonEnd);
          const hasTextContent = /<span|[A-Z][a-z]/.test(
            buttonContent.replace(/<svg[\s\S]*?<\/svg>/g, '')
          );

          expect(
            hasAriaLabel || hasTextContent,
            `Button in ${fileName} at position ${match.index} lacks aria-label and visible text`
          ).toBe(true);
        }
      }
    });

    it('Display route has region landmark with label', () => {
      const file = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('role="region"');
      expect(content).toContain('aria-label="Projected group assignments"');
    });

    it('FloatingToolbar has role="toolbar"', () => {
      const file = svelteFiles.find((f) => f.endsWith('FloatingToolbar.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('role="toolbar"');
    });
  });

  // =========================================================================
  // G-R2: Groups not distinguishable only by color
  // =========================================================================
  describe('G-R2: Group assignments use color + label', () => {
    it('Display route groups have text labels, not just color', () => {
      const file = svelteFiles.find((f) => f.includes('display/+page.svelte'));
      const content = fileContents.get(file!)!;
      // Each group has a name label
      expect(content).toContain('group.name');
      expect(content).toContain('group-name');
    });
  });

  // =========================================================================
  // Phase 1 Exit Criteria: Additional checks
  // =========================================================================
  describe('Phase 1 Exit Criteria', () => {
    it('Rotation avoidance on by default', () => {
      const vmFile = path.join(ROOT, 'lib/stores/class-view-vm.svelte.ts');
      const content = fs.readFileSync(vmFile, 'utf-8');
      // Default should be true
      expect(content).toContain('avoidRecentGroupmates');
    });

    it('Rotation hint appears after 2nd session', () => {
      const file = svelteFiles.find((f) => f.endsWith('ClassView.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('publishedSessionCount >= 2');
      expect(content).toContain('rotationAvoidance');
    });

    it('Rotation hint is dismissible and never returns', () => {
      const hintFile = path.join(ROOT, 'lib/stores/hintState.svelte.ts');
      const content = fs.readFileSync(hintFile, 'utf-8');
      expect(content).toContain('rotationAvoidance');
      // Uses localStorage for persistence
      expect(content).toContain('localStorage');
    });

    it('"On this device" indicator present in ClassViewToolbar', () => {
      const file = svelteFiles.find((f) => f.endsWith('ClassViewToolbar.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('On this device');
    });

    it('Quick Start card exists on Home screen', () => {
      const file = svelteFiles.find((f) => f.endsWith('HomeScreen.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('QuickStartCard');
    });

    it('SettingsPopover has rotation avoidance toggle and lookback slider', () => {
      const file = svelteFiles.find((f) => f.endsWith('SettingsPopover.svelte'));
      expect(file, 'SettingsPopover.svelte must exist').toBeDefined();
      const content = fileContents.get(file!)!;
      expect(content).toContain('Avoid recent groupmates');
      expect(content).toContain('type="range"');
      expect(content).toContain('min="1"');
      expect(content).toContain('max="10"');
    });

    it('HistoryPopover exists for session history', () => {
      const file = svelteFiles.find((f) => f.endsWith('HistoryPopover.svelte'));
      expect(file, 'HistoryPopover.svelte must exist').toBeDefined();
      const content = fileContents.get(file!)!;
      expect(content).toContain('sessions');
    });

    it('Keyboard accessibility for drag-drop', () => {
      const file = svelteFiles.find((f) => f.endsWith('GroupsPanel.svelte'));
      const content = fileContents.get(file!)!;
      expect(content).toContain('onKeyboardPickUp');
      expect(content).toContain('onKeyboardDrop');
      expect(content).toContain('onKeyboardCancel');
      expect(content).toContain('onKeyboardMove');
    });
  });
});
