/**
 * generationSettings.ts
 *
 * Per-activity generation preferences stored in localStorage.
 * Remembers the teacher's last-used group size and avoid-recent toggle
 * so the "New Groups" button on the activity detail page can generate
 * with one tap using remembered settings.
 */

export interface GenerationSettings {
	groupSize: number;
	avoidRecentGroupmates: boolean;
}

const STORAGE_KEY_PREFIX = 'gw-gen-settings-';

const DEFAULTS: GenerationSettings = {
	groupSize: 4,
	avoidRecentGroupmates: true
};

export function getGenerationSettings(programId: string): GenerationSettings {
	try {
		const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${programId}`);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				groupSize:
					typeof parsed.groupSize === 'number' && parsed.groupSize >= 2
						? parsed.groupSize
						: DEFAULTS.groupSize,
				avoidRecentGroupmates:
					typeof parsed.avoidRecentGroupmates === 'boolean'
						? parsed.avoidRecentGroupmates
						: DEFAULTS.avoidRecentGroupmates
			};
		}
	} catch {
		// Ignore parse errors, return defaults
	}
	return { ...DEFAULTS };
}

export function saveGenerationSettings(
	programId: string,
	settings: GenerationSettings
): void {
	try {
		localStorage.setItem(`${STORAGE_KEY_PREFIX}${programId}`, JSON.stringify(settings));
	} catch {
		// Ignore storage errors (quota exceeded, etc.)
	}
}
