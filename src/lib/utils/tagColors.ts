import { GROUP_COLOR_HEX } from './groupColors';

export const TAG_COLOR_HEX = [...GROUP_COLOR_HEX];

const TAG_BADGE_CLASS = [
  'bg-teal-100 text-teal-800',
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-red-100 text-red-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-indigo-100 text-indigo-800',
  'bg-pink-100 text-pink-800'
];

export function randomColorIndex(): number {
  return Math.floor(Math.random() * TAG_COLOR_HEX.length);
}

function getTagColorHex(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLOR_HEX[Math.abs(hash) % TAG_COLOR_HEX.length];
}

function getTagBadgeClass(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_BADGE_CLASS[Math.abs(hash) % TAG_BADGE_CLASS.length];
}

export function resolveTagColorHex(tag: { name: string; colorIndex?: number }): string {
  if (tag.colorIndex != null) {
    return TAG_COLOR_HEX[tag.colorIndex % TAG_COLOR_HEX.length];
  }
  return getTagColorHex(tag.name);
}

export function resolveTagBadgeClasses(tag: { name: string; colorIndex?: number }): string {
  if (tag.colorIndex != null) {
    return TAG_BADGE_CLASS[tag.colorIndex % TAG_BADGE_CLASS.length];
  }
  return getTagBadgeClass(tag.name);
}
