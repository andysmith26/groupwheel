/**
 * Shared z-index scale for the Class View spatial model.
 *
 * Tailwind equivalents: z-10, z-20, z-30, z-40.
 * Use inline `z-[${Z.TOOLBAR}]` or the Tailwind shorthand classes.
 */
export const Z = {
  /** Group cards, top bar */
  CONTENT: 10,
  /** Floating toolbar pill */
  TOOLBAR: 20,
  /** Roster drawer, student detail sheet, popovers */
  OVERLAY: 30,
  /** Confirmation dialogs, toasts */
  SYSTEM: 40,
} as const;
