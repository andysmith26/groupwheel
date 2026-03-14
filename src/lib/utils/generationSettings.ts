/**
 * generationSettings.ts
 *
 * Per-activity generation preferences stored in localStorage.
 * Remembers the teacher's last-used group size and avoid-recent toggle
 * so the "New Groups" button on the activity detail page can generate
 * with one tap using remembered settings.
 */

import type { GroupShell } from '$lib/utils/groupShellValidation';

export interface GenerationSettings {
  groupSize: number;
  avoidRecentGroupmates: boolean;
  /** Number of most recent sessions to consider when avoiding recent groupmates. Default: 3, range: 1–10. */
  lookbackSessions: number;
  /** Custom group shells. Non-null when user has customized group names/caps. */
  customShells?: GroupShell[];
}

const STORAGE_KEY_PREFIX = 'gw-gen-settings-';

const DEFAULTS: GenerationSettings = {
  groupSize: 4,
  avoidRecentGroupmates: true,
  lookbackSessions: 3
};

export function getGenerationSettings(programId: string): GenerationSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${programId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawLookback = parsed.lookbackSessions;
      const lookbackSessions =
        typeof rawLookback === 'number' && Number.isFinite(rawLookback)
          ? Math.min(10, Math.max(1, Math.round(rawLookback)))
          : DEFAULTS.lookbackSessions;
      const settings: GenerationSettings = {
        groupSize:
          typeof parsed.groupSize === 'number' && parsed.groupSize >= 2
            ? parsed.groupSize
            : DEFAULTS.groupSize,
        avoidRecentGroupmates:
          typeof parsed.avoidRecentGroupmates === 'boolean'
            ? parsed.avoidRecentGroupmates
            : DEFAULTS.avoidRecentGroupmates,
        lookbackSessions
      };
      if (Array.isArray(parsed.customShells) && parsed.customShells.length > 0) {
        settings.customShells = parsed.customShells;
      }
      return settings;
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return { ...DEFAULTS };
}

export function saveGenerationSettings(programId: string, settings: Partial<GenerationSettings>): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${programId}`, JSON.stringify(settings));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}
