import type { KeyboardEvent } from 'react';

/** Ctrl or ⌘ with Enter: the workspace's shortcut that runs the service. */
export const isRunShortcut = (e: KeyboardEvent) => e.key === 'Enter' && (e.ctrlKey || e.metaKey);

/**
 * Keys pressed in a block's own menus and fields stay out of the block, whose drag handle would take Space as a
 * pick-up. The run shortcut still reaches the workspace, so the service starts from wherever the player is.
 */
export function keepKeysInBlock(e: KeyboardEvent) {
  if (!isRunShortcut(e)) e.stopPropagation();
}
