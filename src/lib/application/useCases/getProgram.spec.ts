import { describe, it, expect, beforeEach } from 'vitest';
import { getProgram } from './getProgram';
import type { GetProgramError, GetProgramInput } from './getProgram';
import { InMemoryProgramRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryProgramRepository';
import { InMemoryPoolRepository } from '$lib/infrastructure/repositories/inMemory/InMemoryPoolRepository';
import { createPool } from '$lib/domain/pool';
import { createProgram } from '$lib/domain/program';

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

describe('getProgram', () => {
	let programRepo: InMemoryProgramRepository;
	let poolRepo: InMemoryPoolRepository;

	beforeEach(() => {
		programRepo = new InMemoryProgramRepository();
		poolRepo = new InMemoryPoolRepository();
	});

	describe('success cases', () => {
		it('should retrieve a program with its pools', async () => {
			const pool1 = createPool({
				id: 'pool-1',
				name: 'Grade 10',
				type: 'GRADE',
				memberIds: ['student-1', 'student-2']
			});

			const pool2 = createPool({
				id: 'pool-2',
				name: 'Grade 11',
				type: 'GRADE',
				memberIds: ['student-3', 'student-4']
			});

			await poolRepo.save(pool1);
			await poolRepo.save(pool2);

			const program = createProgram({
				id: 'program-1',
				name: 'Summer Camp',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Summer 2024' },
				poolIds: [pool1.id, pool2.id],
				primaryPoolId: pool1.id
			});

			await programRepo.save(program);

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo, poolRepo }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.program.id).toBe('program-1');
				expect(result.value.program.name).toBe('Summer Camp');
				expect(result.value.pools).toHaveLength(2);
				expect(result.value.pools[0].id).toBe('pool-1');
				expect(result.value.pools[1].id).toBe('pool-2');
			}
		});

		it('should retrieve a program with a single pool', async () => {
			const pool = createPool({
				id: 'pool-1',
				name: 'Grade 10',
				type: 'GRADE',
				memberIds: ['student-1']
			});

			await poolRepo.save(pool);

			const program = createProgram({
				id: 'program-1',
				name: 'Advisory',
				type: 'ADVISORY',
				timeSpan: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
				poolIds: [pool.id]
			});

			await programRepo.save(program);

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo, poolRepo }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.pools).toHaveLength(1);
				expect(result.value.pools[0].name).toBe('Grade 10');
			}
		});
	});

	describe('error cases', () => {
		it('should fail when program does not exist', async () => {
			const input: GetProgramInput = { programId: 'nonexistent-program' };
			const result = await getProgram({ programRepo, poolRepo }, input);

			const error = expectErrType<GetProgramError, 'PROGRAM_NOT_FOUND'>(
				result,
				'PROGRAM_NOT_FOUND'
			);
			expect(error.programId).toBe('nonexistent-program');
		});

		it('should fail when a referenced pool does not exist', async () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Fall 2024' },
				poolIds: ['pool-1', 'nonexistent-pool']
			});

			await programRepo.save(program);

			const pool1 = createPool({
				id: 'pool-1',
				name: 'Pool 1',
				type: 'GRADE',
				memberIds: []
			});

			await poolRepo.save(pool1);

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo, poolRepo }, input);

			const error = expectErrType<GetProgramError, 'POOL_NOT_FOUND'>(result, 'POOL_NOT_FOUND');
			expect(error.poolId).toBe('nonexistent-pool');
		});

		it('should handle program repository lookup errors', async () => {
			const failingProgramRepo = new InMemoryProgramRepository();
			failingProgramRepo.getById = async () => {
				throw new Error('Database connection failed');
			};

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo: failingProgramRepo, poolRepo }, input);

			const error = expectErrType<GetProgramError, 'PROGRAM_LOOKUP_FAILED'>(
				result,
				'PROGRAM_LOOKUP_FAILED'
			);
			expect(error.message).toContain('Database connection failed');
		});

		it('should handle pool repository lookup errors', async () => {
			const program = createProgram({
				id: 'program-1',
				name: 'Test Program',
				type: 'CLUBS',
				timeSpan: { termLabel: 'Fall 2024' },
				poolIds: ['pool-1']
			});

			await programRepo.save(program);

			const failingPoolRepo = new InMemoryPoolRepository();
			failingPoolRepo.getById = async () => {
				throw new Error('Pool fetch error');
			};

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo, poolRepo: failingPoolRepo }, input);

			const error = expectErrType<GetProgramError, 'POOL_LOOKUP_FAILED'>(
				result,
				'POOL_LOOKUP_FAILED'
			);
			expect(error.message).toContain('Pool fetch error');
		});
	});

	describe('edge cases', () => {
		it('should handle programs with many pools', async () => {
			const pools = [];
			const poolIds = [];

			for (let i = 1; i <= 10; i++) {
				const pool = createPool({
					id: `pool-${i}`,
					name: `Pool ${i}`,
					type: 'CLASS',
					memberIds: [`student-${i}`]
				});
				pools.push(pool);
				poolIds.push(pool.id);
				await poolRepo.save(pool);
			}

			const program = createProgram({
				id: 'program-1',
				name: 'Large Program',
				type: 'OTHER',
				timeSpan: { termLabel: 'Year 2024' },
				poolIds
			});

			await programRepo.save(program);

			const input: GetProgramInput = { programId: 'program-1' };
			const result = await getProgram({ programRepo, poolRepo }, input);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.value.pools).toHaveLength(10);
				expect(result.value.pools.map((p) => p.id)).toEqual(poolIds);
			}
		});
	});
});
