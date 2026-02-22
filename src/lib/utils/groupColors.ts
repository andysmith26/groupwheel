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
