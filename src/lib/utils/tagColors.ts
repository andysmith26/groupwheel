export const TAG_COLORS: { name: string; hex: string }[] = [
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Amber', hex: '#b45309' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4338ca' },
  { name: 'Pink', hex: '#be185d' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Lime', hex: '#65a30d' },
  { name: 'Cyan', hex: '#0891b2' },
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Fuchsia', hex: '#a21caf' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Yellow', hex: '#ca8a04' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Violet', hex: '#9333ea' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Forest', hex: '#115e59' },
  { name: 'Maroon', hex: '#7f1d1d' },
  { name: 'Light Gray', hex: '#9ca3af' },
  { name: 'Medium Gray', hex: '#6b7280' },
  { name: 'Dark Gray', hex: '#4b5563' },
  { name: 'Charcoal', hex: '#1f2937' }
];

export const TAG_COLOR_NAMES = TAG_COLORS.map((color) => color.name);
export const TAG_COLOR_HEX = TAG_COLORS.map((color) => color.hex);

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
