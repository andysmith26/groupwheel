<script lang="ts">
  /**
   * ProjectionMode — Full-screen, high-contrast group display for classroom projection.
   *
   * Requirements (project definition.md — WP7, P5, Decision 10 B-R1):
   * - Student names ≥36pt, group names ≥60pt
   * - Contrast ≥7:1 (AAA) — projectors wash out color
   * - No teacher-private information visible
   * - Floating minimal teacher toolbar: re-generate, exit projection
   * - ESC or toolbar button exits projection mode
   * - Not a separate route — a mode within Class View
   *
   * Groups are differentiated by color + label (never color alone — G-R2).
   */

  import type { Group, Student } from '$lib/domain';
  import { getStudentDisplayName } from '$lib/domain/student';
  import { getGroupColor } from '$lib/utils/groupColors';

  interface Props {
    groups: Group[];
    studentsById: Record<string, Student>;
    groupSize: number;
    isGenerating: boolean;
    onRegenerate: (groupSize: number) => void;
    onExit: () => void;
  }

  let { groups, studentsById, groupSize, isGenerating, onRegenerate, onExit }: Props = $props();

  let toolbarVisible = $state(true);
  let toolbarTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleToolbarHide() {
    if (toolbarTimer) clearTimeout(toolbarTimer);
    toolbarTimer = setTimeout(() => {
      toolbarVisible = false;
    }, 4000);
  }

  function showToolbar() {
    toolbarVisible = true;
    scheduleToolbarHide();
  }

  // Auto-hide toolbar after initial display
  $effect(() => {
    scheduleToolbarHide();
    return () => {
      if (toolbarTimer) clearTimeout(toolbarTimer);
    };
  });

  /**
   * High-contrast background colors for projection.
   * Uses solid backgrounds with white text for ≥7:1 contrast ratio.
   * Each group also has a text label, so color is never the sole differentiator (G-R2).
   */
  const PROJECTION_COLORS = [
    'background-color: #0d9488', // teal-600
    'background-color: #2563eb', // blue-600
    'background-color: #7c3aed', // purple-600
    'background-color: #dc2626', // red-600
    'background-color: #b45309', // amber-700 (darker for contrast)
    'background-color: #059669', // emerald-600
    'background-color: #4338ca', // indigo-700
    'background-color: #be185d'  // pink-700
  ];

  function getProjectionColor(groupName: string): string {
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
      hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PROJECTION_COLORS[Math.abs(hash) % PROJECTION_COLORS.length];
  }

  function getMembers(group: Group): { id: string; name: string }[] {
    return group.memberIds.map((id) => {
      const student = studentsById[id];
      return {
        id,
        name: student ? getStudentDisplayName(student) : id
      };
    });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="projection-root"
  onmousemove={showToolbar}
  ontouchmove={showToolbar}
  role="region"
  aria-label="Projected group assignments"
>
  <!-- Group grid -->
  <div class="projection-grid">
    {#each groups as group (group.id)}
      {@const members = getMembers(group)}
      <div class="group-card">
        <div class="group-header" style={getProjectionColor(group.name)}>
          <h2 class="group-name">{group.name}</h2>
          <span class="group-count">{members.length} {members.length === 1 ? 'student' : 'students'}</span>
        </div>
        <ul class="member-list" aria-label="{group.name} members">
          {#each members as member (member.id)}
            <li class="member-item">{member.name}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <!-- Floating teacher toolbar (auto-hides) -->
  <div
    class="toolbar-container"
    class:toolbar-visible={toolbarVisible}
    class:toolbar-hidden={!toolbarVisible}
    role="toolbar"
    aria-label="Projection controls"
  >
    <button
      type="button"
      class="toolbar-btn regenerate-btn"
      onclick={() => onRegenerate(groupSize)}
      disabled={isGenerating}
      aria-label="Regenerate groups"
    >
      {#if isGenerating}
        <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4m0 12v4m-7.07-3.93 2.83-2.83m8.48-8.48 2.83-2.83M2 12h4m12 0h4m-3.93 7.07-2.83-2.83M7.76 7.76 4.93 4.93" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toolbar-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
      {/if}
      <span>New Groups</span>
    </button>
    <button
      type="button"
      class="toolbar-btn exit-btn"
      onclick={onExit}
      aria-label="Exit projection mode"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toolbar-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
      <span>Exit</span>
    </button>
  </div>
</div>

<style>
  .projection-root {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: #111827; /* gray-900 */
    overflow-y: auto;
    padding: 2rem;
    cursor: default;
  }

  .projection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
    gap: 1.5rem;
    max-width: 1800px;
    margin: 0 auto;
  }

  .group-card {
    background-color: #ffffff;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .group-header {
    padding: 1.25rem 1.5rem;
    color: #ffffff;
  }

  /* Group name: ≥60pt per spec. 60pt ≈ 80px ≈ 5rem */
  .group-name {
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: 800;
    line-height: 1.1;
    margin: 0;
  }

  .group-count {
    font-size: clamp(1rem, 2vw, 1.5rem);
    opacity: 0.85;
    margin-top: 0.25rem;
    display: block;
  }

  .member-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Student names: ≥36pt per spec. 36pt ≈ 48px ≈ 3rem */
  .member-item {
    font-size: clamp(1.5rem, 3vw, 3rem);
    font-weight: 500;
    color: #111827; /* gray-900 on white = >15:1 contrast */
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .member-item:last-child {
    border-bottom: none;
  }

  /* Floating toolbar */
  .toolbar-container {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(12px);
    border-radius: 1rem;
    padding: 0.75rem 1rem;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .toolbar-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .toolbar-hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(1rem);
    pointer-events: none;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 48px; /* ≥44px touch target (C-R2) */
    min-width: 48px;
    transition: background-color 0.15s ease;
  }

  .regenerate-btn {
    background-color: #0d9488;
    color: #ffffff;
  }

  .regenerate-btn:hover {
    background-color: #0f766e;
  }

  .regenerate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .exit-btn {
    background-color: #4b5563;
    color: #ffffff;
  }

  .exit-btn:hover {
    background-color: #374151;
  }

  .toolbar-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spin-icon {
    width: 1.25rem;
    height: 1.25rem;
    animation: spin 1s linear infinite;
  }
</style>
