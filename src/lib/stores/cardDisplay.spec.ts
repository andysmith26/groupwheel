import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardDisplayStore } from './cardDisplay.svelte';

let storedValues: Map<string, string>;

describe('CardDisplayStore', () => {
  beforeEach(() => {
    storedValues = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key)
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and reloads display options for the same activity', () => {
    const store = new CardDisplayStore();
    store.load('activity-1');
    store.setShowTags(false);
    store.setTagColorMode('tag-1', 'background');

    const reloaded = new CardDisplayStore();
    reloaded.load('activity-1');

    expect(reloaded.showTags).toBe(false);
    expect(reloaded.tagColorModes).toEqual({ 'tag-1': 'background' });
  });

  it('does not leak settings between activities or persist a reset', () => {
    const store = new CardDisplayStore();
    store.load('activity-1');
    store.setShowTags(false);
    store.reset();
    store.load('activity-2');

    expect(store.showTags).toBe(true);
    expect(store.tagColorModes).toEqual({});
    expect(storedValues.get('groupwheel:cardDisplay:activity-1')).toBe(
      JSON.stringify({ showTags: false, tagColorModes: {} })
    );
    expect(storedValues.has('groupwheel:cardDisplay:activity-2')).toBe(false);
  });

  it('uses defaults for invalid stored data', () => {
    storedValues.set(
      'groupwheel:cardDisplay:activity-1',
      JSON.stringify({ showTags: false, tagColorModes: { 'tag-1': 'invalid' } })
    );
    const store = new CardDisplayStore();
    store.load('activity-1');

    expect(store.showTags).toBe(true);
    expect(store.tagColorModes).toEqual({});
  });

  it('preserves dangling tag IDs until explicitly removed', () => {
    storedValues.set(
      'groupwheel:cardDisplay:activity-1',
      JSON.stringify({ showTags: true, tagColorModes: { deleted: 'border' } })
    );
    const store = new CardDisplayStore();
    store.load('activity-1');

    expect(store.tagColorModes).toEqual({ deleted: 'border' });
    store.removeTag('deleted');
    expect(store.tagColorModes).toEqual({});
    expect(JSON.parse(storedValues.get('groupwheel:cardDisplay:activity-1') ?? '{}')).toEqual({
      showTags: true,
      tagColorModes: {}
    });
  });
});
