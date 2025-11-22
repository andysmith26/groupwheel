import type { PoolRepository, ProgramRepository } from '$lib/application/ports';
import type { Pool, Program } from '$lib/domain';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export interface GetProgramInput {
        programId: string;
}

export interface ProgramWithPools {
        program: Program;
        pools: Pool[];
}

export type GetProgramError =
        | { type: 'PROGRAM_LOOKUP_FAILED'; message: string }
        | { type: 'PROGRAM_NOT_FOUND'; programId: string }
        | { type: 'POOL_LOOKUP_FAILED'; message: string }
        | { type: 'POOL_NOT_FOUND'; poolId: string };

export async function getProgram(
        deps: { programRepo: ProgramRepository; poolRepo: PoolRepository },
        input: GetProgramInput
): Promise<Result<ProgramWithPools, GetProgramError>> {
        let program: Program | null = null;
        try {
                program = await deps.programRepo.getById(input.programId);
        } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown program lookup error';
                return err({ type: 'PROGRAM_LOOKUP_FAILED', message });
        }

        if (!program) {
                return err({ type: 'PROGRAM_NOT_FOUND', programId: input.programId });
        }

        try {
                const pools: Pool[] = [];
                for (const poolId of program.poolIds) {
                        const pool = await deps.poolRepo.getById(poolId);
                        if (!pool) {
                                return err({ type: 'POOL_NOT_FOUND', poolId });
                        }
                        pools.push(pool);
                }

                return ok({ program, pools });
        } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown pool lookup error';
                return err({ type: 'POOL_LOOKUP_FAILED', message });
        }
}
