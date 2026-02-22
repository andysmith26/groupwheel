import { describe, expect, it } from 'vitest';
import { createWorkspaceKeyboardController } from './workspace-keyboard-controller.svelte';

describe('createWorkspaceKeyboardController', () => {
  it('tracks pickup state and announcement', () => {
    const controller = createWorkspaceKeyboardController();

    controller.actions.pickup('student-1', 'group-1', 2);

    expect(controller.state.pickedUpStudentId).toBe('student-1');
    expect(controller.state.pickedUpFromContainer).toBe('group-1');
    expect(controller.state.pickedUpFromIndex).toBe(2);
    expect(controller.state.announcement).toContain('student-1 picked up');
  });

  it('drops and clears pickup state with announcement', () => {
    const controller = createWorkspaceKeyboardController();
    controller.actions.pickup('student-2', 'group-2', 0);

    controller.actions.drop('group-3', 1);

    expect(controller.state.pickedUpStudentId).toBeNull();
    expect(controller.state.pickedUpFromContainer).toBeNull();
    expect(controller.state.pickedUpFromIndex).toBe(0);
    expect(controller.state.announcement).toBe('student-2 dropped in group-3, position 2.');
  });

  it('cancels and clears pickup state with announcement', () => {
    const controller = createWorkspaceKeyboardController();
    controller.actions.pickup('student-3', 'unassigned', 0);

    controller.actions.cancel();

    expect(controller.state.pickedUpStudentId).toBeNull();
    expect(controller.state.pickedUpFromContainer).toBeNull();
    expect(controller.state.pickedUpFromIndex).toBe(0);
    expect(controller.state.announcement).toBe(
      'Move cancelled. student-3 returned to original position.'
    );
  });
});
