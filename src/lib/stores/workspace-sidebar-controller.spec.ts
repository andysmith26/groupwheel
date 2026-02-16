import { describe, expect, it } from 'vitest';
import { createWorkspaceSidebarController } from './workspace-sidebar-controller.svelte';

describe('createWorkspaceSidebarController', () => {
	it('opens sidebar for a student', () => {
		const controller = createWorkspaceSidebarController();

		controller.actions.open('student-1');

		expect(controller.state.studentId).toBe('student-1');
	});

	it('closes sidebar', () => {
		const controller = createWorkspaceSidebarController();
		controller.actions.open('student-1');

		controller.actions.close();

		expect(controller.state.studentId).toBeNull();
	});

	it('toggles sidebar selection', () => {
		const controller = createWorkspaceSidebarController();

		controller.actions.toggle('student-1');
		expect(controller.state.studentId).toBe('student-1');

		controller.actions.toggle('student-1');
		expect(controller.state.studentId).toBeNull();

		controller.actions.toggle('student-2');
		expect(controller.state.studentId).toBe('student-2');
	});
});
