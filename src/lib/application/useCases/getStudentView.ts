import type { Group, Student } from '$lib/domain';
import type { ScenarioRepository, StudentRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export interface GetStudentViewInput {
	scenarioId: string;
	/**
	 * Optional studentId. If provided, the view can highlight or focus
	 * on that student's group membership.
	 */
	studentId?: string;
}

export interface MinimalStudent {
	id: string;
	firstName: string;
	lastName?: string;
	gradeLevel?: string;
}

export interface GroupView {
	id: string;
	name: string;
	capacity: number | null;
	members: MinimalStudent[];
}

/**
 * View model for the student-facing / teacher-presented view.
 */
export interface StudentViewData {
	scenarioId: string;
	programId: string;
	groups: GroupView[];
	/**
	 * If a studentId was provided, this is that student's group(s),
	 * otherwise it can be empty.
	 */
	highlightedStudentGroups: GroupView[];
}

/**
 * Failure modes for constructing the student view.
 */
export type GetStudentViewError =
	| { type: 'SCENARIO_NOT_FOUND'; scenarioId: string }
	| { type: 'STUDENT_NOT_FOUND'; studentId: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * MVP use case: build a read-only view of a Scenario suitable for teacher or student display.
 *
 * From docs/use_cases.md:
 * - Read-only; no auth in MVP.
 * - Shows groups, group names, and members.
 * - If called with a studentId, should show which group(s) they are in.
 */
export async function getStudentView(
	deps: {
		scenarioRepo: ScenarioRepository;
		studentRepo: StudentRepository;
	},
	input: GetStudentViewInput
): Promise<Result<StudentViewData, GetStudentViewError>> {
	const scenario = await deps.scenarioRepo.getById(input.scenarioId);
	if (!scenario) {
		return err({
			type: 'SCENARIO_NOT_FOUND',
			scenarioId: input.scenarioId
		});
	}

	try {
		// Load all students referenced by the participant snapshot.
		const students = await deps.studentRepo.getByIds(scenario.participantSnapshot);

		const studentsById = new Map<string, Student>();
		for (const s of students) {
			studentsById.set(s.id, s);
		}

		// If a specific studentId is provided, ensure it exists.
		if (input.studentId && !studentsById.has(input.studentId)) {
			return err({
				type: 'STUDENT_NOT_FOUND',
				studentId: input.studentId
			});
		}

		const groups: GroupView[] = scenario.groups.map((group: Group) => {
			const members: MinimalStudent[] = group.memberIds
				.map((id) => studentsById.get(id))
				.filter((s): s is Student => !!s)
				.map((s) => ({
					id: s.id,
					firstName: s.firstName,
					lastName: s.lastName,
					gradeLevel: s.gradeLevel
				}));

			return {
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				members
			};
		});

		let highlightedStudentGroups: GroupView[] = [];
		if (input.studentId) {
			highlightedStudentGroups = groups.filter((g) =>
				g.members.some((m) => m.id === input.studentId)
			);
		}

		const view: StudentViewData = {
			scenarioId: scenario.id,
			programId: scenario.programId,
			groups,
			highlightedStudentGroups
		};

		return ok(view);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error building student view';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}
}
