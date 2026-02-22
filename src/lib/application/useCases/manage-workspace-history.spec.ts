import { describe, expect, it } from 'vitest';
import { smallGroups } from '$lib/test-utils/fixtures';
import type { ScenarioSatisfaction } from '$lib/domain';
import {
  createWorkspaceHistoryEntry,
  insertWorkspaceHistoryEntry,
  selectWorkspaceHistoryEntry,
  type WorkspaceHistoryEntry,
  type WorkspaceHistoryState
} from './manage-workspace-history';

const analytics: ScenarioSatisfaction = {
  percentAssignedTopChoice: 75,
  averagePreferenceRankAssigned: 1.5,
  percentAssignedTop2: 100
};

function makeEntry(id: string, suffix: string): WorkspaceHistoryEntry {
  const groups = smallGroups.map((group) => ({
    ...group,
    name: `${group.name}-${suffix}`
  }));
  const created = createWorkspaceHistoryEntry({
    id,
    groups,
    generatedAt: new Date('2026-01-01T00:00:00Z'),
    analytics
  });
  if (created.status !== 'ok') {
    throw new Error('Expected history entry creation to succeed');
  }
  return created.value;
}

describe('manageWorkspaceHistory', () => {
  it('creates bounded history and resets cursor to current', () => {
    let state: WorkspaceHistoryState = { entries: [], currentIndex: -1, savedCurrentGroups: null };

    for (const [idx, suffix] of ['a', 'b', 'c', 'd'].entries()) {
      const inserted = insertWorkspaceHistoryEntry({
        state,
        entry: makeEntry(`entry-${idx}`, suffix),
        maxEntries: 3
      });
      if (inserted.status !== 'ok') {
        throw new Error('Expected ok result');
      }
      state = inserted.value;
    }

    expect(state.entries).toHaveLength(3);
    expect(state.entries.map((entry) => entry.id)).toEqual(['entry-3', 'entry-2', 'entry-1']);
    expect(state.currentIndex).toBe(-1);
    expect(state.savedCurrentGroups).toBeNull();
  });

  it('captures current groups once when entering history and returns selected groups', () => {
    const state: WorkspaceHistoryState = {
      entries: [makeEntry('entry-1', 'x'), makeEntry('entry-2', 'y')],
      currentIndex: -1,
      savedCurrentGroups: null
    };

    const currentGroups = smallGroups.map((group) => ({ ...group, name: `${group.name}-current` }));
    const selected = selectWorkspaceHistoryEntry({
      state,
      index: 1,
      currentGroups
    });

    if (selected.status !== 'ok') {
      throw new Error('Expected ok result');
    }

    expect(selected.value.state.currentIndex).toBe(1);
    expect(selected.value.state.savedCurrentGroups).toEqual(currentGroups);
    expect(selected.value.groupsToApply?.map((group) => group.id)).toEqual(
      state.entries[1].groups.map((group) => group.id)
    );
  });

  it('returns to current groups when selecting index -1 from history mode', () => {
    const saved = smallGroups.map((group) => ({ ...group, name: `${group.name}-saved` }));
    const state: WorkspaceHistoryState = {
      entries: [makeEntry('entry-1', 'x')],
      currentIndex: 0,
      savedCurrentGroups: saved
    };

    const selected = selectWorkspaceHistoryEntry({
      state,
      index: -1,
      currentGroups: null
    });

    if (selected.status !== 'ok') {
      throw new Error('Expected ok result');
    }

    expect(selected.value.state.currentIndex).toBe(-1);
    expect(selected.value.state.savedCurrentGroups).toBeNull();
    expect(selected.value.groupsToApply).toEqual(saved);
  });

  it('ignores out-of-range history selection', () => {
    const state: WorkspaceHistoryState = {
      entries: [makeEntry('entry-1', 'x')],
      currentIndex: -1,
      savedCurrentGroups: null
    };

    const selected = selectWorkspaceHistoryEntry({
      state,
      index: 999,
      currentGroups: smallGroups
    });

    if (selected.status !== 'ok') {
      throw new Error('Expected ok result');
    }

    expect(selected.value.state).toEqual(state);
    expect(selected.value.groupsToApply).toBeNull();
  });
});
