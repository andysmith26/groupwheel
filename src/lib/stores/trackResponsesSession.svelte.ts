import type { StudentStateFilter } from '$lib/utils/trackResponsesUi';

export type SortAlgorithm = 'random' | 'first-choice-only';

type TrackResponsesCounts = {
	total: number;
	submitted: number;
	ignored: number;
	unresolved: number;
	accountedFor: number;
	accountedForPercent: number;
};

const DEFAULT_COUNTS: TrackResponsesCounts = {
	total: 0,
	submitted: 0,
	ignored: 0,
	unresolved: 0,
	accountedFor: 0,
	accountedForPercent: 0
};

export class TrackResponsesSessionStore {
	sheetTitle = $state<string | null>(null);
	sheetUrl = $state<string | null>(null);
	isConnected = $state(false);
	canRefresh = $state(false);
	onDisconnect = $state<(() => void) | null>(null);
	onRefresh = $state<(() => void) | null>(null);

	searchQuery = $state('');
	stateFilter = $state<StudentStateFilter>('all');
	counts = $state<TrackResponsesCounts>(DEFAULT_COUNTS);

	// Sort action state
	onSort = $state<((algorithm: SortAlgorithm) => void) | null>(null);
	canSort = $state(false);
	isSorting = $state(false);

	setSession({
		sheetTitle,
		sheetUrl,
		isConnected,
		canRefresh,
		onDisconnect,
		onRefresh
	}: {
		sheetTitle: string | null;
		sheetUrl: string | null;
		isConnected: boolean;
		canRefresh: boolean;
		onDisconnect: (() => void) | null;
		onRefresh: (() => void) | null;
	}) {
		this.sheetTitle = sheetTitle;
		this.sheetUrl = sheetUrl;
		this.isConnected = isConnected;
		this.canRefresh = canRefresh;
		this.onDisconnect = onDisconnect;
		this.onRefresh = onRefresh;
	}

	setCounts(nextCounts: TrackResponsesCounts) {
		this.counts = nextCounts;
	}

	clear() {
		this.setSession({
			sheetTitle: null,
			sheetUrl: null,
			isConnected: false,
			canRefresh: false,
			onDisconnect: null,
			onRefresh: null
		});
		this.counts = DEFAULT_COUNTS;
		this.searchQuery = '';
		this.stateFilter = 'all';
		this.onSort = null;
		this.canSort = false;
		this.isSorting = false;
	}
}

export const trackResponsesSession = new TrackResponsesSessionStore();
