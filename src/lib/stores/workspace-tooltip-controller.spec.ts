import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkspaceTooltipController } from './workspace-tooltip-controller.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('createWorkspaceTooltipController', () => {
	it('shows and hides tooltip state', () => {
		const controller = createWorkspaceTooltipController();

		controller.actions.show('student-1', 120, 240);
		expect(controller.state.studentId).toBe('student-1');
		expect(controller.state.x).toBe(120);
		expect(controller.state.y).toBe(240);

		controller.actions.hide();
		expect(controller.state.studentId).toBeNull();
	});

	it('suppresses tooltip during drag cooldown and restores after timeout', async () => {
		const controller = createWorkspaceTooltipController();

		controller.actions.startDragCooldown(150);
		expect(controller.state.dragCooldown).toBe(true);

		controller.actions.show('student-2', 10, 20);
		expect(controller.state.studentId).toBeNull();

		await vi.advanceTimersByTimeAsync(150);
		expect(controller.state.dragCooldown).toBe(false);

		controller.actions.show('student-2', 10, 20);
		expect(controller.state.studentId).toBe('student-2');
	});

	it('cleans cooldown timer on dispose', () => {
		const controller = createWorkspaceTooltipController();

		controller.actions.show('student-3', 1, 2);
		controller.actions.startDragCooldown(300);
		controller.actions.dispose();

		expect(controller.state.studentId).toBeNull();
		expect(controller.state.dragCooldown).toBe(false);
	});
});
