import type { Cargo } from './types';

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
      return drink + (cargo.sugar ? ` · ${cargo.sugar} sugar` : ' · No sugar');
    case 'dirty':
      return 'Dirty cup';
  }
}
