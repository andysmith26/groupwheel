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

let showGender = $state(true);
let highlightUnhappy = $state(false);

export const uiSettings = {
	get showGender() {
		return showGender;
	},
	set showGender(val: boolean) {
		showGender = val;
	},

	get highlightUnhappy() {
		return highlightUnhappy;
	},
	set highlightUnhappy(val: boolean) {
		highlightUnhappy = val;
	}
};