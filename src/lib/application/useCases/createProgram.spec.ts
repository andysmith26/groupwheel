import { describe, it, expect, beforeEach } from 'vitest';
import { createProgram } from './createProgram';
import type { CreateProgramError, CreateProgramInput } from './createProgram';
import { InMemoryProgramRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryProgramRepository';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { createPool } from '$lib/domain/pool';
import type { IdGenerator } from '$lib/application/ports';

function expectErrType<T extends { type: string }, K extends T['type']>(
	result: { status: 'ok'; value: unknown } | { status: 'err'; error: T },
	expectedType: K
): Extract<T, { type: K }> {
	if (result.status !== 'err') {
		throw new Error(`Expected error result but received ${result.status}`);
	}
	if (result.error.type !== expectedType) {
		throw new Error(`Expected error type ${expectedType} but received ${result.error.type}`);
	}
	return result.error as Extract<T, { type: K }>;
}

class MockIdGenerator implements IdGenerator {
	private counter = 0;
	generateId(): string {
		return `test-id-${++this.counter}`;
	}
}

describe('createProgram', () => {
	let programRepo: InMemoryProgramRepository;
	let poolRepo: InMemoryPoolRepository;
	let idGenerator: IdGenerator;
	let validPool: ReturnType<typeof createPool>;

	beforeEach(() => {
		programRepo = new InMemoryProgramRepository();
		poolRepo = new InMemoryPoolRepository();
		idGenerator = new MockIdGenerator();

		validPool = createPool({
			id: 'pool-1',
			name: 'Test Pool',
			type: 'GRADE',
			memberIds: ['student-1', 'student-2']
		});
	});

	describe('success cases', () => {
		it('should create a program with valid inputs', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: 'Summer Camp',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.name).toBe('Summer Camp');
				expect(result.value.type).toBe('CLUBS');
				expect(result.value.poolIds).toContain(validPool.id);
				expect(result.value.primaryPoolId).toBe(validPool.id);
			}
		});

		it('should create a program with owner staff IDs', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: 'Advisory Program',
				type: 'ADVISORY',
				timeSpan: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
				primaryPoolId: validPool.id,
				ownerStaffIds: ['staff-1', 'staff-2']
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.ownerStaffIds).toEqual(['staff-1', 'staff-2']);
			}
		});

		it('should create a program with school ID', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: 'School Program',
				type: 'OTHER',
				timeSpan: { termLabel: 'Fall 2024' },
				primaryPoolId: validPool.id,
				schoolId: 'school-123'
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.schoolId).toBe('school-123');
			}
		});

		it('should persist the program to the repository', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Spring 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				const saved = await programRepo.getById(result.value.id);
				expect(saved).not.toBeNull();
				expect(saved?.name).toBe('Test Program');
			}
		});
	});

	describe('validation failures', () => {
		it('should fail when program name is empty', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: '',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			const error = expectErrType<CreateProgramError, 'DOMAIN_VALIDATION_FAILED'>(
				result,
				'DOMAIN_VALIDATION_FAILED'
			);
			expect(error.message).toContain('name must not be empty');
		});

		it('should fail when program name is only whitespace', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: '   ',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			const error = expectErrType<CreateProgramError, 'DOMAIN_VALIDATION_FAILED'>(
				result,
				'DOMAIN_VALIDATION_FAILED'
			);
			expect(error.message).toContain('name must not be empty');
		});

		it('should fail when primary pool does not exist', async () => {
			const input: CreateProgramInput = {
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: 'nonexistent-pool'
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			const error = expectErrType<CreateProgramError, 'POOL_NOT_FOUND'>(result, 'POOL_NOT_FOUND');
			expect(error.poolId).toBe('nonexistent-pool');
		});
	});

	describe('error handling', () => {
		it('should handle repository save errors', async () => {
			await poolRepo.save(validPool);

			const failingProgramRepo = new InMemoryProgramRepository();
			failingProgramRepo.save = async () => {
				throw new Error('Database connection failed');
			};

			const input: CreateProgramInput = {
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram(
				{ poolRepo, programRepo: failingProgramRepo, idGenerator },
				input
			);

			const error = expectErrType<CreateProgramError, 'INTERNAL_ERROR'>(result, 'INTERNAL_ERROR');
			expect(error.message).toContain('Database connection failed');
		});
	});

	describe('edge cases', () => {
		it('should trim whitespace from program name', async () => {
			await poolRepo.save(validPool);

			const input: CreateProgramInput = {
				name: '  Trimmed Program  ',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				primaryPoolId: validPool.id
			};

			const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.name).toBe('Trimmed Program');
			}
		});

		it('should handle all program types', async () => {
			await poolRepo.save(validPool);

			const types = ['CLUBS', 'ADVISORY', 'CABINS', 'CLASS_ACTIVITY', 'OTHER'] as const;

			for (const type of types) {
				const input: CreateProgramInput = {
					name: `${type} Program`,
					type,
					timeSpan: { termLabel: 'Summer 2024' },
					primaryPoolId: validPool.id
				};

				const result = await createProgram({ poolRepo, programRepo, idGenerator }, input);

				expect(result.status).toBe('ok');
				if (result.status === 'ok') {
					expect(result.value.type).toBe(type);
				}
			}
		});
	});
});
