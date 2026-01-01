/**
 * Candidate Config Store
 *
 * Stores ephemeral configuration for candidate generation per program.
 * Uses storage port for testability.
 *
 * @module stores/candidateConfigStore
 */

import type { StoragePort } from '$lib/application/ports';

export interface CandidateConfig {
	algorithmConfig?: unknown;
	candidateCount?: number;
}

const STORAGE_KEY = 'groupwheel:candidate-configs';

function sanitizeAlgorithmConfig(config?: unknown): unknown {
	return config ? JSON.parse(JSON.stringify(config)) : undefined;
}

/**
 * Candidate config store that uses a storage port.
 */
export class CandidateConfigStore {
	constructor(private readonly storage: StoragePort) {}

	private async loadConfigs(): Promise<Record<string, CandidateConfig>> {
		const raw = await this.storage.get(STORAGE_KEY);
		if (!raw) return {};

		try {
			return JSON.parse(raw) as Record<string, CandidateConfig>;
		} catch {
			return {};
		}
	}

	private async saveConfigs(configs: Record<string, CandidateConfig>): Promise<void> {
		try {
			await this.storage.set(STORAGE_KEY, JSON.stringify(configs));
		} catch {
			// Ignore storage failures
		}
	}

	async set(programId: string, config: CandidateConfig): Promise<void> {
		const configs = await this.loadConfigs();
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

		await this.saveConfigs(configs);
	}

	async get(programId: string): Promise<CandidateConfig | null> {
		const configs = await this.loadConfigs();
		return configs[programId] ?? null;
	}

	async clear(programId: string): Promise<void> {
		const configs = await this.loadConfigs();
		if (!(programId in configs)) return;
		delete configs[programId];
		await this.saveConfigs(configs);
	}
}

// Legacy functions for backwards compatibility (use browser sessionStorage directly)
// TODO: Remove these once all callers are updated to use the class

function storageAvailable(): boolean {
	try {
		return typeof sessionStorage !== 'undefined';
	} catch {
		return false;
	}
}

function loadConfigsSync(): Record<string, CandidateConfig> {
	if (!storageAvailable()) return {};

	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return {};

	try {
		return JSON.parse(raw) as Record<string, CandidateConfig>;
	} catch {
		return {};
	}
}

function saveConfigsSync(configs: Record<string, CandidateConfig>) {
	if (!storageAvailable()) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
	} catch {
		// Ignore storage failures
	}
}

export function setCandidateConfig(programId: string, config: CandidateConfig) {
	const configs = loadConfigsSync();
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

	saveConfigsSync(configs);
}

export function getCandidateConfig(programId: string): CandidateConfig | null {
	const configs = loadConfigsSync();
	return configs[programId] ?? null;
}

export function clearCandidateConfig(programId: string) {
	const configs = loadConfigsSync();
	if (!(programId in configs)) return;
	delete configs[programId];
	saveConfigsSync(configs);
}
