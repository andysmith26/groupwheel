export const TAG_COLOR_NAMES = [
  'Teal',
  'Blue',
  'Purple',
  'Red',
  'Amber',
  'Emerald',
  'Indigo',
  'Pink',
  'Orange',
  'Lime',
  'Cyan',
  'Sky',
  'Violet',
  'Fuchsia',
  'Rose',
  'Slate'
];

export const TAG_COLOR_HEX = [
  '#0d9488', // teal-600
  '#2563eb', // blue-600
  '#7c3aed', // purple-600
  '#dc2626', // red-600
  '#b45309', // amber-700
  '#059669', // emerald-600
  '#4338ca', // indigo-700
  '#be185d', // pink-700
  '#ea580c', // orange-600
  '#65a30d', // lime-600
  '#0891b2', // cyan-600
  '#0284c7', // sky-600
  '#a21caf', // fuchsia-700
  '#9333ea', // violet-600
  '#e11d48', // rose-600
  '#475569' // slate-600
];

const TINT_WHITE_BLEND = 0.92;

export function randomColorIndex(): number {
  return Math.floor(Math.random() * TAG_COLOR_HEX.length);
}

function normalizeColorIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function getTagColorHex(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLOR_HEX[Math.abs(hash) % TAG_COLOR_HEX.length];
}

export function resolveTagColorHex(tag: { name: string; colorIndex?: number }): string {
  if (tag.colorIndex != null) {
    return TAG_COLOR_HEX[normalizeColorIndex(tag.colorIndex, TAG_COLOR_HEX.length)];
  }
  return getTagColorHex(tag.name);
}

function blendWithWhite(hex: string, whiteRatio: number): string {
  const digits = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.round(255 * whiteRatio + channel * (1 - whiteRatio))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

export function resolveTagTintHex(tag: { name: string; colorIndex?: number }): string {
  return blendWithWhite(resolveTagColorHex(tag), TINT_WHITE_BLEND);
}

/** Inline style for a tag badge: light tint background, saturated text and border. */
export function resolveTagBadgeStyle(tag: { name: string; colorIndex?: number }): string {
  const color = resolveTagColorHex(tag);
  const tint = blendWithWhite(color, 0.85);
  return `background-color: ${tint}; color: ${color}; border: 1px solid ${blendWithWhite(color, 0.6)}`;
}
