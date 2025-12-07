import type { Pool, Program, Student, Preference } from '$lib/domain';
import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type { StudentPreference } from '$lib/domain';

const demoStudents: Student[] = [
	{ id: 'stu-1', firstName: 'Alice', lastName: 'Anderson', gradeLevel: '5' },
	{ id: 'stu-2', firstName: 'Brandon', lastName: 'Baker', gradeLevel: '5' },
	{ id: 'stu-3', firstName: 'Carmen', lastName: 'Castillo', gradeLevel: '5' },
	{ id: 'stu-4', firstName: 'Diego', lastName: 'Diaz', gradeLevel: '5' },
	{ id: 'stu-5', firstName: 'Emi', lastName: 'Edwards', gradeLevel: '5' },
	{ id: 'stu-6', firstName: 'Farah', lastName: 'Frey', gradeLevel: '5' },
	{ id: 'stu-7', firstName: 'Gabriel', lastName: 'Garcia', gradeLevel: '5' },
	{ id: 'stu-8', firstName: 'Hannah', lastName: 'Harris', gradeLevel: '5' },
	{ id: 'stu-9', firstName: 'Isaac', lastName: 'Ivanov', gradeLevel: '5' },
	{ id: 'stu-10', firstName: 'Julia', lastName: 'Johnson', gradeLevel: '5' },
	{ id: 'stu-11', firstName: 'Kevin', lastName: 'Kim', gradeLevel: '5' },
	{ id: 'stu-12', firstName: 'Luna', lastName: 'Lopez', gradeLevel: '5' }
];

/**
 * Demo preferences that showcase the balanced grouping algorithm:
 * - Alice ↔ Brandon (mutual friends, should be grouped together)
 * - Carmen ↔ Diego (mutual friends, should be grouped together)
 * - Emi ↔ Farah ↔ Gabriel (triangle of mutual friends)
 * - Hannah ↔ Isaac (mutual friends)
 * - Julia → Kevin (one-way preference, won't guarantee grouping)
 * - Luna has no preferences
 */
const demoPreferences: Preference[] = [
	{
		id: 'pref-1',
		programId: 'program-demo',
		studentId: 'stu-1',
		payload: {
			studentId: 'stu-1',
			likeStudentIds: ['stu-2'], // Alice likes Brandon
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-2',
		programId: 'program-demo',
		studentId: 'stu-2',
		payload: {
			studentId: 'stu-2',
			likeStudentIds: ['stu-1'], // Brandon likes Alice (mutual!)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-3',
		programId: 'program-demo',
		studentId: 'stu-3',
		payload: {
			studentId: 'stu-3',
			likeStudentIds: ['stu-4'], // Carmen likes Diego
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-4',
		programId: 'program-demo',
		studentId: 'stu-4',
		payload: {
			studentId: 'stu-4',
			likeStudentIds: ['stu-3'], // Diego likes Carmen (mutual!)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-5',
		programId: 'program-demo',
		studentId: 'stu-5',
		payload: {
			studentId: 'stu-5',
			likeStudentIds: ['stu-6', 'stu-7'], // Emi likes Farah and Gabriel
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-6',
		programId: 'program-demo',
		studentId: 'stu-6',
		payload: {
			studentId: 'stu-6',
			likeStudentIds: ['stu-5', 'stu-7'], // Farah likes Emi and Gabriel (mutual with Emi!)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-7',
		programId: 'program-demo',
		studentId: 'stu-7',
		payload: {
			studentId: 'stu-7',
			likeStudentIds: ['stu-5', 'stu-6'], // Gabriel likes Emi and Farah (mutual with both!)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-8',
		programId: 'program-demo',
		studentId: 'stu-8',
		payload: {
			studentId: 'stu-8',
			likeStudentIds: ['stu-9'], // Hannah likes Isaac
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-9',
		programId: 'program-demo',
		studentId: 'stu-9',
		payload: {
			studentId: 'stu-9',
			likeStudentIds: ['stu-8'], // Isaac likes Hannah (mutual!)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-10',
		programId: 'program-demo',
		studentId: 'stu-10',
		payload: {
			studentId: 'stu-10',
			likeStudentIds: ['stu-11'], // Julia likes Kevin (one-way)
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-11',
		programId: 'program-demo',
		studentId: 'stu-11',
		payload: {
			studentId: 'stu-11',
			likeStudentIds: [], // Kevin has no preferences
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	},
	{
		id: 'pref-12',
		programId: 'program-demo',
		studentId: 'stu-12',
		payload: {
			studentId: 'stu-12',
			likeStudentIds: [], // Luna has no preferences
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		} satisfies StudentPreference
	}
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
 * Includes students, pool, program, and preferences that showcase the
 * balanced grouping algorithm.
 */
export async function seedDemoData(
	env: InMemoryEnvironment
): Promise<{ program: Program; pool: Pool }> {
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

	// Seed preferences for the demo program
	const existingPreferences = await env.preferenceRepo.listByProgramId(demoProgram.id);
	if (existingPreferences.length === 0) {
		// Cast to any to access setForProgram which exists on InMemoryPreferenceRepository
		(env.preferenceRepo as any).setForProgram(demoProgram.id, demoPreferences);
	}

	const program = (await env.programRepo.getById(demoProgram.id)) ?? demoProgram;
	const pool = (await env.poolRepo.getById(demoPool.id)) ?? demoPool;

	return { program, pool };
}
