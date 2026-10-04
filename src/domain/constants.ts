import type { DialoguePace } from './types';

/** Single source of truth for cross-module simulation, language, and editor limits. */

/** Query instruction steps per customer event (was program.ts LIMIT). */
export const QUERY_INSTRUCTION_LIMIT = 1024;
/** Compiled Query blocks per program. */
export const QUERY_MAX_BLOCKS = 128;
/** Compiled blocks per kitchen/floor program. */
export const ROBOT_MAX_BLOCKS = 512;
/** Stand-in robots (Moka/Pip) always run full programs; exceeds every unlock so future shifts never move it. */
export const ROBOT_STAND_IN_LEVEL = 99;
/** Interpreter steps per robot before a run fails. */
export const INSTRUCTION_LIMIT = 10000;
/** Simulated seconds per service run before the event clock gives up. */
export const SIM_DURATION_SECONDS = 3600;
/** Event-clock transitions per service run before the simulation gives up. */
export const MAX_TRANSITIONS = 200000;
/** Seconds of game time per executed block in live playback. */
export const BLOCK_SECONDS = 1.5;
/** Fastest allowed playback multiplier. */
export const MAX_PLAYBACK_SPEED = 12;
/** The ways the crew's lines can appear, slowest first. */
export const DIALOGUE_PACES: readonly DialoguePace[] = ['typed', 'quick', 'whole'];
/** Ticket due timestamp offset after customer arrival. */
export const TICKET_DUE_SECONDS = 30;
/** Largest whole-tile MOVE count accepted by the language and the editor. */
export const MAX_MOVE_COUNT = 19;
/** Largest per-paper ITEM quantity accepted by the language and the editor. */
export const MAX_ITEM_QUANTITY = 19;
/** Separator between a submitted paper id and its per-cup unit suffix. */
export const TICKET_UNIT_SEPARATOR = '#';

/** Weight of the dragged block's left-edge x-distance when scoring insertion slots. */
export const DROP_X_WEIGHT = 0.5;
/** Sticky bonus keeping the current slot while the dragged block rests between rows. */
export const DROP_STICKY_BONUS = 5;
/** Share of the code zone's height, at its top and bottom, where a held block scrolls the program. */
export const DRAG_SCROLL_EDGE = 0.1;
/** Peak auto-scroll step (px per 5 ms tick) at the very edge of the code zone. */
export const DRAG_SCROLL_SPEED = 2;
/** Keyboard drag step granularity (px) when searching rows. */
export const KEYBOARD_NUDGE = 2;
/** Keyboard left/right row proximity (px) for branch selection. */
export const KEYBOARD_ROW_TOLERANCE = 24;
