import type { Cargo, OrderTicket } from './types';

/** Describe the recorded cargo stage rather than showing every item as a finished cup. */
export function cargoLabel(cargo: Cargo): string {
  const drink = cargo.item === 'tea' ? 'Tea' : 'Coffee';
  switch (cargo.stage) {
    case 'claimed':
      return `${drink} order ticket`;
    case 'beans':
      return 'Coffee beans';
    case 'ground':
      return 'Ground coffee';
    case 'leaves':
      return 'Tea leaves';
    case 'water':
      return cargo.item === 'tea' ? 'Tea leaves + water' : 'Ground coffee + water';
    case 'brewed':
      return drink + (cargo.sugar ? ` · ${cargo.sugar} sugar` : ' · No sugar') + (cargo.lid ? ' · Lid on' : '');
    case 'dirty':
      return 'Dirty cup';
  }
}

/** A cup or its makings as a robot carries it, with where it is going: a table, or the to-go shelf. */
export const heldLabel = (cargo: Cargo): string =>
  cargoLabel(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : ' · To go');

/** The order paper in Query's hand, with whatever is written on it so far. */
export function paperLabel(paper: OrderTicket): string {
  const sugar =
    paper.sugar_count !== null
      ? ` · ${paper.sugar_count} sugar`
      : paper.with_sugar !== null
        ? paper.with_sugar
          ? ' · With sugar'
          : ' · No sugar'
        : '';
  return (
    (paper.item ? `${paper.item === 'tea' ? 'Tea' : 'Coffee'} order paper` : 'Blank order paper') +
    sugar +
    (paper.to_go ? ' · To go' : '') +
    (paper.rush ? ' · Rush' : '') +
    (paper.together ? ' · Together' : '')
  );
}
