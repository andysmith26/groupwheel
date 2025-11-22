import type { PoolRepository, ProgramRepository } from '$lib/application/ports';
import type { Pool, Program } from '$lib/domain';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export interface ProgramWithPrimaryPool {
        program: Program;
        primaryPool: Pool | null;
}

export type ListProgramsError =
        | { type: 'PROGRAM_LIST_FAILED'; message: string }
        | { type: 'POOL_LOOKUP_FAILED'; message: string };

function getPrimaryPoolId(program: Program): string | null {
        return program.primaryPoolId ?? program.poolIds[0] ?? null;
}

export async function listPrograms(
        deps: { programRepo: ProgramRepository; poolRepo: PoolRepository }
): Promise<Result<ProgramWithPrimaryPool[], ListProgramsError>> {
        let programs: Program[];
        try {
                programs = await deps.programRepo.listAll();
        } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown program listing error';
                return err({ type: 'PROGRAM_LIST_FAILED', message });
        }

        const primaryPoolIds = new Set<string>();
        for (const program of programs) {
                const primaryPoolId = getPrimaryPoolId(program);
                if (primaryPoolId) {
                        primaryPoolIds.add(primaryPoolId);
                }
        }

        let poolsById: Record<string, Pool | null> = {};
        try {
                const poolEntries = await Promise.all(
                        Array.from(primaryPoolIds).map(async (id) => {
                                const pool = await deps.poolRepo.getById(id);
                                return [id, pool as Pool | null] as const;
                        })
                );
                poolsById = Object.fromEntries(poolEntries);
        } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown pool lookup error';
                return err({ type: 'POOL_LOOKUP_FAILED', message });
        }

        return ok(
                programs.map((program) => ({
                        program,
                        primaryPool: poolsById[getPrimaryPoolId(program) ?? ''] ?? null
                }))
        );
}
