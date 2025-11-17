/**
 * UI Settings Store: Client-side display preferences
 *
 * This store manages ephemeral UI state that doesn't need undo/redo
 * or persistence. Examples: visual toggles, view modes, display filters.
 *
 * Architecture:
 * - Stores are for mutable, frequently-changing UI state
 * - Context (appData) is for immutable reference data
 * - commandStore is for business logic with undo/redo
 */

/**
 * Store implementation that keeps each preference in a $state rune.
 *
 * Using a class keeps related state + methods co-located and makes
 * instantiating fresh stores inside tests straightforward.
 */
export class UiSettingsStore {
        showGender = $state(true);
        highlightUnhappy = $state(false);

        setShowGender(value: boolean) {
                this.showGender = value;
        }

        setHighlightUnhappy(value: boolean) {
                this.highlightUnhappy = value;
        }

        toggleShowGender() {
                this.showGender = !this.showGender;
        }

        toggleHighlightUnhappy() {
                this.highlightUnhappy = !this.highlightUnhappy;
        }

        reset() {
                this.showGender = true;
                this.highlightUnhappy = false;
        }
}

export const uiSettings = new UiSettingsStore();
