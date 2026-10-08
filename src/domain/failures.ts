/**
 * Every way a run can fail, as a stable identifier. Hints, reactions, and the line a slip points at key on the code;
 * the sentence beside it is only what the player reads, free to change wording without changing what follows.
 */
export type FailureCode =
  // The routine itself.
  /** The routine doesn’t compile: a stray End, a duplicate name, an empty routine. */
  | 'compile'
  /** A loop ran on without ever reaching the next job. */
  | 'loop-limit'
  /** A robot ran past its last block with work still to do. */
  | 'end-of-routine'
  /** A Jump cut into or out of a For loop or a function. */
  | 'jump-across-block'
  /** A Return ran outside any Call. */
  | 'return-outside-call'
  /** A function called itself, or another function. */
  | 'recursive-call'
  /** A block read a variable no Store had filled. */
  | 'unset-variable'
  /** A variable held the wrong kind of thing: a place where a number belongs, a table that doesn’t exist. */
  | 'wrong-variable-kind'
  /** A Store read a number the item doesn’t carry. */
  | 'no-number'
  /** A command the robot can’t carry out at all; only old or hand-edited routines reach it. */
  | 'unsupported'
  // Jobs and where robots stand.
  /** A robot acted before any Wait handed it a job. */
  | 'no-job'
  /** A robot waited for a new job before finishing the one in hand. */
  | 'one-job-at-a-time'
  /** A robot held on to a drink, cup, or job when it should have finished it. */
  | 'unfinished-work'
  /** A robot is waiting for work that got stuck somewhere else. */
  | 'starved'
  /** A robot waits for one kind of work while work of its other kind is waiting for it. */
  | 'wrong-wait'
  /** A robot used a station it isn’t standing at. */
  | 'out-of-reach'
  /** A robot faced the wrong way at the right station. */
  | 'wrong-direction'
  /** Query listened, took paper, or handed it over from the wrong tile. */
  | 'wrong-spot'
  /** A Take found nothing there for this robot yet. */
  | 'nothing-there'
  /** A Deposit or Serve with empty hands. */
  | 'empty-hands'
  /** A pickup with hands or tray already full. */
  | 'hands-full'
  /** A rush order waited behind other work. */
  | 'rush-first'
  // Query's paper.
  /** Query wrote on paper it wasn’t holding. */
  | 'no-paper'
  /** Query started something new with a sheet still in hand. */
  | 'paper-in-hand'
  /** A written ticket never reached the kitchen handoff. */
  | 'ticket-not-handed-over'
  /** A ticket was handed over with no drink written on it. */
  | 'blank-ticket'
  /** Query wrote no ticket at all. */
  | 'no-ticket'
  /** Query wrote more or fewer tickets than drinks ordered. */
  | 'ticket-count'
  /** A ticket names the wrong drink. */
  | 'ticket-item'
  /** A ticket has the wrong sugar. */
  | 'ticket-sugar'
  /** A to-go order without To go on its ticket. */
  | 'ticket-to-go-missing'
  /** To go on the ticket of a guest staying in. */
  | 'ticket-to-go-extra'
  /** A guest in a hurry without Rush on their ticket. */
  | 'ticket-rush-missing'
  /** Rush on the ticket of a guest in no hurry. */
  | 'ticket-rush-extra'
  /** A table that ordered together without Together on its tickets. */
  | 'ticket-together-missing'
  /** Together on the ticket of a guest on their own. */
  | 'ticket-together-extra'
  /** Query wasn’t back at the register to take payment. */
  | 'checkout'
  /** Query wrote down an unclear order without asking for help. */
  | 'unclear-order'
  /** Query needed to ask for help and didn’t. */
  | 'help-needed'
  /** Query asked for help on a clear order. */
  | 'help-unneeded'
  /** Query wrote a drink nobody could clarify. */
  | 'guessed-drink'
  /** Query wrote down a drink that’s sold out, instead of asking what the guest would have. */
  | 'sold-out'
  /** Query stopped after one guest. */
  | 'stopped-listening'
  // Brew's kitchen.
  /** A recipe step out of order. */
  | 'recipe-order'
  /** The machine was used on a drink that’s already brewed. */
  | 'already-brewed'
  /** Brew took pre-ground coffee to the grinder while it was out for its service. */
  | 'grinder-serviced'
  /** Sugar, a lid, or pickup before the drink was brewed. */
  | 'not-brewed'
  /** More sugar than the ticket asks for. */
  | 'too-much-sugar'
  /** A drink left the kitchen with the wrong sugar. */
  | 'sugar-count'
  /** Sugar after the lid went on. */
  | 'sugar-before-lid'
  /** A to-go drink left without a lid. */
  | 'lid-missing'
  /** A lid on a drink that stays in, or a second lid. */
  | 'lid-extra'
  /** Every clean cup is out, and none are coming back. */
  | 'no-clean-cups'
  /** The shift asks for the recipe in a function, and it isn’t. */
  | 'recipe-not-function'
  /** The shift asks for a full load per trip, and the robot carried one at a time. */
  | 'carry-more'
  // Porter's floor.
  /** A to-go drink went to a table, or Porter looked for a table it doesn’t have. */
  | 'to-go-to-shelf'
  /** A drink for a table went to the to-go shelf. */
  | 'stay-in-to-table'
  /** A drink went to the wrong table. */
  | 'wrong-table'
  /** A dirty cup was looked for at the wrong table. */
  | 'wrong-dirty-table'
  /** A used cup was left on a table nobody cleared. */
  | 'table-not-cleared'
  /** A table that ordered together had its drinks too far apart. */
  | 'table-apart'
  /** A drink waited past the shift's serving window between pickup and its guest. */
  | 'drink-cold'
  // Closing time.
  /** A robot kept waiting, or Query kept listening, after the café closed. */
  | 'open-after-closing'
  /** A robot stopped before closing time. */
  | 'stopped-early'
  /** Query wrote a ticket at closing time. */
  | 'closing-ticket';

/** A failure as the simulator reports it: the stable code, and the sentence the player reads. */
export interface Failure {
  code: FailureCode;
  reason: string;
  context?: FailureContext;
}

/** What a failure was about, apart from its wording: enough to show expected against actual. */
export interface FailureContext {
  /** Which ticket on the order, counting from 1. */
  ticket?: number;
  /** What the guest or the ticket wanted, and what the routine produced instead. */
  expected?: string | number | boolean;
  actual?: string | number | boolean;
}
