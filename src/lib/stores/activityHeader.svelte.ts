export class ActivityHeaderStore {
	name = $state<string | null>(null);

	setName(value: string | null) {
		const trimmed = value?.trim();
		this.name = trimmed ? trimmed : null;
	}

	clear() {
		this.name = null;
	}
}

export const activityHeader = new ActivityHeaderStore();
