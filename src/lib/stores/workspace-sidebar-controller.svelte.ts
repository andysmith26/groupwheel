export type WorkspaceSidebarController = ReturnType<typeof createWorkspaceSidebarController>;

export function createWorkspaceSidebarController() {
  const state = $state({
    studentId: null as string | null
  });

  const actions = {
    open: (studentId: string) => {
      state.studentId = studentId;
    },
    close: () => {
      state.studentId = null;
    },
    toggle: (studentId: string) => {
      state.studentId = state.studentId === studentId ? null : studentId;
    }
  };

  return {
    state,
    actions
  };
}
