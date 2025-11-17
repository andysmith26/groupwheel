/**
 * Command Store: Manages application state with undo/redo support
 *
 * This store owns the groups array and exposes it reactively.
 * All state changes go through commands, which are recorded in history.
 *
 * Architecture: Unified State Store
 * - Store owns the data (groups array)
 * - Components dispatch commands to modify data
 * - Store maintains command history for undo/redo
 */

import type { Group } from '$lib/types';

// ============================================================================
// COMMAND TYPES
// ============================================================================

/**
 * A command represents an action the user wants to perform.
 * Each command contains all data needed to execute AND undo the operation.
 */
export type Command =
	| {
			type: 'ASSIGN_STUDENT';
			studentId: string;
			groupId: string; // Where student is moving TO
			previousGroupId?: string; // Where student came FROM (for undo)
	  }
	| {
			type: 'UNASSIGN_STUDENT';
			studentId: string;
			previousGroupId: string; // Group they're leaving
	  };

// Future commands (not implemented in this spike):
// | { type: 'CREATE_GROUP'; group: Group }
// | { type: 'DELETE_GROUP'; groupId: string }
// | { type: 'UPDATE_GROUP'; groupId: string; changes: Partial<Group> }
// | { type: 'AUTO_ASSIGN'; algorithm: 'random' | 'balanced'; assignments: Array<{studentId: string, groupId: string}> }

// ============================================================================
// INTERNAL STATE (owned by this store)
// ============================================================================

/**
 * The groups array - the single source of truth for group data.
 * Components read this reactively but don't modify it directly.
 */
let groups = $state<Group[]>([]);

/**
 * Command history - every command that has been executed.
 * This is what makes undo/redo possible.
 */
let history = $state<Command[]>([]);

/**
 * Current position in history.
 * -1 means no commands executed yet.
 * Can be less than history.length-1 if user has undone commands.
 */
let historyIndex = $state<number>(-1);

// ============================================================================
// DERIVED STATE
// ============================================================================

/**
 * Can we undo? Only if we have commands in history we haven't undone.
 */
const canUndo = $derived(historyIndex >= 0);

/**
 * Can we redo? Only if we've undone commands (index is behind history length).
 */
const canRedo = $derived(historyIndex < history.length - 1);

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

/**
 * Execute a command and update groups state.
 * This is a pure transformation - takes groups array, returns new groups array.
 *
 * Why pure function? Makes testing easier and logic clearer.
 */
function executeCommand(cmd: Command, currentGroups: Group[]): Group[] {
	if (cmd.type === 'ASSIGN_STUDENT') {
		return currentGroups.map((g) => {
			// Remove from previous group (if specified)
			if (cmd.previousGroupId && g.id === cmd.previousGroupId) {
				return {
					...g,
					memberIds: g.memberIds.filter((id) => id !== cmd.studentId)
				};
			}

			// Add to new group
			if (g.id === cmd.groupId) {
				// Defensive: prevent duplicates (shouldn't happen, but be safe)
				if (g.memberIds.includes(cmd.studentId)) {
					console.warn(`[Command Store] Student ${cmd.studentId} already in group ${g.id}`);
					return g;
				}
				return {
					...g,
					memberIds: [...g.memberIds, cmd.studentId]
				};
			}

			return g;
		});
	}

	if (cmd.type === 'UNASSIGN_STUDENT') {
		return currentGroups.map((g) => {
			if (g.id === cmd.previousGroupId) {
				return {
					...g,
					memberIds: g.memberIds.filter((id) => id !== cmd.studentId)
				};
			}
			return g;
		});
	}

	// TypeScript should ensure we never reach here
	return currentGroups;
}

/**
 * Reverse a command - the inverse of executeCommand.
 *
 * Key insight: To undo ASSIGN_STUDENT (move Alice to Group 2),
 * we move her BACK to where she came from (previousGroupId).
 */
function reverseCommand(cmd: Command, currentGroups: Group[]): Group[] {
	if (cmd.type === 'ASSIGN_STUDENT') {
		return currentGroups.map((g) => {
			// Remove from current group (where we moved them TO)
			if (g.id === cmd.groupId) {
				return {
					...g,
					memberIds: g.memberIds.filter((id) => id !== cmd.studentId)
				};
			}

			// Add back to previous group (where they came FROM)
			if (cmd.previousGroupId && g.id === cmd.previousGroupId) {
				if (g.memberIds.includes(cmd.studentId)) {
					return g; // Already there (shouldn't happen)
				}
				return {
					...g,
					memberIds: [...g.memberIds, cmd.studentId]
				};
			}

			return g;
		});
	}

	if (cmd.type === 'UNASSIGN_STUDENT') {
		// Reverse: put student BACK in the group they left
		return currentGroups.map((g) => {
			if (g.id === cmd.previousGroupId) {
				if (g.memberIds.includes(cmd.studentId)) {
					return g;
				}
				return {
					...g,
					memberIds: [...g.memberIds, cmd.studentId]
				};
			}
			return g;
		});
	}

	return currentGroups;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Dispatch a command - execute it and add to history.
 *
 * This is how components modify state. Instead of mutating groups directly,
 * they create a command and dispatch it.
 */
function dispatch(cmd: Command): void {
	// If we're in the middle of history (user has undone some commands),
	// throw away the "future" commands we undid.
	// This is standard undo/redo behavior - new action = new branch
	if (historyIndex < history.length - 1) {
		history = history.slice(0, historyIndex + 1);
	}

	// Execute the command on our internal groups state
	groups = executeCommand(cmd, groups);

	// Add to history
	history = [...history, cmd];
	historyIndex = history.length - 1;

	console.log(`[Command] ${cmd.type} | History: ${history.length} | Index: ${historyIndex}`);
}

/**
 * Undo the last command.
 *
 * This reverses the command's effect and moves the history index backward.
 * The command stays in history (so we can redo it later).
 */
function undo(): void {
	if (!canUndo) {
		console.warn('[Command Store] Nothing to undo');
		return;
	}

	const cmd = history[historyIndex];
	groups = reverseCommand(cmd, groups);
	historyIndex--;

	console.log(`[Command] Undo ${cmd.type} | Index: ${historyIndex}`);
}

/**
 * Redo the next command.
 *
 * This re-executes a command we previously undid.
 */
function redo(): void {
	if (!canRedo) {
		console.warn('[Command Store] Nothing to redo');
		return;
	}

	historyIndex++;
	const cmd = history[historyIndex];
	groups = executeCommand(cmd, groups);

	console.log(`[Command] Redo ${cmd.type} | Index: ${historyIndex}`);
}

/**
 * Clear all command history.
 * Call this when loading new data - old commands refer to old groups.
 */
function clearHistory(): void {
	history = [];
	historyIndex = -1;
	console.log('[Command] History cleared');
}

/**
 * Initialize groups array.
 * This is called by the component when creating groups for the first time.
 */
function initializeGroups(newGroups: Group[]): void {
	groups = newGroups;
	clearHistory(); // New groups = fresh start
}

/**
 * Update a group's properties (name, capacity) without using commands.
 * This is for configuration changes that don't need undo/redo.
 * Uses immutable update pattern to trigger Svelte reactivity.
 */
function updateGroup(groupId: string, changes: Partial<Group>): void {
	groups = groups.map((g) => (g.id === groupId ? { ...g, ...changes } : g));
	console.log(`[Command Store] Updated group ${groupId}:`, changes);
}
/**
 * Get current history state (for debugging/UI).
 */
function getHistoryState(): {
	length: number;
	index: number;
	canUndo: boolean;
	canRedo: boolean;
} {
	return {
		length: history.length,
		index: historyIndex,
		canUndo,
		canRedo
	};
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * The command store - the public API for managing state.
 *
 * Components import this and use it to:
 * - Read groups (reactive): commandStore.groups
 * - Modify groups: commandStore.dispatch(command)
 * - Undo/redo: commandStore.undo() / commandStore.redo()
 */
export const commandStore = {
	// State (reactive - components can bind to this)
	get groups() {
		return groups;
	},

	// Actions (functions components call)
	dispatch,
	undo,
	redo,
	clearHistory,
	initializeGroups,
	updateGroup,
	getHistoryState,

	// Derived state (reactive booleans)
	get canUndo() {
		return canUndo;
	},
        get canRedo() {
                return canRedo;
        }
};

export type CommandStore = typeof commandStore;
