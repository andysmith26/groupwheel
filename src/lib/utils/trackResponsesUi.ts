export type StudentStateFilter = 'all' | 'submitted' | 'not_submitted' | 'ignored';
export type StatusClickTarget = 'all' | 'submitted' | 'ignored' | 'unresolved';

export function getFilterForStatusTarget(target: StatusClickTarget): StudentStateFilter {
	switch (target) {
		case 'submitted':
			return 'submitted';
		case 'ignored':
			return 'ignored';
		case 'unresolved':
			return 'not_submitted';
		case 'all':
		default:
			return 'all';
	}
}

export function formatRelativeUpdatedLabel(date: Date, now: Date = new Date()): string {
	const diffMs = Math.max(0, now.getTime() - date.getTime());
	const diffSeconds = Math.floor(diffMs / 1000);

	if (diffSeconds < 45) return 'Updated just now';

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `Updated ${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	return `Updated ${diffDays}d ago`;
}

interface HeaderCollapseParams {
	currentScrollY: number;
	previousScrollY: number;
	threshold: number;
	isCollapsed: boolean;
}

export function getNextHeaderCollapseState({
	currentScrollY,
	previousScrollY,
	threshold,
	isCollapsed
}: HeaderCollapseParams): boolean {
	const scrollingDown = currentScrollY > previousScrollY;

	if (scrollingDown && currentScrollY > threshold) {
		return true;
	}

	if (!scrollingDown) {
		return false;
	}

	return isCollapsed;
}
