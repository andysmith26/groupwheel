export interface SampleGroupTemplate {
	id: string;
	label: string;
	description: string;
	groups: Array<{ name: string; capacity: number | null }>;
}

export const sampleGroupTemplates: SampleGroupTemplate[] = [
	{
		id: 'lots-small',
		label: 'Lots of small groups',
		description: '12 groups of 2-3 students for quick rotations.',
		groups: Array.from({ length: 12 }, (_, i) => ({
			name: `Team ${i + 1}`,
			capacity: 3
		}))
	},
	{
		id: 'few-big',
		label: 'A few big groups',
		description: '4 groups of 8 students for large projects.',
		groups: Array.from({ length: 4 }, (_, i) => ({
			name: `House ${i + 1}`,
			capacity: 8
		}))
	},
	{
		id: 'pods',
		label: 'Project pods',
		description: '6 groups of 4-5 students for collaborative work.',
		groups: [
			{ name: 'Pod Alpha', capacity: 5 },
			{ name: 'Pod Beta', capacity: 5 },
			{ name: 'Pod Gamma', capacity: 5 },
			{ name: 'Pod Delta', capacity: 4 },
			{ name: 'Pod Epsilon', capacity: 4 },
			{ name: 'Pod Zeta', capacity: 4 }
		]
	},
	{
		id: 'tables',
		label: 'Table clusters',
		description: '8 tables of 4 students for daily seat groups.',
		groups: Array.from({ length: 8 }, (_, i) => ({
			name: `Table ${String.fromCharCode(65 + i)}`,
			capacity: 4
		}))
	}
];

export const sampleGroupTemplateById = new Map(
	sampleGroupTemplates.map((template) => [template.id, template])
);
