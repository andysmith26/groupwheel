<script lang="ts">
	import { setAppDataContext } from '$lib/contexts/appData';
	import HorizontalGroupLayout from '$lib/components/HorizontalGroupLayout.svelte';
	import VerticalGroupLayout from '$lib/components/VerticalGroupLayout.svelte';
	import Inspector from '$lib/components/Inspector/Inspector.svelte';
	import UnassignedHorizontal from '$lib/components/UnassignedHorizontal.svelte';
        import { ensurePreferences } from '$lib/data/roster';
        import { getDisplayName } from '$lib/utils/friends';
	import { initializeDragMonitor, type DropState } from '$lib/utils/pragmatic-dnd';
	import type { Student, Group, Mode } from '$lib/types';
	import type { StudentPreference } from '$lib/types/preferences';
	import { commandStore } from '$lib/stores/commands.svelte';
	import { onMount } from 'svelte';

	// ---------- STATE ----------
	let rawPaste = $state('');
	let parseError = $state<string | null>(null);

	// Core datasets: students and preferences
	// studentsById holds Student objects (without friendIds)
	let studentsById = $state<Record<string, Student>>({});
	// preferencesById holds StudentPreference objects keyed by student id
	let preferencesById = $state<Record<string, StudentPreference>>({});
	// deterministic original order (ids)
	let studentOrder = $state<string[]>([]);

	// unknown preferred ids encountered in paste (friends not in roster)
	let unknownFriendIds = $state<Set<string>>(new Set());

	// UI mode: groups by count or by target size
	let mode = $state<Mode>('COUNT');

	// controls
	let numberOfGroups = $state(4);
	let targetGroupSize = $state(10);
	let showGender = $state(true);

	// groups
	// Read groups from store (reactive)
	// This creates a reactive reference - when store's groups change, UI updates
	let groups = $derived(commandStore.groups);
	const unassigned = $derived.by(() => {
		const assignedIds = new Set(groups.flatMap((g) => g.memberIds));
		return studentOrder.filter((id) => !assignedIds.has(id));
	});

	// selection/highlight
	let selectedStudentId = $state<string | null>(null);

	let isLoadingFromSheet = $state(false);
	let sheetLoadError = $state('');
	let sheetLoadGuidance = $state<string[]>([]);

	const SHEET_DATA_GUIDANCE = [
		'"Students" tab: columns A–D should be ID, First Name, Last Name, Gender (with a header row).',
		'"Connections" tab: each row must start with the same student ID/email used on the Students tab followed by friend IDs in additional columns.',
		'Friend IDs have to match the IDs from the Students tab exactly (case-insensitive).'
	];

	class SheetDataError extends Error {
		guidance: string[];
		constructor(message: string, guidance: string[] = SHEET_DATA_GUIDANCE) {
			super(message);
			this.name = 'SheetDataError';
			this.guidance = guidance;
		}
	}

	// Add after other state declarations (around line 40)
	let currentlyDragging = $state<string | null>(null); // student ID being dragged

	// Collapse state for vertical layout
	let collapsedGroups = $state<Set<string>>(new Set());

	// Layout mode determination
	const useVerticalLayout = $derived(groups.length > 5);

	// Set up context - must be at top level, not in $effect
	// Provide students and preferences to child components
	setAppDataContext({ studentsById, preferencesById });

	console.log(
		'🟣 Context set in +page.svelte with studentsById count:',
		Object.keys(studentsById).length,
		'and preferencesById count:',
		Object.keys(preferencesById).length
	);

	// ---------- HELPERS ----------
	const uid = () => Math.random().toString(36).slice(2, 9);

	// Collapse state management
	function toggleCollapse(groupId: string) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const newSet = new Set(collapsedGroups);
		if (newSet.has(groupId)) {
			newSet.delete(groupId);
		} else {
			newSet.add(groupId);
		}
		collapsedGroups = newSet;
	}

	function resetAll() {
		groups = [];
		selectedStudentId = null;
		parseError = null;
		unknownFriendIds = new Set();
	}

	function clearAssignments() {
		// Create new groups with empty member lists
		const clearedGroups = commandStore.groups.map((g) => ({ ...g, memberIds: [] }));

		// Reinitialize store with cleared groups
		commandStore.initializeGroups(clearedGroups);

		selectedStudentId = null;

		// Clear collapsed state on destructive operation
		collapsedGroups = new Set();
	}

	function initGroups() {
		const total = studentOrder.length;
		let newGroups: Group[];

		if (mode === 'COUNT') {
			const n = Math.max(1, numberOfGroups | 0);
			newGroups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: Math.ceil(total / n),
				memberIds: []
			}));
		} else {
			const size = Math.max(1, targetGroupSize | 0);
			const n = Math.max(1, Math.ceil(total / size));
			newGroups = Array.from({ length: n }, (_, i) => ({
				id: uid(),
				name: `Group ${i + 1}`,
				capacity: size,
				memberIds: []
			}));
		}

		// Initialize groups in store (this clears history too)
		commandStore.initializeGroups(newGroups);
	}

	// ---------- TEST DATA ----------
	function loadTestData() {
		console.log('🧪 loadTestData called');
		sheetLoadError = '';
		sheetLoadGuidance = [];

		// Test data with non-numeric IDs (avoids leading-zero parsing issues)
		const testStudents = [
			{ id: 'and-al-1', firstName: 'Alice', lastName: 'Anderson', gender: 'F' },
			{ id: 'bro-bo-1', firstName: 'Bob', lastName: 'Brown', gender: 'M' },
			{ id: 'che-ca-1', firstName: 'Carol', lastName: 'Chen', gender: 'F' },
			{ id: 'dav-da-1', firstName: 'David', lastName: 'Davis', gender: 'M' },
			{ id: 'eva-ev-1', firstName: 'Eve', lastName: 'Evans', gender: 'F' },
			{ id: 'fos-fr-1', firstName: 'Frank', lastName: 'Foster', gender: 'M' },
			{ id: 'gar-gr-1', firstName: 'Grace', lastName: 'Garcia', gender: 'F' },
			{ id: 'har-he-1', firstName: 'Henry', lastName: 'Harris', gender: 'M' },
			{ id: 'iva-ir-1', firstName: 'Iris', lastName: 'Ivanov', gender: 'F' },
			{ id: 'jac-ja-1', firstName: 'Jack', lastName: 'Jackson', gender: 'M' },
			{ id: 'kim-ka-1', firstName: 'Kate', lastName: 'Kim', gender: 'F' },
			{ id: 'lop-le-1', firstName: 'Leo', lastName: 'Lopez', gender: 'M' },
			{ id: 'mil-ma-1', firstName: 'Maya', lastName: 'Miller', gender: 'F' },
			{ id: 'ngu-ni-1', firstName: 'Nina', lastName: 'Nguyen', gender: 'F' },
			{ id: 'ort-os-1', firstName: 'Oscar', lastName: 'Ortiz', gender: 'M' },
			{ id: 'par-pa-1', firstName: 'Paul', lastName: 'Park', gender: 'M' },
			{ id: 'qui-qu-1', firstName: 'Quinn', lastName: 'Quinn', gender: 'X' },
			{ id: 'rob-ro-1', firstName: 'Rose', lastName: 'Roberts', gender: 'F' },
			{ id: 'smi-sa-1', firstName: 'Sam', lastName: 'Smith', gender: 'M' },
			{ id: 'tay-ti-1', firstName: 'Tina', lastName: 'Taylor', gender: 'F' }
		];

		const testConnections: Record<string, string[]> = {
			'and-al-1': ['bro-bo-1', 'che-ca-1', 'iva-ir-1'],
			'bro-bo-1': ['and-al-1', 'mil-ma-1', 'tay-ti-1'],
			'che-ca-1': ['and-al-1', 'eva-ev-1', 'kim-ka-1'],
			'dav-da-1': ['fos-fr-1', 'par-pa-1', 'smi-sa-1'],
			'eva-ev-1': ['che-ca-1', 'kim-ka-1', 'rob-ro-1'],
			'fos-fr-1': ['dav-da-1', 'lop-le-1', 'qui-qu-1'],
			'gar-gr-1': ['ngu-ni-1', 'rob-ro-1'],
			'har-he-1': ['jac-ja-1', 'ort-os-1', 'smi-sa-1'],
			'iva-ir-1': ['and-al-1', 'mil-ma-1'],
			'jac-ja-1': ['har-he-1', 'ort-os-1'],
			'kim-ka-1': ['che-ca-1', 'eva-ev-1', 'par-pa-1'],
			'lop-le-1': ['fos-fr-1', 'qui-qu-1'],
			'mil-ma-1': ['bro-bo-1', 'iva-ir-1', 'tay-ti-1'],
			'ngu-ni-1': ['gar-gr-1', 'rob-ro-1'],
			'ort-os-1': ['har-he-1', 'jac-ja-1'],
			'par-pa-1': ['dav-da-1', 'kim-ka-1'],
			'qui-qu-1': ['fos-fr-1', 'lop-le-1'],
			'rob-ro-1': ['eva-ev-1', 'gar-gr-1', 'ngu-ni-1'],
			'smi-sa-1': ['dav-da-1', 'har-he-1'],
			'tay-ti-1': ['bro-bo-1', 'mil-ma-1']
		};

		// Use the same parsing path as Google Sheets data
		parseFromSheets(testStudents, testConnections);

		// Auto-create groups
		numberOfGroups = 5;
		mode = 'COUNT';
		initGroups();

		console.log('🎯 loadTestData complete:', {
			studentsById: Object.keys(studentsById).length,
			studentOrder: studentOrder.length,
			preferencesById: Object.keys(preferencesById).length,
			groups: groups.length,
			unassigned: unassigned.length
		});
	}
	// ---------- LOAD FROM SHEETS API ----------

	interface SheetStudentPayload {
		id?: string;
		firstName?: string;
		lastName?: string;
		gender?: string;
	}

	interface SheetApiPayload {
		success?: boolean;
		students?: SheetStudentPayload[];
		connections?: Record<string, unknown>;
	}

	async function loadFromSheets() {
		isLoadingFromSheet = true;
		sheetLoadError = '';
		sheetLoadGuidance = [];

		try {
			const response = await fetch('/api/data');

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to load from Google Sheets');
			}

			const result = await response.json();

			if (!result.success) {
				throw new SheetDataError('Google Sheets did not return a successful response.');
			}

			const { students: normalizedStudents, connections: normalizedConnections } =
				normalizeSheetResponse(result);

			// Parse the structured data
			parseFromSheets(normalizedStudents, normalizedConnections);

			if (parseError) {
				throw new SheetDataError(parseError);
			}

			initGroups();
			sheetLoadGuidance = [];

			console.log(`✅ Loaded ${result.studentCount} students from Google Sheets`);
		} catch (error) {
			console.error('Failed to load from Google Sheets:', error);
			if (error instanceof SheetDataError) {
				sheetLoadError = error.message;
				sheetLoadGuidance = error.guidance;
			} else {
				sheetLoadError = error instanceof Error ? error.message : 'Unknown error';
				sheetLoadGuidance = [];
			}
		} finally {
			isLoadingFromSheet = false;
		}
	}

	function normalizeSheetResponse(payload: unknown) {
		const data = (payload ?? {}) as SheetApiPayload;
		const students = Array.isArray(data.students) ? data.students : [];

		if (students.length === 0) {
			throw new SheetDataError(
				'No student rows were returned from Google Sheets.',
				SHEET_DATA_GUIDANCE
			);
		}

		const validStudents: Array<{
			id: string;
			firstName: string;
			lastName: string;
			gender: string;
		}> = [];
		for (const student of students) {
			if (!student || typeof student !== 'object') continue;
			const id = typeof student.id === 'string' ? student.id.trim() : '';
			if (!id) continue;
			validStudents.push({
				id,
				firstName: typeof student.firstName === 'string' ? student.firstName : '',
				lastName: typeof student.lastName === 'string' ? student.lastName : '',
				gender: typeof student.gender === 'string' ? student.gender : ''
			});
		}

		if (validStudents.length === 0) {
			throw new SheetDataError(
				"No IDs were found in the Students tab. Column A must contain each student's email or unique ID.",
				SHEET_DATA_GUIDANCE
			);
		}

		const normalizedConnections: Record<string, string[]> = {};
		const rawConnections =
			data.connections && typeof data.connections === 'object' ? data.connections : {};
		for (const [rawKey, rawValue] of Object.entries(rawConnections)) {
			const key = rawKey.trim().toLowerCase();
			if (!key) continue;
			if (!Array.isArray(rawValue)) continue;
			const cleaned = rawValue
				.map((fid) => (typeof fid === 'string' ? fid.trim().toLowerCase() : ''))
				.filter((fid) => fid.length > 0);
			if (cleaned.length > 0) {
				normalizedConnections[key] = cleaned;
			}
		}

		return { students: validStudents, connections: normalizedConnections };
	}
	// ---------- PARSING ----------
	/**
	 * Expected headers (order-insensitive, minimal):
	 * - "display name" (or "name")
	 * - "id" (unique email)
	 * - "friend 1 id", "friend 2 id", ..., any number of friend columns
	 *
	 * Notes:
	 * - Some students have no friends listed (friend columns may be empty or absent).
	 * - Some friend ids may not exist in the dataset → ignored.
	 */
	function parsePasted(text: string) {
		resetAll();
		sheetLoadError = '';
		sheetLoadGuidance = [];

		const lines = text
			.trim()
			.split(/\r?\n/)
			.filter((l) => l.trim().length > 0);
		if (lines.length < 2) {
			parseError = 'Please paste at least a header row and one data row.';
			return;
		}

		// detect TSV vs CSV (Sheets paste is typically TSV)
		const delimiter = lines[0].includes('\t') ? '\t' : ',';

		const header = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
		const colName = (wanted: string) => header.findIndex((h) => h === wanted);

		// alias for display name
		let nameIdx = header.findIndex((h) => h === 'display name' || h === 'name');
		const idIdx = colName('id');
		if (nameIdx === -1 || idIdx === -1) {
			parseError = 'Headers must include "display name" (or "name") and "id".';
			return;
		}

		// collect friend columns (any header that matches /^friend\s*\d+\s*id$/i)
		const friendIdxs = header
			.map((h, i) => ({ h, i }))
			.filter(({ h }) => /^friend\s*\d+\s*id$/i.test(h))
			.map(({ i }) => i)
			.sort((a, b) => a - b);

		const map: Record<string, Student> = {};
		const order: string[] = [];
		const prefMap: Record<string, StudentPreference> = {};
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const unknownSet = new Set<string>();

		for (let r = 1; r < lines.length; r++) {
			const raw = lines[r];
			const cells = splitCsvTsvRow(raw, delimiter, header.length);
			if (!cells) continue;

			const name = (cells[nameIdx] ?? '').trim();
			const id = (cells[idIdx] ?? '').trim().toLowerCase();

			if (!id) {
				// skip rows without id
				continue;
			}
			if (map[id]) {
				parseError = `Duplicate id found on row ${r + 1}: ${id}`;
				return;
			}

			const friendIds = friendIdxs
				.map((idx) => (cells[idx] ?? '').trim().toLowerCase())
				.filter((fid) => fid.length > 0);

			const nameParts = name.trim().split(' ');
			const firstName = nameParts[0] || '';
			const lastName = nameParts.slice(1).join(' ') || '';

			// Create Student without friendIds
			map[id] = {
				id,
				firstName,
				lastName,
				gender: '' // TSV doesn't have gender, leave blank
			};
			order.push(id);

			// Build initial preference record with likeStudentIds
			prefMap[id] = {
				studentId: id,
				likeStudentIds: friendIds,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: [],
				meta: {}
			};
		}

                // now that all ids are known, check unknown friend ids and remove unknowns from preferences
                for (const id of Object.keys(prefMap)) {
                        const pref = prefMap[id];
                        const validFriends: string[] = [];
                        for (const fid of pref.likeStudentIds) {
                                if (map[fid]) {
                                        validFriends.push(fid);
                                } else {
                                        unknownSet.add(fid);
                                }
                        }
                        pref.likeStudentIds = validFriends;
                }

                const ensuredPreferences = ensurePreferences(Object.values(map), Object.values(prefMap));

                // Clear existing entries
                Object.keys(studentsById).forEach((key) => delete studentsById[key]);
                Object.keys(preferencesById).forEach((key) => delete preferencesById[key]);

                // Add new entries (mutate, don't replace)
                Object.assign(studentsById, map);
                Object.assign(preferencesById, ensuredPreferences);

		studentOrder = order;
		unknownFriendIds = unknownSet;

		// initialize groups and unassigned based on mode/controls
		initGroups();
	}

	// naive-but-good-enough splitter (MVP): TSV or simple CSV (no quoted commas)
	function splitCsvTsvRow(row: string, delim: string, minCols: number) {
		// For MVP we avoid full CSV quotes handling; Google Sheets paste (TSV) is fine.
		const parts = row.split(delim);
		if (parts.length < minCols) {
			// pad to min columns
			while (parts.length < minCols) parts.push('');
		}
		return parts;
	}

	function parseFromSheets(
		students: Array<{ id: string; firstName: string; lastName: string; gender: string }>,
		connections: Record<string, string[]>
	) {
		console.log('🔍 parseFromSheets called with:', {
			studentCount: students.length,
			connectionsCount: Object.keys(connections).length
		});

		resetAll();

		const map: Record<string, Student> = {};
		const prefMap: Record<string, StudentPreference> = {};
		const order: string[] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const unknownSet = new Set<string>();

		// --- EXISTING PARSING LOGIC (unchanged) ---
		for (const student of students) {
			if (!student.id) continue;

			const id = student.id.toLowerCase();

			if (map[id]) {
				parseError = `Duplicate student ID: ${student.id}`;
				return;
			}

			// Get friend IDs for this student from connections (treat as likeStudentIds)
			const friendList =
				connections[student.id] || connections[id] || connections[student.id.toUpperCase()] || [];
			const friendIds = friendList.map((fid) => fid.toLowerCase());

			// Create Student without friendIds
			map[id] = {
				id,
				firstName: student.firstName,
				lastName: student.lastName,
				gender: student.gender
			};

			// Build preference object
			prefMap[id] = {
				studentId: id,
				likeStudentIds: friendIds,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: [],
				meta: {}
			};

			order.push(id);
		}

                // Validate friend IDs: remove unknowns and record them
                for (const id of Object.keys(prefMap)) {
                        const pref = prefMap[id];
                        const validFriends: string[] = [];
                        for (const fid of pref.likeStudentIds) {
                                if (map[fid]) {
                                        validFriends.push(fid);
                                } else {
                                        unknownSet.add(fid);
                                }
                        }
                        pref.likeStudentIds = validFriends;
                }

                const ensuredPreferences = ensurePreferences(Object.values(map), Object.values(prefMap));

                // Update state
                // Clear existing entries
                Object.keys(studentsById).forEach((key) => delete studentsById[key]);
                Object.keys(preferencesById).forEach((key) => delete preferencesById[key]);
                // Add new entries (mutate, don't replace)
                Object.assign(studentsById, map);
                Object.assign(preferencesById, ensuredPreferences);

		studentOrder = order;
		unknownFriendIds = unknownSet;
		parseError = '';

		console.log(`✅ Parsed and validated ${order.length} students with preferences`);
	}

	// ---------- DnD with Pragmatic Drag and Drop ----------

	// Initialize monitor on mount
	let monitorCleanup: (() => void) | null = null;
	onMount(() => {
		monitorCleanup = initializeDragMonitor();
		return () => {
			monitorCleanup?.();
		};
	});

	function handleDragStart(studentId: string) {
		currentlyDragging = studentId;
		selectedStudentId = studentId; // Auto-select on drag
	}

	function handleStudentClick(studentId: string) {
		// Toggle selection: click same student = deselect, click different = select
		selectedStudentId = selectedStudentId === studentId ? null : studentId;
	}

	function handleUpdateGroup(groupId: string, changes: Partial<Group>) {
		commandStore.updateGroup(groupId, changes);
	}

	function handleDrop(state: DropState) {
		console.log('🎯 handleDrop called with state:', state);
		console.log('  draggedItem:', state.draggedItem);
		console.log('  sourceContainer:', state.sourceContainer);
		console.log('  targetContainer:', state.targetContainer);

		const { draggedItem, sourceContainer, targetContainer } = state;
		const studentId = draggedItem.id;

		// NEW: Don't clear selection on drop (Option 2: persist)
		// Selection was set in handleDragStart, keep it after drop
		// so teacher can review placement decision in Inspector

		if (!targetContainer || sourceContainer === targetContainer) {
			currentlyDragging = null;
			// selectedStudentId stays as-is (don't clear)
			return;
		}

		// Capacity check
		if (targetContainer !== 'unassigned') {
			const targetGroup = groups.find((g) => g.id === targetContainer);
			if (targetGroup) {
				const currentCount = targetGroup.memberIds.length;
				if (targetGroup.capacity != null && currentCount >= targetGroup.capacity) {
					console.warn(`Cannot drop: ${targetGroup.name} is at capacity`);
					currentlyDragging = null;
					return;
				}
			}
		}

        // Auto-expand on drop if target is collapsed
        if (collapsedGroups.has(targetContainer)) {
                // eslint-disable-next-line svelte/prefer-svelte-reactivity
                const newSet = new Set(collapsedGroups);
                newSet.delete(targetContainer);
                collapsedGroups = newSet;
        }

        commandStore.dispatch({
                type: 'ASSIGN_STUDENT',
                studentId,
                groupId: targetContainer,
                previousGroupId: sourceContainer ?? undefined
        });

		// unassigned automatically updates via derivation
		currentlyDragging = null;
	}

	// ---------- METRICS ----------
	function groupOf(studentId: string): Group | null {
		for (const g of groups) if (g.memberIds.includes(studentId)) return g;
		return null;
	}

	function studentHappiness(studentId: string): number {
		const pref = preferencesById[studentId];
		if (!pref || !pref.likeStudentIds?.length) return 0;
		const g = groupOf(studentId);
		if (!g) return 0;
		const set = new Set(g.memberIds);
		let count = 0;
		for (const fid of pref.likeStudentIds) {
			if (studentsById[fid] && set.has(fid)) count++;
		}
		return count;
	}

	const totalHappiness = $derived.by(() => {
		let sum = 0;
		for (const id of studentOrder) sum += studentHappiness(id);
		return sum;
	});

	// ---------- ASSIGNMENT ----------
	function clearAndRandomAssign() {
		// Read current groups from store
		const currentGroups = commandStore.groups;

		// Start with empty groups
		const emptyGroups = currentGroups.map((g) => ({ ...g, memberIds: [] }));

		const shuffled = [...studentOrder].sort(() => Math.random() - 0.5);

		// Build new memberIds arrays
		const newMemberIds: Record<string, string[]> = {};
		emptyGroups.forEach((g) => {
			newMemberIds[g.id] = [];
		});

		let gi = 0;
		for (const id of shuffled) {
			for (let k = 0; k < emptyGroups.length * 2; k++) {
				const g = emptyGroups[gi % emptyGroups.length];
				gi++;
				if (g.capacity != null && newMemberIds[g.id].length >= g.capacity) continue;
				newMemberIds[g.id].push(id);
				break;
			}
		}

		// Apply all updates at once
		const finalGroups = emptyGroups.map((g) => ({ ...g, memberIds: newMemberIds[g.id] }));
		commandStore.initializeGroups(finalGroups);

		// Clear collapsed state on destructive operation
		collapsedGroups = new Set();
	}

	// Build (undirected) adjacency from mutual preferences
	function buildAdjacency(): Map<string, Set<string>> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const adj = new Map<string, Set<string>>();
		for (const id of studentOrder) adj.set(id, new Set());
		for (const [sid, pref] of Object.entries(preferencesById)) {
			for (const fid of pref.likeStudentIds) {
				// both students must exist in roster
				if (!studentsById[fid] || !studentsById[sid]) continue;
				const otherPref = preferencesById[fid];
				if (otherPref && otherPref.likeStudentIds.includes(sid)) {
					adj.get(sid)!.add(fid);
					adj.get(fid)!.add(sid); // undirected for grouping
				}
			}
		}
		return adj;
	}

	function autoAssignBalanced() {
		// =============================================================================
		// STEP 1: Get current groups from store and create working copy
		// =============================================================================

		// Read current groups from store (read-only reference)
		const currentGroups = commandStore.groups;

		// Start with empty groups - we'll build assignments from scratch
		const emptyGroups = currentGroups.map((g) => ({ ...g, memberIds: [] }));

		// =============================================================================
		// STEP 2: Build friend adjacency graph from mutual preferences
		// =============================================================================

		const adj = buildAdjacency();
		const degree = (id: string) => adj.get(id)?.size ?? 0;

		// Sort students by friend degree (most connected first)
		// Students with more mutual friends get assigned first (greedy approach)
		const order = [...studentOrder].sort((a, b) => degree(b) - degree(a));

		// =============================================================================
		// STEP 3: Greedy placement - assign each student to best group
		// =============================================================================

		// Track member IDs separately during construction
		const newMemberIds: Record<string, string[]> = {};
		emptyGroups.forEach((g) => {
			newMemberIds[g.id] = [];
		});

		// Helper: how many spots left in a group?
		const remaining = (gid: string) => {
			const g = emptyGroups.find((gr) => gr.id === gid);
			if (!g) return 0;
			return g.capacity == null ? Infinity : g.capacity - newMemberIds[gid].length;
		};

		// Assign each student to the group where they have the most friends
		for (const id of order) {
			let bestG: string | null = null;
			let bestScore = -1;

			// Check all groups, find the one with most of this student's mutual friends
			for (const g of emptyGroups) {
				if (remaining(g.id) <= 0) continue; // Skip full groups

				// Score = number of this student's mutual friends already in this group
				let sc = 0;
				const set = new Set(newMemberIds[g.id]);
				for (const fid of adj.get(id) ?? []) {
					if (set.has(fid)) sc++;
				}

				if (sc > bestScore) {
					bestScore = sc;
					bestG = g.id;
				}
			}

			// Assign student to best group (or leave unassigned if no capacity)
			if (bestG) {
				newMemberIds[bestG].push(id);
			}
		}

		// =============================================================================
		// STEP 4: Apply greedy results to create working groups array
		// =============================================================================

		// Create groups array with assignments from greedy phase
		// We'll mutate this during local improvement (it's a working copy)
		let workingGroups = emptyGroups.map((g) => ({
			...g,
			memberIds: newMemberIds[g.id]
		}));

		// =============================================================================
		// STEP 5: Local improvement via random swaps
		// =============================================================================

		// Try random swaps and keep beneficial ones
		// This improves on greedy by finding local optimizations
		const budget = 300;
		for (let t = 0; t < budget; t++) {
			// Pick two random students from different groups
			const a = pickRandomPlaced();
			const b = pickRandomPlaced();
			if (!a || !b || a.id === b.id || a.group.id === b.group.id) continue;

			// Calculate if swapping them increases overall happiness
			const delta = swapDeltaHappiness(a.id, b.id, a.group, b.group);

			// Only perform swap if it improves things
			if (delta > 0) {
				const ai = a.group.memberIds.indexOf(a.id);
				const bi = b.group.memberIds.indexOf(b.id);
				a.group.memberIds[ai] = b.id;
				b.group.memberIds[bi] = a.id;
			}
		}

		// =============================================================================
		// STEP 6: Save final groups to store
		// =============================================================================

		// Initialize store with our final groups
		// This clears command history (intentional - auto-assign is a fresh start)
		commandStore.initializeGroups(workingGroups);

		// Clear collapsed state on destructive operation
		collapsedGroups = new Set();

		// =============================================================================
		// HELPER FUNCTIONS (closures over workingGroups)
		// =============================================================================

		/**
		 * Pick a random student who has been placed in a group.
		 * Returns { id, group } or null if no students placed.
		 */
		function pickRandomPlaced() {
			const placedPairs: { id: string; group: Group }[] = [];

			// Build list of all (student, group) pairs
			for (const g of workingGroups) {
				for (const id of g.memberIds) {
					placedPairs.push({ id, group: g });
				}
			}

			if (!placedPairs.length) return null;
			return placedPairs[(Math.random() * placedPairs.length) | 0];
		}

		/**
		 * Calculate happiness change if we swap student A and B between their groups.
		 * Uses simulation (swap, measure, unswap) to avoid side effects.
		 */
		function swapDeltaHappiness(aId: string, bId: string, gA: Group, gB: Group) {
			// Measure happiness BEFORE swap
			const before =
				studentHappiness(aId) +
				studentHappiness(bId) +
				// Also count happiness change for their friends in same groups
				neighborsDeltaContext(gA, aId) +
				neighborsDeltaContext(gB, bId);

			// === SIMULATE SWAP (temporarily mutate) ===
			const ai = gA.memberIds.indexOf(aId);
			const bi = gB.memberIds.indexOf(bId);
			gA.memberIds[ai] = bId;
			gB.memberIds[bi] = aId;

			// Measure happiness AFTER swap
			const after =
				studentHappiness(aId) +
				studentHappiness(bId) +
				neighborsDeltaContext(gA, bId) +
				neighborsDeltaContext(gB, aId);

			// === REVERT SIMULATION (undo the temporary mutation) ===
			gA.memberIds[ai] = aId;
			gB.memberIds[bi] = bId;

			// Return change in happiness (positive = swap is beneficial)
			return after - before;
		}

		/**
		 * Calculate happiness contribution from students who listed movedId as friend.
		 * Used to account for "neighbor effects" when evaluating swaps.
		 */
		function neighborsDeltaContext(g: Group, movedId: string) {
			let sum = 0;
			for (const otherId of g.memberIds) {
				const otherPref = preferencesById[otherId];
				// If this student considers movedId a preferred friend, their happiness matters
				if (otherPref?.likeStudentIds?.includes(movedId)) {
					sum += studentHappiness(otherId);
				}
			}
			return sum;
		}
	}
	// ---------- EXPORT ----------
	function copyTSV() {
		const rows: string[] = [];
		rows.push(['group', 'display name', 'id'].join('\t'));

		for (const g of groups) {
			for (const id of g.memberIds) {
				const s = studentsById[id];
				rows.push([g.name, s ? getDisplayName(s) : '', s?.id ?? ''].join('\t'));
			}
		}
		for (const id of unassigned) {
			const s = studentsById[id];
			rows.push(['Unassigned', s ? getDisplayName(s) : '', s?.id ?? ''].join('\t'));
		}

		const tsv = rows.join('\n');
		navigator.clipboard.writeText(tsv).catch(() => {});
	}

	// Keyboard shortcuts for undo/redo
	onMount(() => {
		function handleKeyboard(e: KeyboardEvent) {
			// Ctrl+Z (or Cmd+Z on Mac) = Undo
			if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
				e.preventDefault(); // Don't trigger browser undo
				commandStore.undo();
			}

			// Ctrl+Y (or Cmd+Shift+Z on Mac) = Redo
			if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
				e.preventDefault(); // Don't trigger browser redo
				commandStore.redo();
			}
		}

		window.addEventListener('keydown', handleKeyboard);

		// Cleanup: remove listener when component is destroyed
		return () => {
			window.removeEventListener('keydown', handleKeyboard);
		};
	});

	// ---------- DERIVED ----------
	const totalStudents = $derived(studentOrder.length);
	const placedCount = $derived(groups.reduce((acc, g) => acc + g.memberIds.length, 0));
	const unassignedCount = $derived(unassigned.length);
</script>

<!-- LAYOUT -->
<div class="mx-auto max-w-7xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Group Hat v3 — MVP</h1>
		<div class="text-sm text-gray-500">Privacy-first • Client-side • No data stored</div>
	</header>

	<!-- PASTE & PARSE -->
	<section class="grid gap-4 md:grid-cols-3">
		<div class="space-y-2 md:col-span-2">
			<label class="block text-sm font-medium">Paste from Google Sheets (TSV/CSV)</label>
			<textarea
				class="h-40 w-full rounded-md border p-2 font-mono text-sm"
				bind:value={rawPaste}
				placeholder="Headers required: display name | name, id, friend 1 id, friend 2 id, ..."
			>
			</textarea>
			<div class="flex items-center gap-2">
				<button
					class="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
					on:click={() => parsePasted(rawPaste)}
				>
					Parse data
				</button>
				<button
					class="rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
					on:click={loadFromSheets}
					disabled={isLoadingFromSheet}
				>
					{isLoadingFromSheet ? '⏳ Loading...' : '📊 Load from Sheet'}
				</button>
				<button class="rounded-md border px-3 py-2 hover:bg-gray-50" on:click={loadTestData}>
					🧪 Load Test Data
				</button>
				{#if sheetLoadError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
						<p class="font-semibold">{sheetLoadError}</p>
						{#if sheetLoadGuidance.length > 0}
							<ul class="mt-2 list-disc space-y-1 pl-5 text-red-700">
								{#each sheetLoadGuidance as tip}
									<li>{tip}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else if parseError}
					<span class="text-sm text-red-600">{parseError}</span>
				{:else if totalStudents > 0}
					<span class="text-sm text-gray-600">
						Parsed <strong>{totalStudents}</strong> students.
						{#if unknownFriendIds.size > 0}
							Ignored <strong>{unknownFriendIds.size}</strong> friend id{unknownFriendIds.size === 1
								? ''
								: 's'} not in list.
						{/if}
					</span>
				{/if}
			</div>
			<p class="text-xs text-gray-500">
				Required columns: <code>display name</code> (or <code>name</code>), <code>id</code> (unique
				email). Any number of <code>friend N id</code> columns are supported. Missing/unknown friend
				ids are ignored.
			</p>
		</div>

		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium">Mode</label>
				<select class="rounded-md border p-1 text-sm" bind:value={mode}>
					<option value="COUNT">Number of groups</option>
					<option value="SIZE">Target group size</option>
				</select>
			</div>

			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={showGender} />
				Show gender badges
			</label>

			{#if mode === 'COUNT'}
				<div class="space-y-1">
					<label class="block text-sm">Number of groups</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={numberOfGroups}
					/>
				</div>
			{:else}
				<div class="space-y-1">
					<label class="block text-sm">Target group size</label>
					<input
						type="number"
						min="1"
						class="w-32 rounded-md border p-1"
						bind:value={targetGroupSize}
					/>
				</div>
			{/if}

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={initGroups}
					disabled={totalStudents === 0}
				>
					Create/Reset groups
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={clearAssignments}
					disabled={groups.length === 0}
				>
					Clear assignments
				</button>
			</div>

			<div class="space-y-1 text-sm">
				<div>Total students: <strong>{totalStudents}</strong></div>
				<div>
					Placed: <strong>{placedCount}</strong> • Unassigned: <strong>{unassignedCount}</strong>
				</div>
				<div>Total happiness: <strong>{totalHappiness}</strong></div>
			</div>

			<div class="flex flex-wrap gap-2">
				<button
					class="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={autoAssignBalanced}
				>
					Auto-assign (honor friends)
				</button>
				<button
					class="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
					disabled={groups.length === 0}
					on:click={clearAndRandomAssign}
				>
					Random assign
				</button>
				<button
					class="rounded-md border px-3 py-2 hover:bg-gray-50"
					on:click={copyTSV}
					disabled={totalStudents === 0}
				>
					Copy TSV for Sheets
				</button>

				<!-- Undo/Redo Controls -->
				<div class="flex flex-wrap items-center gap-2 border-t pt-3">
					<button
						class="rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						on:click={() => commandStore.undo()}
						disabled={!commandStore.canUndo}
						title="Undo last action (Ctrl+Z)"
					>
						⬅️ Undo
					</button>

					<button
						class="rounded-md border bg-white px-3 py-2 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
						on:click={() => commandStore.redo()}
						disabled={!commandStore.canRedo}
						title="Redo last undone action (Ctrl+Y)"
					>
						➡️ Redo
					</button>

					<div class="text-sm text-gray-600">
						<span class="font-medium">History:</span>
						{commandStore.getHistoryState().length} commands
						{#if commandStore.getHistoryState().index >= 0}
							(at position {commandStore.getHistoryState().index + 1})
						{:else}
							(empty)
						{/if}
					</div>
				</div>
				<!-- Debug Panel (remove in production) -->
				<div class="mt-4 rounded border border-gray-300 bg-gray-50 p-3">
					<h3 class="mb-2 text-sm font-semibold text-gray-700">Debug Info</h3>
					<div class="space-y-1 font-mono text-xs">
						<div>
							<span class="text-gray-600">Store groups:</span>
							{commandStore.groups.length} groups
						</div>
						<div>
							<span class="text-gray-600">History:</span>
							{commandStore.getHistoryState().length} commands, index: {commandStore.getHistoryState()
								.index}
						</div>
						<div>
							<span class="text-gray-600">Can undo:</span>
							{commandStore.canUndo ? '✅' : '❌'}
						</div>
						<div>
							<span class="text-gray-600">Can redo:</span>
							{commandStore.canRedo ? '✅' : '❌'}
						</div>

						<!-- Show groups detail -->
						<details class="mt-2">
							<summary class="cursor-pointer text-gray-600 hover:text-gray-900">
								Groups detail
							</summary>
							<pre class="mt-1 max-h-40 overflow-auto text-xs">
{JSON.stringify(commandStore.groups, null, 2)}
      </pre>
						</details>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- GROUP EDITOR -->
	{#if groups.length > 0}
		<section class="space-y-3">
			<!-- Unassigned students horizontal list -->
			<UnassignedHorizontal
				studentIds={unassigned}
				{selectedStudentId}
				{currentlyDragging}
				onDrop={handleDrop}
				onDragStart={handleDragStart}
				onClick={handleStudentClick}
			/>

			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium">Groups</h2>
				<button
					class="rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
					on:click={() =>
						groups.push({
							id: uid(),
							name: `Group ${groups.length + 1}`,
							capacity: null,
							memberIds: []
						})}
				>
					+ Add group
				</button>
			</div>

			{#if useVerticalLayout}
				<VerticalGroupLayout
					{groups}
					{selectedStudentId}
					{currentlyDragging}
					{collapsedGroups}
					onDrop={handleDrop}
					onDragStart={handleDragStart}
					onClick={handleStudentClick}
					onUpdateGroup={handleUpdateGroup}
					onToggleCollapse={toggleCollapse}
				/>
			{:else}
				<HorizontalGroupLayout
					{groups}
					{selectedStudentId}
					{currentlyDragging}
					onDrop={handleDrop}
					onDragStart={handleDragStart}
					onClick={handleStudentClick}
					onUpdateGroup={handleUpdateGroup}
				/>
			{/if}
		</section>
	{/if}
	<Inspector {selectedStudentId} />
</div>
