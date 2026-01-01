import { describe, it, expect, beforeEach } from 'vitest';
import { importRosterWithMapping } from './importRosterWithMapping';
import type { RawSheetData, ColumnMapping } from '$lib/domain/import';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { isErr, isOk } from '$lib/types/result';

describe('importRosterWithMapping', () => {
	let env: ReturnType<typeof createInMemoryEnvironment>;

	beforeEach(() => {
		env = createInMemoryEnvironment();
	});

	const sampleData: RawSheetData = {
		headers: ['First Name', 'Last Name', 'Choice 1'],
		rows: [
			{ rowIndex: 2, cells: ['Alice', 'Smith', 'Art Club'] },
			{ rowIndex: 3, cells: ['Bob', 'Jones', 'Chess Club'] }
		]
	};

	const validMappings: ColumnMapping[] = [
		{ columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
		{ columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' },
		{ columnIndex: 2, headerName: 'Choice 1', mappedTo: 'choice1' }
	];

	it('imports roster successfully with valid data', async () => {
		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: validMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.studentsImported).toBe(2);
			expect(result.value.pool.name).toBe('Test Roster');
			expect(result.value.pool.memberIds).toHaveLength(2);
			expect(result.value.students).toHaveLength(2);
		}
	});

	it('fails when required firstName mapping is missing', async () => {
		const invalidMappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First Name', mappedTo: 'lastName' },
			{ columnIndex: 1, headerName: 'Last Name', mappedTo: null }
		];

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: invalidMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('MISSING_REQUIRED_MAPPINGS');
		}
	});

	it('fails when duplicate mappings exist', async () => {
		const duplicateMappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Last Name', mappedTo: 'firstName' }
		];

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: duplicateMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('DUPLICATE_MAPPINGS');
		}
	});

	it('fails when no valid rows exist', async () => {
		const emptyData: RawSheetData = {
			headers: ['First Name'],
			rows: [
				{ rowIndex: 2, cells: [''] },
				{ rowIndex: 3, cells: [''] }
			]
		};

		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' }
		];

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: emptyData,
				columnMappings: mappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.type).toBe('NO_VALID_ROWS');
		}
	});

	it('creates students in repository', async () => {
		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: validMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Check students were saved
			const studentIds = result.value.pool.memberIds;
			for (const id of studentIds) {
				const student = await env.studentRepo.getById(id);
				expect(student).not.toBeNull();
			}
		}
	});

	it('creates preferences when programId is provided', async () => {
		// First create a program
		const program = {
			id: 'test-program',
			name: 'Test Program',
			type: 'CLASS_ACTIVITY' as const,
			timeSpan: { termLabel: '2025' },
			poolIds: [],
			ownerStaffIds: ['owner-1']
		};
		await env.programRepo.save(program);

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: validMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1',
				programId: 'test-program'
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.preferencesImported).toBe(2);

			// Check preferences were saved
			const prefs = await env.preferenceRepo.listByProgramId('test-program');
			expect(prefs).toHaveLength(2);
		}
	});

	it('validates group names when validGroupNames is provided', async () => {
		const program = {
			id: 'test-program',
			name: 'Test Program',
			type: 'CLASS_ACTIVITY' as const,
			timeSpan: { termLabel: '2025' },
			poolIds: [],
			ownerStaffIds: ['owner-1']
		};
		await env.programRepo.save(program);

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: validMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1',
				programId: 'test-program',
				validGroupNames: ['Art Club'] // Only Art Club is valid
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Should have warning about Chess Club being unknown
			expect(result.value.warnings.some((w) => w.includes('Chess Club'))).toBe(true);

			// Only Alice's preference should be saved (Art Club)
			// Bob's preference (Chess Club) should not create a preference
			const prefs = await env.preferenceRepo.listByProgramId('test-program');
			expect(prefs).toHaveLength(1);
		}
	});

	it('includes warnings for invalid rows', async () => {
		const dataWithInvalidRow: RawSheetData = {
			headers: ['First Name', 'Last Name'],
			rows: [
				{ rowIndex: 2, cells: ['Alice', 'Smith'] },
				{ rowIndex: 3, cells: ['', 'NoFirstName'] },
				{ rowIndex: 4, cells: ['Bob', 'Jones'] }
			]
		};

		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
			{ columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' }
		];

		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: dataWithInvalidRow,
				columnMappings: mappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1'
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.studentsImported).toBe(2);
			expect(result.value.warnings).toHaveLength(1);
			expect(result.value.warnings[0]).toContain('Row 3');
		}
	});

	it('stores userId for multi-tenant isolation', async () => {
		const result = await importRosterWithMapping(
			{
				poolRepo: env.poolRepo,
				studentRepo: env.studentRepo,
				preferenceRepo: env.preferenceRepo,
				idGenerator: env.idGenerator
			},
			{
				rawData: sampleData,
				columnMappings: validMappings,
				poolName: 'Test Roster',
				poolType: 'CLASS',
				ownerStaffId: 'owner-1',
				userId: 'user-123'
			}
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.pool.userId).toBe('user-123');
		}
	});
});
