import type { GroupingAlgorithm } from '$lib/application/ports';
import { parseGroupingConfig } from '$lib/infrastructure/algorithms/groupingUtils';

export interface AlgorithmDefinition {
	id: string;
	label: string;
	algorithm: GroupingAlgorithm;
}

export class MultiAlgorithmGroupingAlgorithm implements GroupingAlgorithm {
	private byId: Map<string, AlgorithmDefinition>;

	constructor(
		private definitions: AlgorithmDefinition[],
		private defaultId: string
	) {
		this.byId = new Map(definitions.map((definition) => [definition.id, definition]));
	}

	async generateGroups(params: {
		programId: string;
		studentIds: string[];
		algorithmConfig?: unknown;
	}): Promise<
		| {
				success: true;
				groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[];
		  }
		| { success: false; message: string }
	> {
		const config = parseGroupingConfig(params.algorithmConfig);
		const algorithmId = config.algorithm ?? this.defaultId;
		const definition = this.byId.get(algorithmId) ?? this.byId.get(this.defaultId);

		if (!definition) {
			return { success: false, message: `Unknown grouping algorithm: ${algorithmId}` };
		}

		return definition.algorithm.generateGroups(params);
	}
}
