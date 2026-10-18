<script lang="ts">
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { InlineError } from '$lib/components/ui';
  import PeerRequestMatchingReview from '$lib/components/import/PeerRequestMatchingReview.svelte';
  import {
    confirmPeerRequestMatches,
    createGroupingActivity,
    importPeerRequestsFromMapping,
    matchPeerRequests,
    resolveOrCreateTags,
    savePeerRequests
  } from '$lib/services/appEnvUseCases';
  import type { PeerRequestReviewDecision } from '$lib/application/useCases/confirmPeerRequestMatches';
  import { setLastActiveClubId } from '$lib/utils/lastActiveClub';
  import { isErr } from '$lib/types/result';
  import {
    ACTIVITY_NEW_STEPS,
    createActivityNewWizardStore
  } from '$lib/stores/activityNewWizard.svelte';
  import RosterStep from './RosterStep.svelte';
  import ChoicesStep from './ChoicesStep.svelte';
  import GroupsStep from './GroupsStep.svelte';
  import ReviewStep from './ReviewStep.svelte';
  import SetupStep from './SetupStep.svelte';

  const env = getAppEnvContext();
  const wizard = createActivityNewWizardStore();

  const stepLabels: Record<string, string> = {
    roster: 'Roster',
    choices: 'Choices',
    groups: 'Groups',
    setup: 'Setup',
    review: 'Review'
  };

  function openActivity(programId: string) {
    setLastActiveClubId(programId);
    void goto(`/activity/${programId}`);
  }

  async function create() {
    if (!wizard.canContinue || wizard.submitting) return;
    wizard.submitting = true;
    wizard.error = null;
    try {
      const programId = env.idGenerator.generateId();
      const groupNames = wizard.finalGroups.map((g) => g.name);
      const groupCapacities = Object.fromEntries(
        wizard.finalGroups.map((g) => [g.name, g.capacity])
      );
      const students: typeof wizard.students = [];
      for (const student of wizard.students) {
        const resolvedTags = await resolveOrCreateTags(env, {
          programId,
          rawTagNames: student.rawTags
        });
        if (isErr(resolvedTags)) {
          throw new Error(
            `Failed to resolve tags for "${student.displayName}": ${resolvedTags.error.message}`
          );
        }
        students.push({ ...student, tagIds: resolvedTags.value });
      }
      const result = await createGroupingActivity(env, {
        activityName: wizard.activityName.trim(),
        programId,
        students,
        preferences: wizard.finalPreferences,
        groupNames,
        groupCapacities,
        seedingStrategy: wizard.initialPopulation === 'empty' ? 'none' : wizard.initialPopulation,
        ownerStaffId: 'owner-1'
      });
      if (isErr(result)) {
        wizard.error = result.error.message;
        return;
      }
      const createdId = result.value.program.id;

      const choices = wizard.choices;
      if (choices?.hasPeerRequestColumns) {
        const extraction = await importPeerRequestsFromMapping(env, {
          programId: createdId,
          rawData: choices.rawData,
          columnMappings: choices.columnMappings,
          rowStudentLinks: choices.rowStudentLinks
        });
        if (isErr(extraction)) {
          wizard.error = extraction.error.message;
          return;
        }
        if (extraction.value.entries.length > 0) {
          const peerStudents = students.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            preferredName: s.preferredName,
            lastName: s.lastName || undefined,
            tagIds: s.tagIds ?? []
          }));
          const matched = await matchPeerRequests(env, {
            requests: extraction.value.entries,
            students: peerStudents
          });
          if (isErr(matched)) {
            wizard.error = 'Unable to match peer requests.';
            return;
          }
          wizard.peerReview = matched.value;
          wizard.peerProgramId = createdId;
          wizard.peerStudents = peerStudents;
          wizard.step = 'peers';
          return;
        }
      }
      openActivity(createdId);
    } catch (e) {
      wizard.error = e instanceof Error ? e.message : 'Could not create the activity.';
    } finally {
      wizard.submitting = false;
    }
  }

  async function confirmPeers(decisions: PeerRequestReviewDecision[]) {
    if (!wizard.peerReview || !wizard.peerProgramId) return;
    wizard.submitting = true;
    wizard.error = null;
    const confirmed = await confirmPeerRequestMatches(env, {
      requests: wizard.peerReview.updatedRequests,
      decisions
    });
    if (isErr(confirmed)) {
      wizard.error = confirmed.error.type;
      wizard.submitting = false;
      return;
    }
    const saved = await savePeerRequests(env, {
      programId: wizard.peerProgramId,
      entries: confirmed.value.updatedRequests
    });
    if (isErr(saved)) {
      wizard.error = saved.error.message;
      wizard.submitting = false;
      return;
    }
    const id = wizard.peerProgramId;
    wizard.submitting = false;
    openActivity(id);
  }

  let stepIndex = $derived(ACTIVITY_NEW_STEPS.indexOf(wizard.step));
</script>

<div class="mx-auto max-w-screen-2xl space-y-6 p-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">New activity</h1>
    <a href="/" class="text-sm text-gray-500 hover:text-gray-700">Cancel</a>
  </div>

  {#if wizard.step !== 'peers'}
    <ol class="flex gap-2 text-xs text-gray-500" aria-label="Progress">
      {#each ACTIVITY_NEW_STEPS as s, i (s)}
        <li class={i === stepIndex ? 'font-semibold text-teal-700' : ''}>
          {i + 1}. {stepLabels[s]}
        </li>
      {/each}
    </ol>
  {/if}

  <section class="rounded-xl border border-gray-200 bg-white p-5">
    {#if wizard.step === 'roster'}
      <RosterStep {wizard} />
    {:else if wizard.step === 'choices'}
      <ChoicesStep {wizard} />
    {:else if wizard.step === 'groups'}
      <GroupsStep {wizard} />
    {:else if wizard.step === 'setup'}
      <SetupStep {wizard} />
    {:else if wizard.step === 'review'}
      <ReviewStep {wizard} />
    {:else if wizard.step === 'peers' && wizard.peerReview}
      <PeerRequestMatchingReview
        readyToConfirm={wizard.peerReview.readyToConfirm}
        needsReview={wizard.peerReview.needsReview}
        noMatch={wizard.peerReview.noMatch}
        invalid={wizard.peerReview.invalid}
        students={wizard.peerStudents}
        warnings={wizard.warnings}
        busy={wizard.submitting}
        confirmLabel="Save requests & open activity"
        onConfirm={confirmPeers}
      />
    {/if}

    {#if wizard.error}
      <div class="mt-3">
        <InlineError message={wizard.error} dismissible onDismiss={() => (wizard.error = null)} />
      </div>
    {/if}
  </section>

  {#if wizard.step !== 'peers'}
    <div class="flex justify-between">
      <button
        type="button"
        class="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
        disabled={wizard.step === 'roster' || wizard.submitting}
        onclick={() => wizard.back()}
      >
        Back
      </button>
      {#if wizard.step !== 'review'}
        <button
          type="button"
          class="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          disabled={!wizard.canContinue}
          onclick={() => wizard.next()}
        >
          {wizard.step === 'choices' && !wizard.choices ? 'Skip' : 'Continue'}
        </button>
      {:else}
        <button
          type="button"
          class="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          disabled={!wizard.canContinue}
          onclick={create}
        >
          {wizard.submitting ? 'Creating…' : 'Create Groups'}
        </button>
      {/if}
    </div>
  {/if}
</div>
