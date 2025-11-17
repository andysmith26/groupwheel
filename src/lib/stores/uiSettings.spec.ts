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

                store.reset();

                expect(store.showGender).toBe(true);
                expect(store.highlightUnhappy).toBe(false);
        });
});
