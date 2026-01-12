/**
 * Activity File Export/Import Utilities
 *
 * Functions for exporting activity data to JSON files and parsing imported files.
 * Enables sharing activities between users via file transfer.
 *
 * @module utils/activityFile
 */

import type { ProgramType } from '$lib/domain/program';

// =============================================================================
// Export Data Schema
// =============================================================================

/**
 * Schema version for the export format.
 * Increment when making breaking changes to the schema.
 */
export const ACTIVITY_FILE_VERSION = 1;

/**
 * Student data for export (subset of domain Student).
 */
export interface ExportedStudent {
	id: string;
	firstName: string;
	lastName?: string;
	gradeLevel?: string;
	gender?: string;
	meta?: Record<string, unknown>;
}

/**
 * Preference data for export.
 */
export interface ExportedPreference {
	studentId: string;
	likeGroupIds: string[];
	avoidStudentIds: string[];
	avoidGroupIds: string[];
}

/**
 * Group data for export.
 * Note: capacity uses null (not undefined) to match domain Group type.
 */
export interface ExportedGroup {
	id: string;
	name: string;
	capacity: number | null;
	memberIds: string[];
}

/**
 * Scenario data for export (optional - activity may not have groups yet).
 */
export interface ExportedScenario {
	groups: ExportedGroup[];
	algorithmConfig?: unknown;
}

/**
 * Complete activity export data structure.
 */
export interface ActivityExportData {
	version: number;
	exportedAt: string; // ISO date string
	activity: {
		name: string;
		type: ProgramType;
	};
	roster: {
		students: ExportedStudent[];
	};
	preferences: ExportedPreference[];
	scenario?: ExportedScenario;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Serialize activity data to JSON string.
 */
export function serializeActivityToJson(data: ActivityExportData): string {
	return JSON.stringify(data, null, 2);
}

/**
 * Generate a filename for the exported activity.
 * Format: {activity-name}-{YYYY-MM-DD}-{HHMMSS}.json
 */
export function generateExportFilename(activityName: string): string {
	const now = new Date();

	// Format date as YYYY-MM-DD
	const date = now.toISOString().split('T')[0];

	// Format time as HHMMSS (no colons for filesystem compatibility)
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');
	const time = `${hours}${minutes}${seconds}`;

	// Sanitize activity name for filename
	const safeName = activityName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50); // Limit length

	return `${safeName}-${date}-${time}.json`;
}

/**
 * Download activity data as a JSON file.
 * Creates a temporary anchor element to trigger browser download.
 */
export function downloadActivityFile(data: ActivityExportData, filename: string): void {
	const json = serializeActivityToJson(data);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = 'none';

	document.body.appendChild(anchor);
	anchor.click();

	// Cleanup
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/**
 * Download a full-page screenshot of the current document as a PNG.
 */
export async function downloadActivityScreenshot(filename: string): Promise<boolean> {
	try {
		const { toBlob } = await import('html-to-image');
		const page = document.documentElement;
		const blob = await toBlob(page, {
			backgroundColor: '#ffffff',
			width: page.scrollWidth,
			height: page.scrollHeight
		});

		if (!blob) return false;

		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.style.display = 'none';
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
		return true;
	} catch {
		return false;
	}
}

// =============================================================================
// Import/Validation Functions
// =============================================================================

/**
 * Validation result for imported activity data.
 */
export type ActivityFileValidation =
	| { valid: true; data: ActivityExportData }
	| { valid: false; error: string };

/**
 * Parse and validate an activity file's JSON content.
 */
export function parseActivityFile(jsonString: string): ActivityFileValidation {
	let parsed: unknown;

	try {
		parsed = JSON.parse(jsonString);
	} catch {
		return { valid: false, error: 'Invalid JSON format' };
	}

	if (!parsed || typeof parsed !== 'object') {
		return { valid: false, error: 'File must contain a JSON object' };
	}

	const data = parsed as Record<string, unknown>;

	// Check version
	if (typeof data.version !== 'number') {
		return { valid: false, error: 'Missing or invalid version field' };
	}

	if (data.version > ACTIVITY_FILE_VERSION) {
		return {
			valid: false,
			error: `File version ${data.version} is newer than supported version ${ACTIVITY_FILE_VERSION}. Please update Groupwheel.`
		};
	}

	// Check required fields
	if (!data.activity || typeof data.activity !== 'object') {
		return { valid: false, error: 'Missing activity information' };
	}

	const activity = data.activity as Record<string, unknown>;
	if (typeof activity.name !== 'string' || !activity.name.trim()) {
		return { valid: false, error: 'Activity name is required' };
	}

	if (!data.roster || typeof data.roster !== 'object') {
		return { valid: false, error: 'Missing roster information' };
	}

	const roster = data.roster as Record<string, unknown>;
	if (!Array.isArray(roster.students)) {
		return { valid: false, error: 'Missing students array' };
	}

	// Validate students
	for (let i = 0; i < roster.students.length; i++) {
		const student = roster.students[i];
		if (!student || typeof student !== 'object') {
			return { valid: false, error: `Invalid student at index ${i}` };
		}
		const s = student as Record<string, unknown>;
		if (typeof s.id !== 'string' || !s.id.trim()) {
			return { valid: false, error: `Student at index ${i} is missing an ID` };
		}
		if (typeof s.firstName !== 'string' || !s.firstName.trim()) {
			return { valid: false, error: `Student at index ${i} is missing a first name` };
		}
	}

	// Validate preferences (optional but must be array if present)
	if (data.preferences !== undefined && !Array.isArray(data.preferences)) {
		return { valid: false, error: 'Preferences must be an array' };
	}

	// Validate scenario if present
	if (data.scenario !== undefined) {
		if (typeof data.scenario !== 'object' || data.scenario === null) {
			return { valid: false, error: 'Invalid scenario format' };
		}
		const scenario = data.scenario as Record<string, unknown>;
		if (!Array.isArray(scenario.groups)) {
			return { valid: false, error: 'Scenario must have a groups array' };
		}

		// Validate groups
		for (let i = 0; i < scenario.groups.length; i++) {
			const group = scenario.groups[i];
			if (!group || typeof group !== 'object') {
				return { valid: false, error: `Invalid group at index ${i}` };
			}
			const g = group as Record<string, unknown>;
			if (typeof g.name !== 'string' || !g.name.trim()) {
				return { valid: false, error: `Group at index ${i} is missing a name` };
			}
			if (!Array.isArray(g.memberIds)) {
				return { valid: false, error: `Group at index ${i} is missing memberIds array` };
			}
		}
	}

	// Construct validated data
	const validatedData: ActivityExportData = {
		version: data.version as number,
		exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
		activity: {
			name: (activity.name as string).trim(),
			type: isValidProgramType(activity.type) ? activity.type : 'CLASS_ACTIVITY'
		},
		roster: {
			students: (roster.students as Record<string, unknown>[]).map((s) => ({
				id: (s.id as string).trim(),
				firstName: (s.firstName as string).trim(),
				lastName: typeof s.lastName === 'string' ? s.lastName.trim() : undefined,
				gradeLevel: typeof s.gradeLevel === 'string' ? s.gradeLevel.trim() : undefined,
				gender: typeof s.gender === 'string' ? s.gender.trim() : undefined,
				meta: s.meta && typeof s.meta === 'object' ? (s.meta as Record<string, unknown>) : undefined
			}))
		},
		preferences: Array.isArray(data.preferences)
			? (data.preferences as Record<string, unknown>[]).map((p) => ({
					studentId: typeof p.studentId === 'string' ? p.studentId : '',
					likeGroupIds: Array.isArray(p.likeGroupIds) ? (p.likeGroupIds as string[]) : [],
					avoidStudentIds: Array.isArray(p.avoidStudentIds) ? (p.avoidStudentIds as string[]) : [],
					avoidGroupIds: Array.isArray(p.avoidGroupIds) ? (p.avoidGroupIds as string[]) : []
				}))
			: []
	};

	// Add scenario if present
	if (data.scenario) {
		const scenario = data.scenario as Record<string, unknown>;
		validatedData.scenario = {
			groups: (scenario.groups as Record<string, unknown>[]).map((g) => ({
				id: typeof g.id === 'string' ? g.id : `group-${Math.random().toString(36).slice(2, 8)}`,
				name: (g.name as string).trim(),
				capacity: typeof g.capacity === 'number' ? g.capacity : null,
				memberIds: (g.memberIds as string[]).filter((id) => typeof id === 'string')
			})),
			algorithmConfig: scenario.algorithmConfig
		};
	}

	return { valid: true, data: validatedData };
}

/**
 * Type guard for valid ProgramType values.
 */
function isValidProgramType(value: unknown): value is ProgramType {
	return (
		value === 'CLUBS' ||
		value === 'ADVISORY' ||
		value === 'CABINS' ||
		value === 'CLASS_ACTIVITY' ||
		value === 'OTHER'
	);
}

/**
 * Read a File object and return its contents as a string.
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
			} else {
				reject(new Error('Failed to read file as text'));
			}
		};
		reader.onerror = () => reject(new Error('File read error'));
		reader.readAsText(file);
	});
}
