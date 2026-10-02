import type { KeyboardEvent } from 'react';

/** Ctrl or ⌘ with Enter: the workspace's shortcut that runs the service. */
export const isRunShortcut = (e: KeyboardEvent) => e.key === 'Enter' && (e.ctrlKey || e.metaKey);

/**
 * Keys pressed in a block's own menus and fields stay out of the block, whose drag handle would take Space as a
 * pick-up. The run shortcut still reaches the workspace, so the service starts from wherever the player is, and so
 * does Escape: a field steps out of it, and a menu has already claimed it (see escapeMenu).
 */
export function keepKeysInBlock(e: KeyboardEvent) {
  if (!isRunShortcut(e) && e.key !== 'Escape') e.stopPropagation();
}

/**
 * Escape on a menu: an open one closes, and a closed one steps out to the block it sits in, as a number field does.
 * Either way it is the menu's own, so it never runs on into leaving the shift.
 */
export function escapeMenu(e: KeyboardEvent<HTMLElement>, open: boolean, close: () => void) {
  e.preventDefault();
  if (open) close();
  else if (!e.repeat) e.currentTarget.parentElement?.closest<HTMLElement>('[data-line]')?.focus();
}
