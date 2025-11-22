import type { Pool, Program, Student } from '$lib/domain';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';

const demoStudents: Student[] = [
        { id: 'stu-1', firstName: 'Alice', lastName: 'Anderson', gradeLevel: '5' },
        { id: 'stu-2', firstName: 'Brandon', lastName: 'Baker', gradeLevel: '5' },
        { id: 'stu-3', firstName: 'Carmen', lastName: 'Castillo', gradeLevel: '5' },
        { id: 'stu-4', firstName: 'Diego', lastName: 'Diaz', gradeLevel: '5' },
        { id: 'stu-5', firstName: 'Emi', lastName: 'Edwards', gradeLevel: '5' },
        { id: 'stu-6', firstName: 'Farah', lastName: 'Frey', gradeLevel: '5' }
];

const demoPool: Pool = {
        id: 'pool-demo',
        name: 'Sample Class Pool',
        type: 'CLASS',
        memberIds: demoStudents.map((student) => student.id),
        status: 'ACTIVE',
        primaryStaffOwnerId: 'owner-1',
        source: 'MANUAL'
};

const demoProgram: Program = {
        id: 'program-demo',
        name: 'Friend Hat Demo',
        type: 'CLASS_ACTIVITY',
        timeSpan: { termLabel: 'Spring 2025' },
        poolIds: [demoPool.id],
        primaryPoolId: demoPool.id,
        ownerStaffIds: ['owner-1']
};

/**
 * Seed the in-memory environment with demo-friendly data so developers
 * can immediately interact with the UI without running a roster import.
 */
export async function seedDemoData(env: InMemoryEnvironment): Promise<{ program: Program; pool: Pool }> {
        const existingProgram = await env.programRepo.getById(demoProgram.id);
        const existingPool = await env.poolRepo.getById(demoPool.id);

        // Always ensure students exist before saving a pool/program.
        await env.studentRepo.saveMany(demoStudents);

        if (!existingPool) {
                await env.poolRepo.save(demoPool);
        }

        if (!existingProgram) {
                await env.programRepo.save(demoProgram);
        }

        const program = (await env.programRepo.getById(demoProgram.id)) ?? demoProgram;
        const pool = (await env.poolRepo.getById(demoPool.id)) ?? demoPool;

        return { program, pool };
}
