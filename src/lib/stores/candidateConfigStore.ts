export interface CandidateConfig {
	algorithmConfig?: unknown;
	candidateCount?: number;
}

const STORAGE_KEY = 'groupwheel:candidate-configs';

function storageAvailable(): boolean {
	try {
		return typeof sessionStorage !== 'undefined';
	} catch {
		return false;
	}
}

function loadConfigs(): Record<string, CandidateConfig> {
	if (!storageAvailable()) return {};

	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return {};

	try {
		return JSON.parse(raw) as Record<string, CandidateConfig>;
	} catch {
		return {};
	}
}

function saveConfigs(configs: Record<string, CandidateConfig>) {
	if (!storageAvailable()) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
	} catch {
		// Ignore storage failures (private browsing, quota, etc.)
	}
}

function sanitizeAlgorithmConfig(config?: unknown): unknown {
	return config ? JSON.parse(JSON.stringify(config)) : undefined;
}

export function setCandidateConfig(programId: string, config: CandidateConfig) {
	const configs = loadConfigs();
	const existing = configs[programId] ?? {};
	const sanitizedAlgorithmConfig =
		config.algorithmConfig !== undefined
			? sanitizeAlgorithmConfig(config.algorithmConfig)
			: existing.algorithmConfig;

	configs[programId] = {
		...existing,
		...config,
		algorithmConfig: sanitizedAlgorithmConfig
	};

	saveConfigs(configs);
}

export function getCandidateConfig(programId: string): CandidateConfig | null {
	const configs = loadConfigs();
	return configs[programId] ?? null;
}

export function clearCandidateConfig(programId: string) {
	const configs = loadConfigs();
	if (!(programId in configs)) return;
	delete configs[programId];
	saveConfigs(configs);
}
