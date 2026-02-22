import { describe, expect, it } from 'vitest';
import { UiSettingsStore } from './uiSettings.svelte';

describe('UiSettingsStore', () => {
  it('toggles individual flags', () => {
    const store = new UiSettingsStore();

    expect(store.showGender).toBe(true);
    expect(store.highlightUnhappy).toBe(false);

    store.toggleShowGender();
    store.toggleHighlightUnhappy();

    expect(store.showGender).toBe(false);
    expect(store.highlightUnhappy).toBe(true);
  });

  it('resets back to default values', () => {
    const store = new UiSettingsStore();

    store.setShowGender(false);
    store.setHighlightUnhappy(true);
    store.setCardSize('lg');

    store.reset();

    expect(store.showGender).toBe(true);
    expect(store.highlightUnhappy).toBe(false);
    expect(store.cardSize).toBe('sm');
  });

  it('defaults cardSize to sm', () => {
    const store = new UiSettingsStore();
    expect(store.cardSize).toBe('sm');
  });

  it('sets card size', () => {
    const store = new UiSettingsStore();
    store.setCardSize('lg');
    expect(store.cardSize).toBe('lg');
  });

  it('cycles card size sm -> md -> lg -> sm', () => {
    const store = new UiSettingsStore();
    expect(store.cardSize).toBe('sm');
    store.cycleCardSize();
    expect(store.cardSize).toBe('md');
    store.cycleCardSize();
    expect(store.cardSize).toBe('lg');
    store.cycleCardSize();
    expect(store.cardSize).toBe('sm');
  });
});
