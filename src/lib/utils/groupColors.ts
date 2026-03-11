/**
 * Shared group color utilities.
 *
 * Provides consistent color assignment for group headers based on group name.
 *
 * @module utils/groupColors
 */

export const GROUP_COLORS = [
  'bg-teal',
  'bg-blue-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-pink-600'
];

/**
 * Get a consistent Tailwind background color class for a group name.
 * Uses a simple hash so the same group name always gets the same color.
 */
export function getGroupColor(groupName: string): string {
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

export const GROUP_COLOR_HEX = [
  '#0d9488', // teal-600
  '#2563eb', // blue-600
  '#7c3aed', // purple-600
  '#dc2626', // red-600
  '#b45309', // amber-700
  '#059669', // emerald-600
  '#4338ca', // indigo-700
  '#be185d'  // pink-700
];

/**
 * Get a consistent hex color for a group name.
 * Uses the same hash as getGroupColor so the same index is selected.
 */
export function getGroupColorHex(groupName: string): string {
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLOR_HEX[Math.abs(hash) % GROUP_COLOR_HEX.length];
}

/**
 * Return a random color index for assignment at group creation time.
 */
export function randomColorIndex(): number {
  return Math.floor(Math.random() * GROUP_COLOR_HEX.length);
}

/**
 * Resolve a group's display color (hex) from its colorIndex, falling back
 * to the name-based hash for groups created before colorIndex existed.
 */
export function resolveGroupColorHex(group: { name: string; colorIndex?: number }): string {
  if (group.colorIndex != null) {
    return GROUP_COLOR_HEX[group.colorIndex % GROUP_COLOR_HEX.length];
  }
  return getGroupColorHex(group.name);
}

/**
 * Resolve a group's display color (Tailwind class) from its colorIndex,
 * falling back to the name-based hash for legacy groups.
 */
export function resolveGroupColor(group: { name: string; colorIndex?: number }): string {
  if (group.colorIndex != null) {
    return GROUP_COLORS[group.colorIndex % GROUP_COLORS.length];
  }
  return getGroupColor(group.name);
}
