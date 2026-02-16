import type { CardSize } from '$lib/stores/uiSettings.svelte';

interface SizeTokens {
	'--card-width': string;
	'--card-font-size': string;
	'--card-padding': string;
	'--card-gap': string;
	'--grip-size': string;
	'--dot-size': string;
	'--group-col-width': string;
	'--sidebar-width': string;
}

const TOKEN_MAP: Record<CardSize, SizeTokens> = {
	sm: {
		'--card-width': '112px',
		'--card-font-size': '15px',
		'--card-padding': '2px',
		'--card-gap': '4px',
		'--grip-size': '10px',
		'--dot-size': '6px',
		'--group-col-width': '136px',
		'--sidebar-width': '148px'
	},
	md: {
		'--card-width': '140px',
		'--card-font-size': '17px',
		'--card-padding': '4px',
		'--card-gap': '4px',
		'--grip-size': '12px',
		'--dot-size': '7px',
		'--group-col-width': '168px',
		'--sidebar-width': '180px'
	},
	lg: {
		'--card-width': '168px',
		'--card-font-size': '19px',
		'--card-padding': '6px',
		'--card-gap': '6px',
		'--grip-size': '14px',
		'--dot-size': '8px',
		'--group-col-width': '200px',
		'--sidebar-width': '212px'
	}
};

/** Convert tokens to a CSS style string for use on a wrapper element */
export function cardSizeStyle(size: CardSize): string {
	const tokens = TOKEN_MAP[size];
	return Object.entries(tokens)
		.map(([key, value]) => `${key}: ${value}`)
		.join('; ');
}

/** Get the numeric group column width for ROW_CONFIG */
export function getGroupColWidthPx(size: CardSize): number {
	return parseInt(TOKEN_MAP[size]['--group-col-width']);
}
