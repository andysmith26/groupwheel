import { describe, it, expect } from 'vitest';
import {
	serializeActivityToJson,
	generateExportFilename,
	parseActivityFile,
	ACTIVITY_FILE_VERSION
} from './activityFile';
import type { ActivityExportData } from './activityFile';

function validExportData(): ActivityExportData {
	return {
		version: ACTIVITY_FILE_VERSION,
		exportedAt: '2024-09-15T10:00:00.000Z',
		activity: {
			name: 'Fall Clubs',
			type: 'CLUBS'
		},
		roster: {
			students: [
				{ id: 'alice', firstName: 'Alice', lastName: 'Smith' },
				{ id: 'bob', firstName: 'Bob', lastName: 'Jones' }
			]
		},
		preferences: [
			{
				studentId: 'alice',
				likeGroupIds: ['g1'],
				avoidStudentIds: [],
				avoidGroupIds: []
			}
		]
	};
}

describe('serializeActivityToJson', () => {
	it('should produce valid JSON', () => {
		const data = validExportData();
		const json = serializeActivityToJson(data);
		expect(() => JSON.parse(json)).not.toThrow();
	});

	it('should preserve all fields', () => {
		const data = validExportData();
		const parsed = JSON.parse(serializeActivityToJson(data));
		expect(parsed.version).toBe(ACTIVITY_FILE_VERSION);
		expect(parsed.activity.name).toBe('Fall Clubs');
		expect(parsed.roster.students).toHaveLength(2);
	});
});

describe('generateExportFilename', () => {
	it('should generate a .json filename', () => {
		const filename = generateExportFilename('Fall Clubs');
		expect(filename).toMatch(/\.json$/);
	});

	it('should sanitize activity name', () => {
		const filename = generateExportFilename('Fall Clubs 2024!');
		expect(filename).not.toContain('!');
		expect(filename).not.toContain(' ');
	});

	it('should lowercase the name', () => {
		const filename = generateExportFilename('My Activity');
		expect(filename.startsWith('my-activity')).toBe(true);
	});

	it('should limit name length', () => {
		const longName = 'A'.repeat(100);
		const filename = generateExportFilename(longName);
		// Name part is limited to 50 chars
		expect(filename.length).toBeLessThan(100);
	});

	it('should include date in filename', () => {
		const filename = generateExportFilename('Test');
		// Should contain YYYY-MM-DD pattern
		expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
	});
});

describe('parseActivityFile', () => {
	it('should parse valid activity file', () => {
		const json = JSON.stringify(validExportData());
		const result = parseActivityFile(json);

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.activity.name).toBe('Fall Clubs');
			expect(result.data.roster.students).toHaveLength(2);
		}
	});

	it('should reject invalid JSON', () => {
		const result = parseActivityFile('not json');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toBe('Invalid JSON format');
		}
	});

	it('should reject non-object JSON', () => {
		const result = parseActivityFile('"just a string"');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toBe('File must contain a JSON object');
		}
	});

	it('should reject missing version', () => {
		const data = { ...validExportData() } as Record<string, unknown>;
		delete data.version;
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('version');
		}
	});

	it('should reject future version', () => {
		const data = { ...validExportData(), version: ACTIVITY_FILE_VERSION + 1 };
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('newer than supported');
		}
	});

	it('should reject missing activity', () => {
		const data = { ...validExportData() } as Record<string, unknown>;
		delete data.activity;
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('Missing activity');
		}
	});

	it('should reject empty activity name', () => {
		const data = validExportData();
		data.activity.name = '';
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('Activity name is required');
		}
	});

	it('should reject missing roster', () => {
		const data = { ...validExportData() } as Record<string, unknown>;
		delete data.roster;
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('Missing roster');
		}
	});

	it('should reject student with missing ID', () => {
		const data = validExportData();
		data.roster.students = [{ id: '', firstName: 'Alice' }];
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('missing an ID');
		}
	});

	it('should reject student with missing firstName', () => {
		const data = validExportData();
		data.roster.students = [{ id: 'alice', firstName: '' }];
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('missing a first name');
		}
	});

	it('should accept file with scenario', () => {
		const data = validExportData();
		data.scenario = {
			groups: [{ id: 'g1', name: 'Art Club', capacity: null, memberIds: ['alice'] }]
		};
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.scenario?.groups).toHaveLength(1);
		}
	});

	it('should reject scenario with missing group name', () => {
		const data = validExportData();
		data.scenario = {
			groups: [{ id: 'g1', name: '', capacity: null, memberIds: [] }]
		};
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('missing a name');
		}
	});

	it('should default to CLASS_ACTIVITY for unknown program type', () => {
		const data = { ...validExportData() };
		(data.activity as Record<string, unknown>).type = 'UNKNOWN_TYPE';
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.activity.type).toBe('CLASS_ACTIVITY');
		}
	});

	it('should trim student names', () => {
		const data = validExportData();
		data.roster.students = [{ id: 'alice', firstName: '  Alice  ', lastName: '  Smith  ' }];
		const result = parseActivityFile(JSON.stringify(data));

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.roster.students[0].firstName).toBe('Alice');
			expect(result.data.roster.students[0].lastName).toBe('Smith');
		}
	});
});
