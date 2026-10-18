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

export type ActivityNewStep = 'roster' | 'choices' | 'review' | 'name' | 'peers';

export const ACTIVITY_NEW_STEPS: ActivityNewStep[] = ['roster', 'choices', 'review', 'name'];

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

  rosterValid = $derived(this.students.length > 0 && !this.roster?.error);
  choicesValid = $derived(!this.choices || !this.choices.error);
  nameValid = $derived(this.activityName.trim().length > 0);

  warnings = $derived([...(this.roster?.warnings ?? []), ...(this.choices?.warnings ?? [])]);

  canContinue = $derived(
    this.step === 'roster'
      ? this.rosterValid
      : this.step === 'choices'
        ? this.choicesValid
        : this.step === 'review'
          ? this.rosterValid && this.choicesValid
          : this.step === 'name'
            ? this.rosterValid && this.choicesValid && this.nameValid && !this.submitting
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

  next() {
    const i = ACTIVITY_NEW_STEPS.indexOf(this.step);
    if (i >= 0 && i < ACTIVITY_NEW_STEPS.length - 1 && this.canContinue) {
      this.step = ACTIVITY_NEW_STEPS[i + 1];
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
