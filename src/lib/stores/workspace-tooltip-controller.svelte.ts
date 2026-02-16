export type WorkspaceTooltipController = ReturnType<typeof createWorkspaceTooltipController>;

export function createWorkspaceTooltipController() {
	const state = $state({
		studentId: null as string | null,
		x: 0,
		y: 0,
		dragCooldown: false
	});

	let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

	const actions = {
		show: (studentId: string, x: number, y: number) => {
			if (state.dragCooldown) return;
			state.studentId = studentId;
			state.x = x;
			state.y = y;
		},
		hide: () => {
			state.studentId = null;
		},
		startDragCooldown: (ms = 150) => {
			state.studentId = null;
			state.dragCooldown = true;

			if (cooldownTimer) {
				clearTimeout(cooldownTimer);
				cooldownTimer = null;
			}

			cooldownTimer = setTimeout(() => {
				state.dragCooldown = false;
				cooldownTimer = null;
			}, ms);
		},
		dispose: () => {
			if (cooldownTimer) {
				clearTimeout(cooldownTimer);
				cooldownTimer = null;
			}

			state.studentId = null;
			state.dragCooldown = false;
		}
	};

	return {
		state,
		actions
	};
}
