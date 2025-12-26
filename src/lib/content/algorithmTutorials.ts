export interface AlgorithmTutorial {
	id: string;
	label: string;
	summary: string;
	metaphor: string;
	details: string[];
	tips: string[];
}

export const algorithmTutorials: AlgorithmTutorial[] = [
	{
		id: 'balanced',
		label: 'Balanced',
		summary: 'Balances group sizes while trying to respect student preferences.',
		metaphor:
			"Like a coach building fair teams while still trying to honor each player's position preference.",
		details: [
			'This option looks at student preferences and group sizes at the same time.',
			'It tries to keep groups evenly sized while still assigning students to groups they requested.',
			'It is a strong default when you want a little of everything.'
		],
		tips: [
			'Great all-around choice when you want balance and fairness.',
			'Good if you want reasonable preference satisfaction without extreme trade-offs.'
		]
	},
	{
		id: 'random',
		label: 'Random Shuffle',
		summary: 'Randomly assigns students to available groups.',
		metaphor: 'Like drawing names from a hat and dealing them into groups.',
		details: [
			'This option ignores preferences and simply shuffles students into groups.',
			'It is useful as a neutral baseline for comparison.',
			'It can be a good pick when you want variety or when preferences are not needed.'
		],
		tips: [
			'Use when you want a quick, unbiased grouping.',
			'Helpful for icebreakers or low-stakes activities.'
		]
	},
	{
		id: 'round-robin',
		label: 'Round Robin',
		summary: 'Cycles through groups to distribute students evenly.',
		metaphor: 'Like dealing cards around a table, one to each group in turn.',
		details: [
			'This option focuses on even distribution across groups.',
			'It does not prioritize preferences, but it keeps group sizes very consistent.',
			'It is useful when you mainly care about balance and predictability.'
		],
		tips: [
			'Use when group size consistency matters most.',
			'Good for rotations, stations, or structured activities.'
		]
	},
	{
		id: 'preference-first',
		label: 'Preference-First',
		summary: 'Assigns students to their highest-ranked available choice first.',
		metaphor: 'Like letting students line up for their first choice and filling the rest after.',
		details: [
			'This option tries to place each student into their top requested group.',
			'It maximizes first-choice satisfaction, then fills remaining spots evenly.',
			'It can produce less balanced groups in exchange for honoring preferences.'
		],
		tips: [
			'Use when student choice is the priority.',
			'Expect more variation in group sizes or composition.'
		]
	},
	{
		id: 'simulated-annealing',
		label: 'Simulated Annealing',
		summary: 'Improves an initial grouping by making small swaps that increase overall satisfaction.',
		metaphor: 'Like rearranging seats bit by bit until the room feels better overall.',
		details: [
			'This option starts with a grouping and tries lots of small swaps.',
			'It keeps changes that help and sometimes accepts small setbacks to escape local ruts.',
			'It is useful when you want a more refined result and can wait a little longer.'
		],
		tips: [
			'Use when you want a more optimized mix.',
			'Expect a longer generate time than the faster methods.'
		]
	},
	{
		id: 'genetic',
		label: 'Genetic Algorithm',
		summary: 'Evolves multiple groupings and keeps the best ideas across rounds.',
		metaphor: 'Like trying a few lineups, keeping the best, and mixing them into stronger teams.',
		details: [
			'This option creates several candidate groupings at once.',
			'It keeps the strongest results and combines them over a few rounds.',
			'It can discover good combinations but is more computationally intensive.'
		],
		tips: [
			'Use when you want diversity and optimization.',
			'Expect a longer generate time than the faster methods.'
		]
	}
];

export const algorithmTutorialsById = new Map(
	algorithmTutorials.map((tutorial) => [tutorial.id, tutorial])
);
