/** Zero-padded two-digit shift numbers. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** The run shortcut's modifier as the player's keyboard labels it. */
export const RUN_MODIFIER = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

/** Star row for a 0-3 star count. */
export const starRow = (n: number): string => '★'.repeat(Math.max(0, n)) + '☆'.repeat(3 - Math.max(0, n));
