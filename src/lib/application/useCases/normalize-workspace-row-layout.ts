import type { Group } from '$lib/domain';
import { ok, type Result } from '$lib/types/result';

export interface WorkspaceRowLayout {
	top: string[];
	bottom: string[];
}

export interface NormalizeWorkspaceRowLayoutInput {
	groups: Group[];
	algorithmConfig: unknown;
}

export interface NormalizeWorkspaceRowLayoutOutput {
	rowLayout: WorkspaceRowLayout;
	storedRowLayout: WorkspaceRowLayout | null;
	shouldPersistConfig: boolean;
	nextAlgorithmConfig: unknown;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function parseWorkspaceRowLayoutFromConfig(config: unknown): WorkspaceRowLayout | null {
	if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
	const workspace = (config as Record<string, unknown>).workspace;
	if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) return null;
	const rowLayout = (workspace as Record<string, unknown>).rowLayout;
	if (!rowLayout || typeof rowLayout !== 'object' || Array.isArray(rowLayout)) return null;
	const top = (rowLayout as Record<string, unknown>).top;
	const bottom = (rowLayout as Record<string, unknown>).bottom;
	if (!isStringArray(top) || !isStringArray(bottom)) return null;
	return { top: [...top], bottom: [...bottom] };
}

function dedupeRowLayoutEntries(ids: string[], seen: Set<string>): string[] {
	const sanitized: string[] = [];
	for (const id of ids) {
		if (seen.has(id)) continue;
		seen.add(id);
		sanitized.push(id);
	}
	return sanitized;
}

export function computeInitialWorkspaceRowLayout(groups: Group[]): WorkspaceRowLayout {
	if (groups.length === 0) return { top: [], bottom: [] };

	const sortedBySize = [...groups].sort((a, b) => b.memberIds.length - a.memberIds.length);
	const bottomCount = Math.ceil(sortedBySize.length / 2);
	const bottomIds = new Set(sortedBySize.slice(0, bottomCount).map((group) => group.id));

	return {
		top: groups.filter((group) => !bottomIds.has(group.id)).map((group) => group.id),
		bottom: groups.filter((group) => bottomIds.has(group.id)).map((group) => group.id)
	};
}

export function normalizeWorkspaceRowLayout(
	layout: WorkspaceRowLayout,
	groups: Group[]
): WorkspaceRowLayout {
	const groupIds = new Set(groups.map((group) => group.id));
	const seen = new Set<string>();

	const top = dedupeRowLayoutEntries(
		layout.top.filter((id) => groupIds.has(id)),
		seen
	);
	const bottom = dedupeRowLayoutEntries(
		layout.bottom.filter((id) => groupIds.has(id)),
		seen
	);

	const missing = groups.filter((group) => !seen.has(group.id)).map((group) => group.id);
	const nextTop = top;
	const nextBottom = missing.length > 0 ? [...bottom, ...missing] : bottom;

	if (nextTop.length === 0 && nextBottom.length === groups.length) {
		return computeInitialWorkspaceRowLayout(groups);
	}

	if (nextBottom.length === 0 && nextTop.length === groups.length) {
		return computeInitialWorkspaceRowLayout(groups);
	}

	return {
		top: nextTop,
		bottom: nextBottom
	};
}

export function workspaceRowLayoutEquals(a: WorkspaceRowLayout, b: WorkspaceRowLayout): boolean {
	const same = (left: string[], right: string[]) =>
		left.length === right.length && left.every((value, index) => value === right[index]);
	return same(a.top, b.top) && same(a.bottom, b.bottom);
}

export function updateWorkspaceRowLayoutInConfig(
	config: unknown,
	rowLayout: WorkspaceRowLayout
): unknown {
	const base =
		config && typeof config === 'object' && !Array.isArray(config)
			? { ...(config as Record<string, unknown>) }
			: {};
	const workspace =
		base.workspace && typeof base.workspace === 'object' && !Array.isArray(base.workspace)
			? { ...(base.workspace as Record<string, unknown>) }
			: {};
	return {
		...base,
		workspace: {
			...workspace,
			rowLayout: {
				top: [...rowLayout.top],
				bottom: [...rowLayout.bottom]
			}
		}
	};
}

export function normalizeWorkspaceRowLayoutFromConfig(
	input: NormalizeWorkspaceRowLayoutInput
): Result<NormalizeWorkspaceRowLayoutOutput, never> {
	const storedRowLayout = parseWorkspaceRowLayoutFromConfig(input.algorithmConfig);
	const baseLayout = storedRowLayout ?? computeInitialWorkspaceRowLayout(input.groups);
	const rowLayout = normalizeWorkspaceRowLayout(baseLayout, input.groups);
	const shouldPersistConfig = !storedRowLayout || !workspaceRowLayoutEquals(storedRowLayout, rowLayout);
	const nextAlgorithmConfig = shouldPersistConfig
		? updateWorkspaceRowLayoutInConfig(input.algorithmConfig, rowLayout)
		: input.algorithmConfig;

	return ok({
		rowLayout,
		storedRowLayout,
		shouldPersistConfig,
		nextAlgorithmConfig
	});
}
