import type { Group } from '$lib/domain';
import type { IdGenerator } from '$lib/application/ports';

export interface SharedGroupingConfig {
	groups?: Array<{ id?: string; name: string; capacity?: number | null }>;
	targetGroupCount?: number;
	minGroupSize?: number;
	maxGroupSize?: number;
	seed?: number;
	algorithm?: string;
}

export function parseGroupingConfig(config?: unknown): SharedGroupingConfig {
	if (config && typeof config === 'object' && !Array.isArray(config)) {
		return config as SharedGroupingConfig;
	}
	return {};
}

export function buildGroups(
	studentCount: number,
	config: SharedGroupingConfig,
	idGenerator: IdGenerator
): Group[] {
	if (config.groups && config.groups.length > 0) {
		return config.groups.map((group) => ({
			id: group.id ?? idGenerator.generateId(),
			name: group.name,
			capacity: group.capacity ?? null,
			memberIds: []
		}));
	}

	return generateDefaultGroups(studentCount, config, idGenerator);
}

export function generateDefaultGroups(
	studentCount: number,
	config: SharedGroupingConfig,
	idGenerator: IdGenerator
): Group[] {
	const defaultMin = 4;
	const defaultMax = 6;
	let minGroupSize = config.minGroupSize ?? defaultMin;
	let maxGroupSize = config.maxGroupSize ?? defaultMax;

	if (minGroupSize < 1) minGroupSize = 1;
	if (maxGroupSize !== undefined && maxGroupSize < minGroupSize) {
		maxGroupSize = minGroupSize;
	}

	const idealGroupSize = Math.min(Math.max(5, minGroupSize), maxGroupSize ?? Infinity);

	let numGroups = config.targetGroupCount ?? Math.round(studentCount / idealGroupSize);
	if (numGroups <= 0) numGroups = 1;

	let avgGroupSize = studentCount / numGroups;
	while (avgGroupSize < minGroupSize && numGroups > 1) {
		numGroups--;
		avgGroupSize = studentCount / numGroups;
	}
	if (maxGroupSize) {
		while (avgGroupSize > maxGroupSize) {
			numGroups++;
			avgGroupSize = studentCount / numGroups;
		}
	}

	const groups: Group[] = [];
	let remainingStudents = studentCount;
	for (let i = 1; i <= numGroups; i++) {
		const remainingGroups = numGroups - i + 1;
		const baseCapacity = Math.ceil(remainingStudents / remainingGroups);
		const capped = maxGroupSize ? Math.min(baseCapacity, maxGroupSize) : baseCapacity;
		const capacity = Math.max(capped, minGroupSize);

		groups.push({
			id: idGenerator.generateId(),
			name: `Group ${i}`,
			capacity: capacity ?? null,
			memberIds: []
		});

		remainingStudents -= capacity;
	}

	return groups;
}

export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
	let t = seed >>> 0;
	const result = [...array];

	for (let i = result.length - 1; i > 0; i--) {
		t += 0x6d2b79f5;
		let x = t;
		x = Math.imul(x ^ (x >>> 15), x | 1);
		x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
		const r = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		const j = Math.floor(r * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}

export function seededRandom(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let x = t;
		x = Math.imul(x ^ (x >>> 15), x | 1);
		x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
}

export function hasRemainingCapacity(group: Group): boolean {
	return group.capacity === null || group.memberIds.length < group.capacity;
}
