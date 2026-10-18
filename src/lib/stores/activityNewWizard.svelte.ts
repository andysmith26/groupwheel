/**
 * Central state for the /activity/new wizard. Steps read and write this store
 * so backtracking never loses state.
 */

import type { ColumnMapping } from '$lib/domain/import';
import type { MatchPeerRequestsOutput } from '$lib/application/useCases/matchPeerRequests';
import type { Student } from '$lib/domain';
import {
  prepareChoices,
  prepareRoster,
  type PreparedChoices,
  type PreparedRoster
} from '$lib/application/useCases/prepareGroupingActivityImport';

export type ActivityNewStep = 'roster' | 'choices' | 'groups' | 'review' | 'name' | 'peers';

export const ACTIVITY_NEW_STEPS: ActivityNewStep[] = [
  'roster',
  'choices',
  'groups',
  'review',
  'name'
];

export interface WizardGroup {
  /** Stable key for list rendering */
  key: number;
  name: string;
  /** Name this group had in the choices file, used to remap preferences after renames */
  sourceName: string | null;
  /** Max size; null means no limit */
  capacity: number | null;
}

export class ActivityNewWizardStore {
  step = $state<ActivityNewStep>('roster');

  rosterText = $state('');
  rosterFileName = $state<string | null>(null);
  rosterMappingsOverride = $state<ColumnMapping[] | undefined>(undefined);

  choicesText = $state('');
  choicesFileName = $state<string | null>(null);
  choicesMappingsOverride = $state<ColumnMapping[] | undefined>(undefined);

  activityName = $state('');
  loading = $state(false);
  submitting = $state(false);
  error = $state<string | null>(null);

  /** Peer request review (shown after the activity is persisted) */
  peerReview = $state<MatchPeerRequestsOutput | null>(null);
  peerProgramId = $state<string | null>(null);
  peerStudents = $state<Student[]>([]);

  roster = $derived<PreparedRoster | null>(
    this.rosterText.trim() ? prepareRoster(this.rosterText, this.rosterMappingsOverride) : null
  );

  students = $derived(this.roster?.students ?? []);

  choices = $derived<PreparedChoices | null>(
    this.choicesText.trim() && this.students.length > 0
      ? prepareChoices(this.choicesText, this.students, this.choicesMappingsOverride)
      : null
  );

  preferences = $derived(this.choices?.preferences ?? []);
  groupNames = $derived(this.choices?.groupNames ?? []);

  groups = $state<WizardGroup[]>([]);
  private groupsSeedKey = $state<string | null>(null);
  private nextGroupKey = 1;

  /** Describes what the group list was seeded from; changes when roster/choices change. */
  groupsSourceKey = $derived(
    this.groupNames.length > 0
      ? `choices:${JSON.stringify(this.groupNames)}`
      : `count:${this.students.length}`
  );

  groupsValid = $derived.by(() => {
    if (this.groups.length === 0) return false;
    const seen = new Set<string>();
    for (const g of this.groups) {
      const name = g.name.trim().toLowerCase();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      if (g.capacity !== null && (!Number.isInteger(g.capacity) || g.capacity < 1)) return false;
    }
    return true;
  });

  /** Final group definitions, with trimmed names. */
  finalGroups = $derived(this.groups.map((g) => ({ ...g, name: g.name.trim() })));

  /** Preferences remapped to the (possibly renamed/removed) final group names. */
  finalPreferences = $derived.by(() => {
    const bySource = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const g of this.finalGroups) {
      if (g.sourceName) bySource.set(g.sourceName, g.name);
      byName.set(g.name, g.name);
    }
    return this.preferences
      .map((pref) => {
        const ids = (pref.likeGroupIds ?? [])
          .map((id) => bySource.get(id) ?? byName.get(id))
          .filter((id): id is string => !!id);
        return { ...pref, likeGroupIds: Array.from(new Set(ids)) };
      })
      .filter((pref) => pref.likeGroupIds.length > 0);
  });

  /** Number of students whose first remaining choice is each group name. */
  firstChoiceCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const pref of this.finalPreferences) {
      const first = pref.likeGroupIds[0];
      counts[first] = (counts[first] ?? 0) + 1;
    }
    return counts;
  });

  totalCapacity = $derived(
    this.groups.every((g) => g.capacity !== null)
      ? this.groups.reduce((sum, g) => sum + (g.capacity ?? 0), 0)
      : null
  );

  rosterValid = $derived(this.students.length > 0 && !this.roster?.error);
  choicesValid = $derived(!this.choices || !this.choices.error);
  nameValid = $derived(this.activityName.trim().length > 0);

  warnings = $derived([...(this.roster?.warnings ?? []), ...(this.choices?.warnings ?? [])]);

  canContinue = $derived(
    this.step === 'roster'
      ? this.rosterValid
      : this.step === 'choices'
        ? this.choicesValid
        : this.step === 'groups'
          ? this.groupsValid
          : this.step === 'review'
            ? this.rosterValid && this.choicesValid && this.groupsValid
            : this.step === 'name'
              ? this.rosterValid &&
                this.choicesValid &&
                this.groupsValid &&
                this.nameValid &&
                !this.submitting
              : false
  );

  setRoster(text: string, fileName: string | null) {
    this.rosterText = text;
    this.rosterFileName = fileName;
    this.rosterMappingsOverride = undefined;
    // Roster changed: previously matched choices may be stale; re-derived automatically.
    if (fileName && !this.activityName.trim()) {
      this.activityName = fileName.replace(/\.(csv|tsv|txt)$/i, '').replace(/[-_]/g, ' ');
    }
  }

  setChoices(text: string, fileName: string | null) {
    this.choicesText = text;
    this.choicesFileName = fileName;
    this.choicesMappingsOverride = undefined;
  }

  clearChoices() {
    this.setChoices('', null);
  }

  private newGroup(name: string, sourceName: string | null): WizardGroup {
    return { key: this.nextGroupKey++, name, sourceName, capacity: null };
  }

  private defaultGroupName(taken: Set<string>): string {
    let n = 1;
    while (taken.has(`group ${n}`)) n++;
    return `Group ${n}`;
  }

  /** (Re)seed the group list from choices, or from a default count, if inputs changed. */
  seedGroupsIfNeeded() {
    if (this.groupsSeedKey === this.groupsSourceKey) return;
    this.groupsSeedKey = this.groupsSourceKey;
    if (this.groupNames.length > 0) {
      this.groups = this.groupNames.map((name) => this.newGroup(name, name));
    } else {
      this.groups = [];
      this.setGroupCount(Math.max(1, Math.ceil(this.students.length / 4)));
    }
  }

  addGroup() {
    const taken = new Set(this.groups.map((g) => g.name.trim().toLowerCase()));
    this.groups = [...this.groups, this.newGroup(this.defaultGroupName(taken), null)];
  }

  removeGroup(key: number) {
    this.groups = this.groups.filter((g) => g.key !== key);
  }

  setGroupCount(count: number) {
    const target = Math.max(1, Math.min(Math.floor(count) || 1, Math.max(this.students.length, 1)));
    if (target < this.groups.length) {
      this.groups = this.groups.slice(0, target);
      return;
    }
    const next = [...this.groups];
    const taken = new Set(next.map((g) => g.name.trim().toLowerCase()));
    while (next.length < target) {
      const name = this.defaultGroupName(taken);
      taken.add(name.toLowerCase());
      next.push(this.newGroup(name, null));
    }
    this.groups = next;
  }

  next() {
    const i = ACTIVITY_NEW_STEPS.indexOf(this.step);
    if (i >= 0 && i < ACTIVITY_NEW_STEPS.length - 1 && this.canContinue) {
      this.step = ACTIVITY_NEW_STEPS[i + 1];
      if (this.step === 'groups') this.seedGroupsIfNeeded();
    }
  }

  back() {
    const i = ACTIVITY_NEW_STEPS.indexOf(this.step);
    if (i > 0) this.step = ACTIVITY_NEW_STEPS[i - 1];
  }
}

export function createActivityNewWizardStore(): ActivityNewWizardStore {
  return new ActivityNewWizardStore();
}
