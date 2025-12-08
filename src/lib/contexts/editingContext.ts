import { getContext, setContext } from 'svelte';
import type { StudentPreference, Student } from '$lib/domain';
import type { ScenarioEditingStore } from '$lib/application/stores/ScenarioEditingStore.svelte';

const EDITING_CONTEXT_KEY = Symbol('scenario-editing-context');

export interface EditingContext {
	editingStore: ScenarioEditingStore;
	studentsById: Record<string, Student>;
	preferencesById: Record<string, StudentPreference>;
}

export function setEditingContext(context: EditingContext): void {
	setContext(EDITING_CONTEXT_KEY, context);
}

export function getEditingContext(): EditingContext {
	const context = getContext<EditingContext | undefined>(EDITING_CONTEXT_KEY);
	if (!context) {
		throw new Error('Editing context has not been set. Did you forget to wrap the edit step?');
	}
	return context;
}
