export function normalizeGroupName(rawName: string): string {
	const trimmed = rawName.trim();
	return trimmed.length > 0 ? trimmed : 'Group';
}

export function ensureUniqueGroupName(name: string, usedNames: Set<string>): string {
	let baseName = normalizeGroupName(name);
	let suffixNumber: number | null = null;
	const numberedMatch = baseName.match(/^(.*\S)\s+(\d+)$/);
	if (numberedMatch) {
		baseName = numberedMatch[1].trim();
		suffixNumber = Number(numberedMatch[2]);
	}

	let candidate = normalizeGroupName(name);
	let counter = suffixNumber ?? 1;
	while (usedNames.has(candidate.toLowerCase())) {
		counter = suffixNumber === null ? Math.max(counter + 1, 2) : counter + 1;
		candidate = `${baseName} ${counter}`;
	}

	usedNames.add(candidate.toLowerCase());
	return candidate;
}

export function ensureUniqueGroupNames(names: string[]): string[] {
	const usedNames = new Set<string>();
	return names.map((name) => ensureUniqueGroupName(name, usedNames));
}
