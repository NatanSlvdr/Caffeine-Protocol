/** Single source of truth for cross-module simulation, language, and editor limits. */

/** Query instruction steps per customer event (was program.ts LIMIT). */
export const QUERY_INSTRUCTION_LIMIT = 1024;
/** Compiled Query blocks per program. */
export const QUERY_MAX_BLOCKS = 128;
/** Query language content is capped at the Act I lessons for every robot program. */
export const QUERY_PROGRAM_LEVEL_CAP = 14;
/** Compiled blocks per kitchen/floor program. */
export const ROBOT_MAX_BLOCKS = 512;
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
/** Ticket due timestamp offset after customer arrival. */
export const TICKET_DUE_SECONDS = 30;
/** Largest whole-tile MOVE count accepted by the language and the editor. */
export const MAX_MOVE_COUNT = 19;
/** Largest per-paper ITEM quantity accepted by the language and the editor. */
export const MAX_ITEM_QUANTITY = 19;
/** Separator between a submitted paper id and its per-cup unit suffix. */
export const TICKET_UNIT_SEPARATOR = '#';

/** Pointer x-distance weight when scoring insertion slots. */
export const DROP_X_WEIGHT = 0.2;
/** Sticky bonus keeping the current slot while the pointer rests between rows. */
export const DROP_STICKY_BONUS = 5;
/** Pointer travel tolerance (px) before a reflowed preview retargets. */
export const DROP_REFLOW_TOLERANCE = 3;
/** Keyboard drag step granularity (px) when searching rows. */
export const KEYBOARD_NUDGE = 2;
/** Keyboard left/right row proximity (px) for branch selection. */
export const KEYBOARD_ROW_TOLERANCE = 24;
