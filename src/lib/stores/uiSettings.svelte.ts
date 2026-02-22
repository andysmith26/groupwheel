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

export type CardSize = 'sm' | 'md' | 'lg';
export type GroupLayout = 'scroll' | 'wrap';

/**
 * Store implementation that keeps each preference in a $state rune.
 *
 * Using a class keeps related state + methods co-located and makes
 * instantiating fresh stores inside tests straightforward.
 */
export class UiSettingsStore {
  showGender = $state(true);
  highlightUnhappy = $state(false);
  cardSize = $state<CardSize>('sm');
  groupLayout = $state<GroupLayout>('scroll');

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

  setCardSize(value: CardSize) {
    this.cardSize = value;
  }

  cycleCardSize() {
    const sizes: CardSize[] = ['sm', 'md', 'lg'];
    const idx = sizes.indexOf(this.cardSize);
    this.cardSize = sizes[(idx + 1) % sizes.length];
  }

  setGroupLayout(value: GroupLayout) {
    this.groupLayout = value;
  }

  toggleGroupLayout() {
    this.groupLayout = this.groupLayout === 'scroll' ? 'wrap' : 'scroll';
  }

  reset() {
    this.showGender = true;
    this.highlightUnhappy = false;
    this.cardSize = 'sm';
    this.groupLayout = 'scroll';
  }
}

export const uiSettings = new UiSettingsStore();
