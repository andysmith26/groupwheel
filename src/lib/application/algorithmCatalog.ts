export interface AlgorithmCatalogEntry {
	id: string;
	label: string;
	isSlow?: boolean;
}

export const candidateAlgorithmCatalog: AlgorithmCatalogEntry[] = [
	{ id: 'balanced', label: 'Balanced' },
	{ id: 'first-choice-only', label: 'First Choice Only' },
	{ id: 'random', label: 'Random Shuffle' },
	{ id: 'round-robin', label: 'Round Robin' },
	{ id: 'preference-first', label: 'Preference-First' },
	{ id: 'simulated-annealing', label: 'Simulated Annealing', isSlow: true },
	{ id: 'genetic', label: 'Genetic Algorithm', isSlow: true }
];

export const candidateAlgorithmById = new Map(
	candidateAlgorithmCatalog.map((entry) => [entry.id, entry])
);

export function getAlgorithmLabel(id: string): string {
	return candidateAlgorithmById.get(id)?.label ?? id;
}
