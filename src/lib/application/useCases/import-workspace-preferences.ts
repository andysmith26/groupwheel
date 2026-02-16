import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import type { Preference } from '$lib/domain';
import { extractStudentPreference } from '$lib/domain/preference';
import { err, ok, type Result } from '$lib/types/result';

export type ParsedWorkspacePreference = {
	studentId: string;
	likeGroupIds?: string[];
	avoidStudentIds?: string[];
};

export type ImportWorkspacePreferencesDeps = {
	idGenerator: IdGenerator;
};

export type ImportWorkspacePreferencesInput = {
	programId: string;
	parsedPreferences: ParsedWorkspacePreference[];
	existingPreferences: Preference[];
	validStudentIds: string[];
};

export type ImportWorkspacePreferencesSuccess = {
	preferences: Preference[];
	importedCount: number;
	skippedCount: number;
};

export type ImportWorkspacePreferencesError = {
	type: 'invalid_preference_input';
	message: string;
};

function normalizeStringList(values?: string[]): string[] {
	if (!values) return [];
	const unique = new Set<string>();
	for (const value of values) {
		if (typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (!trimmed) continue;
		if (unique.has(trimmed)) continue;
		unique.add(trimmed);
	}
	return Array.from(unique);
}

function normalizePreferenceEntity(preference: Preference): Preference {
	const payload = extractStudentPreference(preference);
	return {
		id: preference.id,
		programId: preference.programId,
		studentId: preference.studentId,
		payload: {
			studentId: preference.studentId,
			likeGroupIds: normalizeStringList(payload.likeGroupIds),
			avoidStudentIds: normalizeStringList(payload.avoidStudentIds),
			avoidGroupIds: normalizeStringList(payload.avoidGroupIds)
		}
	};
}

export function importWorkspacePreferences(
	deps: ImportWorkspacePreferencesDeps,
	input: ImportWorkspacePreferencesInput
): Result<ImportWorkspacePreferencesSuccess, ImportWorkspacePreferencesError> {
	if (!input.programId.trim()) {
		return err({
			type: 'invalid_preference_input',
			message: 'Program ID is required.'
		});
	}

	if (!Array.isArray(input.parsedPreferences) || !Array.isArray(input.existingPreferences)) {
		return err({
			type: 'invalid_preference_input',
			message: 'Parsed and existing preferences must be arrays.'
		});
	}

	if (!Array.isArray(input.validStudentIds) || input.validStudentIds.length === 0) {
		return err({
			type: 'invalid_preference_input',
			message: 'A non-empty valid student ID list is required.'
		});
	}

	const validStudentIds = new Set(input.validStudentIds);
	const preferencesByStudentId = new Map<string, Preference>();

	for (const existingPreference of input.existingPreferences) {
		if (existingPreference.programId !== input.programId) continue;
		preferencesByStudentId.set(
			existingPreference.studentId,
			normalizePreferenceEntity(existingPreference)
		);
	}

	let importedCount = 0;
	let skippedCount = 0;

	for (const parsedPreference of input.parsedPreferences) {
		const studentId = parsedPreference.studentId?.trim();
		if (!studentId || !validStudentIds.has(studentId)) {
			skippedCount += 1;
			continue;
		}

		const existingPreference = preferencesByStudentId.get(studentId);
		const nextPreference: Preference = {
			id: existingPreference?.id ?? deps.idGenerator.generateId(),
			programId: input.programId,
			studentId,
			payload: {
				studentId,
				likeGroupIds: normalizeStringList(parsedPreference.likeGroupIds),
				avoidStudentIds: normalizeStringList(parsedPreference.avoidStudentIds),
				avoidGroupIds: []
			}
		};

		preferencesByStudentId.set(studentId, nextPreference);
		importedCount += 1;
	}

	return ok({
		preferences: Array.from(preferencesByStudentId.values()),
		importedCount,
		skippedCount
	});
}
