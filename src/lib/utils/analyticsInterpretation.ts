export type MetricQuality = 'excellent' | 'strong' | 'typical' | 'could_improve';

export interface AnalyticsInterpretation {
	topChoiceQuality: MetricQuality;
	topChoiceLabel: string;
	topChoiceExplainer: string;
	comparisonNote: string | null;
	suggestions: string[];
}

export function interpretAnalytics(params: {
	current: {
		percentAssignedTopChoice: number;
		percentAssignedTop2?: number;
		averagePreferenceRankAssigned: number;
		studentsUnassignedToRequest?: number;
		studentsWithNoPreferences?: number;
	};
	baseline: {
		percentAssignedTopChoice: number;
	} | null;
	studentCount: number;
	groupCount: number;
}): AnalyticsInterpretation {
	const { current, baseline, studentCount, groupCount } = params;
	const topPct = current.percentAssignedTopChoice;

	// --- Threshold calibration ---
	// With more groups relative to students, random assignment gives higher
	// satisfaction. Adjust thresholds accordingly.
	// ratio > 0.3 means "lots of groups" (e.g., 12 groups / 30 students)
	// ratio < 0.15 means "few groups" (e.g., 4 groups / 30 students)
	const ratio = groupCount / Math.max(studentCount, 1);
	const offset = ratio > 0.3 ? 10 : ratio < 0.15 ? -10 : 0;

	const thresholds = {
		excellent: 80 + offset,
		strong: 60 + offset,
		typical: 40 + offset
	};

	let quality: MetricQuality;
	let label: string;
	if (topPct >= thresholds.excellent) {
		quality = 'excellent';
		label = 'Excellent result';
	} else if (topPct >= thresholds.strong) {
		quality = 'strong';
		label = 'Strong result';
	} else if (topPct >= thresholds.typical) {
		quality = 'typical';
		label = 'Typical result';
	} else {
		quality = 'could_improve';
		label = 'Room for improvement';
	}

	const explainer =
		`${Math.round(topPct)}% of students got their first choice` +
		(groupCount > 0 ? ` across ${groupCount} groups` : '');

	// --- Comparison note ---
	let comparisonNote: string | null = null;
	if (baseline) {
		const delta = Math.round(topPct - baseline.percentAssignedTopChoice);
		if (delta > 0) {
			comparisonNote = `↑ ${delta}% improvement over last generation`;
		} else if (delta < 0) {
			comparisonNote = `↓ ${Math.abs(delta)}% decrease from last generation`;
		} else {
			comparisonNote = 'Same as last generation';
		}
	}

	// --- Suggestions ---
	const suggestions: string[] = [];

	const unassigned = current.studentsUnassignedToRequest ?? 0;
	if (unassigned > 0 && unassigned <= 5) {
		suggestions.push(
			`${unassigned} student${unassigned > 1 ? 's' : ''} didn't get any of their choices — consider swapping them manually`
		);
	} else if (unassigned > 5) {
		suggestions.push(
			`${unassigned} students didn't get any of their choices — adding another group would likely help`
		);
	}

	if (quality === 'could_improve' && groupCount >= 2 && groupCount <= studentCount / 2) {
		suggestions.push(
			`Adding a ${ordinal(groupCount + 1)} group would give students more options and likely improve satisfaction`
		);
	}

	const noPrefs = current.studentsWithNoPreferences ?? 0;
	if (noPrefs > 0 && noPrefs >= studentCount * 0.2) {
		suggestions.push(
			`${noPrefs} students have no preferences — collecting more responses would make the algorithm more effective`
		);
	}

	return {
		topChoiceQuality: quality,
		topChoiceLabel: label,
		topChoiceExplainer: explainer,
		comparisonNote,
		suggestions
	};
}

export function ordinal(n: number): string {
	const suffixes = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
