import type { Group, ScenarioSatisfaction } from '$lib/domain';
import { ok, type Result } from '$lib/types/result';

export interface WorkspaceHistoryEntry {
  id: string;
  groups: Group[];
  generatedAt: Date;
  analytics: ScenarioSatisfaction;
}

export interface WorkspaceHistoryState {
  entries: WorkspaceHistoryEntry[];
  currentIndex: number;
  savedCurrentGroups: Group[] | null;
}

export interface CreateWorkspaceHistoryEntryInput {
  id: string;
  groups: Group[];
  generatedAt: Date;
  analytics: ScenarioSatisfaction;
}

export interface InsertWorkspaceHistoryEntryInput {
  state: WorkspaceHistoryState;
  entry: WorkspaceHistoryEntry;
  maxEntries: number;
}

export interface SelectWorkspaceHistoryEntryInput {
  state: WorkspaceHistoryState;
  index: number;
  currentGroups: Group[] | null;
}

export interface SelectWorkspaceHistoryEntryOutput {
  state: WorkspaceHistoryState;
  groupsToApply: Group[] | null;
}

function cloneGroups(groups: Group[]): Group[] {
  return groups.map((group) => ({
    ...group,
    memberIds: [...group.memberIds]
  }));
}

function cloneEntry(entry: WorkspaceHistoryEntry): WorkspaceHistoryEntry {
  return {
    ...entry,
    groups: cloneGroups(entry.groups),
    generatedAt: new Date(entry.generatedAt)
  };
}

function cloneState(state: WorkspaceHistoryState): WorkspaceHistoryState {
  return {
    entries: state.entries.map(cloneEntry),
    currentIndex: state.currentIndex,
    savedCurrentGroups: state.savedCurrentGroups ? cloneGroups(state.savedCurrentGroups) : null
  };
}

export function createWorkspaceHistoryEntry(
  input: CreateWorkspaceHistoryEntryInput
): Result<WorkspaceHistoryEntry, never> {
  return ok({
    id: input.id,
    groups: cloneGroups(input.groups),
    generatedAt: new Date(input.generatedAt),
    analytics: input.analytics
  });
}

export function insertWorkspaceHistoryEntry(
  input: InsertWorkspaceHistoryEntryInput
): Result<WorkspaceHistoryState, never> {
  const nextEntries = [cloneEntry(input.entry), ...input.state.entries.map(cloneEntry)].slice(
    0,
    input.maxEntries
  );

  return ok({
    entries: nextEntries,
    currentIndex: -1,
    savedCurrentGroups: null
  });
}

export function selectWorkspaceHistoryEntry(
  input: SelectWorkspaceHistoryEntryInput
): Result<SelectWorkspaceHistoryEntryOutput, never> {
  const state = cloneState(input.state);

  if (input.index === -1) {
    const groupsToApply =
      state.savedCurrentGroups && state.currentIndex !== -1
        ? cloneGroups(state.savedCurrentGroups)
        : null;
    state.currentIndex = -1;
    state.savedCurrentGroups = null;
    return ok({ state, groupsToApply });
  }

  if (input.index < 0 || input.index >= state.entries.length) {
    return ok({ state, groupsToApply: null });
  }

  if (state.currentIndex === -1 && input.currentGroups) {
    state.savedCurrentGroups = cloneGroups(input.currentGroups);
  }

  state.currentIndex = input.index;
  const groupsToApply = cloneGroups(state.entries[input.index].groups);
  return ok({ state, groupsToApply });
}
