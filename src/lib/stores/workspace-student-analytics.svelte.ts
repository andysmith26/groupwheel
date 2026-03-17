import type { Student, StudentPreference } from '$lib/domain';
import type { ScenarioEditingView } from '$lib/stores/scenarioEditingStore';
import type { PairingStat } from '$lib/services/appEnvUseCases';

export interface WorkspaceStudentAnalyticsDeps {
  getView: () => ScenarioEditingView | null;
  getStudents: () => Student[];
  getPreferenceMap: () => Record<string, StudentPreference>;
  getPairingStats: () => PairingStat[];
  getActiveStudentId: () => string | null;
}

export function createWorkspaceStudentAnalytics(deps: WorkspaceStudentAnalyticsDeps) {
  let activeStudentPreferences = $derived.by(() => {
    const activeStudentId = deps.getActiveStudentId();
    const view = deps.getView();
    if (!activeStudentId || !view) return null;
    const groupNamePrefs = deps.getPreferenceMap()[activeStudentId]?.likeGroupIds ?? null;
    if (!groupNamePrefs || groupNamePrefs.length === 0) return null;

    const nameToId = new Map(view.groups.map((g) => [g.name, g.id]));
    const groupIdPrefs = groupNamePrefs
      .map((name) => nameToId.get(name))
      .filter((id): id is string => id !== undefined);

    return groupIdPrefs.length > 0 ? groupIdPrefs : null;
  });

  let studentPreferenceRanks = $derived.by(() => {
    const view = deps.getView();
    const preferenceMap = deps.getPreferenceMap();
    if (!view) return new Map<string, number | null>();
    const ranks = new Map<string, number | null>();

    for (const group of view.groups) {
      for (const studentId of group.memberIds) {
        const prefs = preferenceMap[studentId]?.likeGroupIds;
        if (!prefs || prefs.length === 0) {
          ranks.set(studentId, null);
          continue;
        }
        const rank = prefs.indexOf(group.id);
        ranks.set(studentId, rank >= 0 ? rank + 1 : null);
      }
    }

    return ranks;
  });

  let studentHasPreferences = $derived.by(() => {
    const preferenceMap = deps.getPreferenceMap();
    const prefs = new Map<string, boolean>();
    for (const studentId of deps.getStudents().map((s) => s.id)) {
      const studentPrefs = preferenceMap[studentId]?.likeGroupIds;
      prefs.set(studentId, Boolean(studentPrefs && studentPrefs.length > 0));
    }
    return prefs;
  });

  let studentRecentGroupmates = $derived.by(() => {
    const groupmatesMap = new Map<string, Array<{ studentName: string; count: number }>>();

    for (const pair of deps.getPairingStats()) {
      const groupmatesA = groupmatesMap.get(pair.studentAId) ?? [];
      groupmatesA.push({ studentName: pair.studentBName, count: pair.count });
      groupmatesMap.set(pair.studentAId, groupmatesA);

      const groupmatesB = groupmatesMap.get(pair.studentBId) ?? [];
      groupmatesB.push({ studentName: pair.studentAName, count: pair.count });
      groupmatesMap.set(pair.studentBId, groupmatesB);
    }

    for (const [, groupmates] of groupmatesMap) {
      groupmates.sort((a, b) => b.count - a.count);
    }

    return groupmatesMap;
  });

  return {
    get activeStudentPreferences() {
      return activeStudentPreferences;
    },
    get studentPreferenceRanks() {
      return studentPreferenceRanks;
    },
    get studentHasPreferences() {
      return studentHasPreferences;
    },
    get studentRecentGroupmates() {
      return studentRecentGroupmates;
    }
  };
}
