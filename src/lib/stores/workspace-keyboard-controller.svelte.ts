export type WorkspaceKeyboardController = ReturnType<typeof createWorkspaceKeyboardController>;

export function createWorkspaceKeyboardController() {
  const state = $state({
    pickedUpStudentId: null as string | null,
    pickedUpFromContainer: null as string | null,
    pickedUpFromIndex: 0,
    announcement: ''
  });

  const actions = {
    announce: (message: string) => {
      state.announcement = message;
    },
    pickup: (studentId: string, containerId: string, index: number) => {
      state.pickedUpStudentId = studentId;
      state.pickedUpFromContainer = containerId;
      state.pickedUpFromIndex = index;
      state.announcement = `${studentId} picked up. Use arrow keys to move, Enter to drop, Escape to cancel.`;
    },
    drop: (toContainerId: string, toIndex?: number) => {
      if (!state.pickedUpStudentId) return;

      const studentId = state.pickedUpStudentId;
      if (toContainerId === 'unassigned') {
        state.announcement = `${studentId} dropped in Unassigned.`;
      } else {
        const positionSuffix =
          typeof toIndex === 'number' ? `, position ${Math.max(0, toIndex) + 1}` : '';
        state.announcement = `${studentId} dropped in ${toContainerId}${positionSuffix}.`;
      }

      state.pickedUpStudentId = null;
      state.pickedUpFromContainer = null;
      state.pickedUpFromIndex = 0;
    },
    cancel: () => {
      if (!state.pickedUpStudentId) return;
      const studentId = state.pickedUpStudentId;
      state.announcement = `Move cancelled. ${studentId} returned to original position.`;
      state.pickedUpStudentId = null;
      state.pickedUpFromContainer = null;
      state.pickedUpFromIndex = 0;
    },
    announceMove: (toContainerId: string, toIndex: number) => {
      if (!state.pickedUpStudentId) return;

      if (toContainerId === 'unassigned') {
        state.announcement = `${state.pickedUpStudentId} moved to unassigned.`;
        return;
      }

      state.announcement = `${state.pickedUpStudentId} moved to ${toContainerId}, position ${toIndex + 1}.`;
    }
  };

  return {
    state,
    actions
  };
}
