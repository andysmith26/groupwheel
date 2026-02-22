<script lang="ts">
  /**
   * SessionTimer: Floating countdown timer for group work sessions.
   *
   * Starts from presets (5, 10, 15, 20 min) or a custom duration.
   * Plays a three-tone chime on expiry. Pure UI state — no domain dependencies.
   */
  import { onDestroy } from 'svelte';

  const {
    onExpire
  }: {
    onExpire?: () => void;
  } = $props();

  let isRunning = $state(false);
  let isPaused = $state(false);
  let totalSeconds = $state(0);
  let remainingSeconds = $state(0);
  let intervalId = $state<ReturnType<typeof setInterval> | null>(null);
  let showPresets = $state(true);
  let showCustomInput = $state(false);
  let customMinutes = $state('');
  let chimeEnabled = $state(true);
  let isExpired = $state(false);

  const presets = [5, 10, 15, 20];

  export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function startTimer(minutes: number) {
    stopTimer();
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    isRunning = true;
    isPaused = false;
    isExpired = false;
    showPresets = false;
    showCustomInput = false;

    intervalId = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        stopInterval();
        isRunning = false;
        isExpired = true;
        handleExpire();
      }
    }, 1000);
  }

  function pauseTimer() {
    stopInterval();
    isPaused = true;
  }

  function resumeTimer() {
    isPaused = false;
    intervalId = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        stopInterval();
        isRunning = false;
        isExpired = true;
        handleExpire();
      }
    }, 1000);
  }

  function stopTimer() {
    stopInterval();
    isRunning = false;
    isPaused = false;
    isExpired = false;
    remainingSeconds = 0;
    showPresets = true;
    showCustomInput = false;
  }

  function restartTimer() {
    const minutes = totalSeconds / 60;
    startTimer(minutes);
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function handleExpire() {
    onExpire?.();
    if (chimeEnabled) {
      playChime();
    }
  }

  export function playChime() {
    try {
      const audioCtx = new AudioContext();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.3); // C5
      playTone(659.25, now + 0.15, 0.3); // E5
      playTone(783.99, now + 0.3, 0.5); // G5 (longer)
    } catch {
      // AudioContext not available — silent fallback
    }
  }

  function handleCustomStart() {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 120) {
      startTimer(mins);
    }
  }

  // Collapsed state: show a compact button when presets are visible
  let isCollapsed = $state(true);

  function toggleExpand() {
    isCollapsed = !isCollapsed;
  }

  onDestroy(() => stopInterval());
</script>

<div
  class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
  style="min-width: 200px"
>
  {#if isExpired}
    <!-- Expired state -->
    <div class="p-4 text-center">
      <p class="animate-pulse text-4xl font-bold text-red-600">0:00</p>
      <p class="mt-1 text-sm font-medium text-red-600">Time's up!</p>
      <div class="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
          onclick={restartTimer}
        >
          ↺ Restart
        </button>
        <button
          type="button"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          onclick={stopTimer}
        >
          ✕ Done
        </button>
      </div>
    </div>
  {:else if isRunning}
    <!-- Running / Paused state -->
    <div class="p-4 text-center">
      <p class="text-4xl font-bold {isPaused ? 'text-gray-400' : 'text-gray-900'}">
        {formatTime(remainingSeconds)}
      </p>
      {#if isPaused}
        <p class="mt-1 text-xs font-medium text-gray-400">(paused)</p>
      {/if}
      <div class="mt-3 flex items-center justify-center gap-2">
        {#if isPaused}
          <button
            type="button"
            class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            onclick={resumeTimer}
          >
            ▶ Resume
          </button>
        {:else}
          <button
            type="button"
            class="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
            onclick={pauseTimer}
          >
            ⏸ Pause
          </button>
        {/if}
        <button
          type="button"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          onclick={stopTimer}
        >
          ■ Stop
        </button>
      </div>
    </div>
  {:else if showPresets}
    <!-- Collapsed: compact tap target -->
    {#if isCollapsed}
      <button
        type="button"
        class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onclick={toggleExpand}
      >
        <span>⏱</span>
        <span>Timer</span>
      </button>
    {:else}
      <!-- Expanded: preset selection -->
      <div class="p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700">⏱ Timer</span>
          <button
            type="button"
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onclick={toggleExpand}
            aria-label="Collapse timer"
          >
            ✕
          </button>
        </div>

        <div class="grid grid-cols-4 gap-2">
          {#each presets as mins}
            <button
              type="button"
              class="rounded-lg bg-gray-100 py-3 text-center text-lg font-semibold text-gray-800 transition-colors hover:bg-teal hover:text-white"
              style="min-height: 48px"
              onclick={() => startTimer(mins)}
            >
              {mins}
            </button>
          {/each}
        </div>

        {#if showCustomInput}
          <div class="mt-3 flex items-center gap-2">
            <input
              type="number"
              bind:value={customMinutes}
              placeholder="min"
              min="1"
              max="120"
              class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
              onkeydown={(e) => e.key === 'Enter' && handleCustomStart()}
            />
            <span class="text-sm text-gray-500">min</span>
            <button
              type="button"
              class="rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark"
              onclick={handleCustomStart}
            >
              Go
            </button>
          </div>
        {:else}
          <button
            type="button"
            class="mt-2 w-full text-left text-xs text-gray-400 hover:text-gray-600"
            onclick={() => (showCustomInput = true)}
          >
            Custom duration...
          </button>
        {/if}

        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs text-gray-500">🔔 Chime</span>
          <button
            type="button"
            class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors {chimeEnabled
              ? 'bg-teal text-white'
              : 'bg-gray-200 text-gray-500'}"
            onclick={() => (chimeEnabled = !chimeEnabled)}
          >
            {chimeEnabled ? 'on' : 'off'}
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
