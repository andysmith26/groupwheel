import { describe, it, expect, beforeEach } from 'vitest';
import { listPrograms } from './listPrograms';
import { InMemoryProgramRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryProgramRepository';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { createPool } from '$lib/domain/pool';
import { createProgram } from '$lib/domain/program';

describe('listPrograms', () => {
	let programRepo: InMemoryProgramRepository;
	let poolRepo: InMemoryPoolRepository;

	beforeEach(() => {
		programRepo = new InMemoryProgramRepository();
		poolRepo = new InMemoryPoolRepository();
	});

	describe('success cases', () => {
		it('should list all programs with their primary pools', async () => {
			const pool1 = createPool({
				id: 'pool-1',
				name: 'Grade 10',
				type: 'GRADE',
				memberIds: ['student-1']
			});

			const pool2 = createPool({
				id: 'pool-2',
				name: 'Grade 11',
				type: 'GRADE',
				memberIds: ['student-2']
			});

			await poolRepo.save(pool1);
			await poolRepo.save(pool2);

			const program1 = createProgram({
				id: 'program-1',
				name: 'Summer Camp',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: [pool1.id],
				primaryPoolId: pool1.id
			});

			const program2 = createProgram({
				id: 'program-2',
				name: 'Advisory',
				type: 'ADVISORY',
				timeSpan: { termLabel: 'Fall 2024' },
				poolIds: [pool2.id],
				primaryPoolId: pool2.id
			});

			await programRepo.save(program1);
			await programRepo.save(program2);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].program.id).toBe('program-1');
				expect(result.value[0].primaryPool?.id).toBe('pool-1');
				expect(result.value[1].program.id).toBe('program-2');
				expect(result.value[1].primaryPool?.id).toBe('pool-2');
			}
		});

		it('should return empty array when no programs exist', async () => {
			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toEqual([]);
			}
		});

		it('should handle programs without primary pool ID (fallback to first pool)', async () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Grade 10',
				type: 'GRADE',
				memberIds: ['student-1']
			});

			await poolRepo.save(pool);

			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: [pool.id]
				// No primaryPoolId specified
			});

			await programRepo.save(program);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value[0].primaryPool?.id).toBe('pool-1');
			}
		});

		it('should handle programs with null primary pool when pool not found', async () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['nonexistent-pool'],
				primaryPoolId: 'nonexistent-pool'
			});

			await programRepo.save(program);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value[0].primaryPool).toBeNull();
			}
		});

		it('should deduplicate pool lookups for programs sharing the same primary pool', async () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Shared Pool',
				type: 'GRADE',
				memberIds: ['student-1']
			});

			await poolRepo.save(pool);

			const program1 = createProgram({
				id: 'program-1',
				name: 'Program 1',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: [pool.id],
				primaryPoolId: pool.id
			});

			const program2 = createProgram({
				id: 'program-2',
				name: 'Program 2',
				type: 'ADVISORY',
				timeSpan: { termLabel: 'Fall 2024' },
				poolIds: [pool.id],
				primaryPoolId: pool.id
			});

			await programRepo.save(program1);
			await programRepo.save(program2);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].primaryPool?.id).toBe('pool-1');
				expect(result.value[1].primaryPool?.id).toBe('pool-1');
			}
		});
	});

	describe('error cases', () => {
		it('should handle program repository listing errors', async () => {
			const failingProgramRepo = new InMemoryProgramRepository();
			failingProgramRepo.listAll = async () => {
				throw new Error('Database connection failed');
			};

			const result = await listPrograms({ programRepo: failingProgramRepo, poolRepo });

			expect(result.status).toBe('err');
			if (result.status === 'err') {
				expect(result.error.type).toBe('PROGRAM_LIST_FAILED');
				expect(result.error.message).toContain('Database connection failed');
			}
		});

		it('should handle pool repository lookup errors', async () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: ['pool-1'],
				primaryPoolId: 'pool-1'
			});

			await programRepo.save(program);

			const failingPoolRepo = new InMemoryPoolRepository();
			failingPoolRepo.getById = async () => {
				throw new Error('Pool fetch error');
			};

			const result = await listPrograms({ programRepo, poolRepo: failingPoolRepo });

			expect(result.status).toBe('err');
			if (result.status === 'err') {
				expect(result.error.type).toBe('POOL_LOOKUP_FAILED');
				expect(result.error.message).toContain('Pool fetch error');
			}
		});
	});

	describe('edge cases', () => {
		it('should handle large number of programs', async () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Shared Pool',
				type: 'GRADE',
				memberIds: []
			});

			await poolRepo.save(pool);

			for (let i = 1; i <= 100; i++) {
				const program = createProgram({
					id: `program-${i}`,
					name: `Program ${i}`,
					type: 'CLUBS',
					timeSpan: { termLabel: `Term ${i}` },
					poolIds: [pool.id],
					primaryPoolId: pool.id
				});
				await programRepo.save(program);
			}

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value).toHaveLength(100);
			}
		});

		it('should handle programs with multiple pools but only fetch primary', async () => {
			const pool1 = createPool({
				id: 'pool-1',
				name: 'Primary Pool',
				type: 'GRADE',
				memberIds: []
			});

			const pool2 = createPool({
				id: 'pool-2',
				name: 'Secondary Pool',
				type: 'GRADE',
				memberIds: []
			});

			await poolRepo.save(pool1);
			await poolRepo.save(pool2);

			const program = createProgram({
				id: 'program-1',
				name: 'Multi-Pool Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: [pool1.id, pool2.id],
				primaryPoolId: pool1.id
			});

			await programRepo.save(program);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value[0].primaryPool?.id).toBe('pool-1');
				expect(result.value[0].primaryPool?.name).toBe('Primary Pool');
			}
		});

		it('should handle programs with empty pool IDs array', async () => {
			// This should not happen with domain validation, but test defensive handling
			const programRepo = new InMemoryProgramRepository();
			// Bypass domain validation by directly setting invalid state
			const invalidProgram = {
				id: 'program-1',
				name: 'Invalid Program',
				type: 'CLUBS' as const,
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: []
			};

			await programRepo.save(invalidProgram);

			const result = await listPrograms({ programRepo, poolRepo });

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value[0].primaryPool).toBeNull();
			}
		});
	});
});
