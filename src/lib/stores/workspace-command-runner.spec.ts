import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '$lib/types/result';
import { WorkspaceCommandRunner } from './workspace-command-runner.svelte';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WorkspaceCommandRunner', () => {
  it('handles success path with callback, toast, and announcement', async () => {
    const onSuccess = vi.fn();
    const announceSpy = vi.fn();
    const runner = new WorkspaceCommandRunner({ onAnnounce: announceSpy });

    const result = await runner.run({
      run: () => ok({ count: 3 }),
      onSuccess,
      successMessage: (value) => `Imported ${value.count}`,
      announceMessage: 'Import complete'
    });

    expect(result.status).toBe('ok');
    expect(onSuccess).toHaveBeenCalledWith({ count: 3 });
    expect(runner.toast?.message).toBe('Imported 3');
    expect(runner.announcement).toBe('Import complete');
    expect(announceSpy).toHaveBeenCalledWith('Import complete');
  });

  it('handles error path with callback and error toast', async () => {
    const onError = vi.fn();
    const runner = new WorkspaceCommandRunner();

    const result = await runner.run({
      run: () => err({ type: 'FAILED' as const }),
      onError,
      errorMessage: (error) => `Failed: ${error.type}`
    });

    expect(result.status).toBe('err');
    expect(onError).toHaveBeenCalledWith({ type: 'FAILED' });
    expect(runner.toast?.message).toBe('Failed: FAILED');
  });

  it('binds undo callback when provided', async () => {
    const undo = vi.fn();
    const runner = new WorkspaceCommandRunner();

    await runner.run({
      run: () => ok(undefined),
      successMessage: 'Moved student',
      undo
    });

    expect(runner.toast?.action?.label).toBe('Undo');
    await runner.toast?.action?.callback();
    expect(undo).toHaveBeenCalledTimes(1);
    expect(runner.toast).toBeNull();
  });

  it('replaces active toast and resets timeout', async () => {
    const runner = new WorkspaceCommandRunner();

    await runner.run({
      run: () => ok(undefined),
      successMessage: 'First message'
    });

    await vi.advanceTimersByTimeAsync(1500);

    await runner.run({
      run: () => ok(undefined),
      successMessage: 'Second message'
    });

    await vi.advanceTimersByTimeAsync(600);
    expect(runner.toast?.message).toBe('Second message');

    await vi.advanceTimersByTimeAsync(1500);
    expect(runner.toast).toBeNull();
  });

  it('cleans up timeout and toast on dispose', async () => {
    const runner = new WorkspaceCommandRunner();

    await runner.run({
      run: () => ok(undefined),
      successMessage: 'Temp message'
    });

    expect(runner.toast?.message).toBe('Temp message');

    runner.dispose();
    expect(runner.toast).toBeNull();

    await vi.advanceTimersByTimeAsync(3000);
    expect(runner.toast).toBeNull();
  });
});
