import { cargoLabel, heldLabel, paperLabel, placeLabel, storedPlace } from '@/domain';
import type { Cargo, Drink, OrderTicket, Point } from '@/domain';
import { countFr, words } from '@/shared/language';

const FR_DRINKS: Record<Drink, string> = { coffee: 'Café', tea: 'Thé' };
const FR_DRINK_OF: Record<Drink, string> = { coffee: 'un café', tea: 'un thé' };

/** A cup, or what it's made of, as it stands. */
function frCargo(cargo: Cargo): string {
  switch (cargo.stage) {
    case 'claimed':
      return `Ticket pour ${FR_DRINK_OF[cargo.item]}`;
    case 'beans':
      return 'Grains de café';
    case 'ground':
      return cargo.preground ? 'Café moulu d’avance' : 'Café moulu';
    case 'leaves':
      return 'Feuilles de thé';
    case 'water':
      return cargo.item === 'tea' ? 'Feuilles de thé + eau' : 'Café moulu + eau';
    case 'brewed':
      return (
        FR_DRINKS[cargo.item] +
        (cargo.sugar ? ` · ${countFr(cargo.sugar, 'sucre')}` : ' · Sans sucre') +
        (cargo.lid ? ' · Couvercle mis' : '')
      );
    case 'dirty':
      return 'Tasse sale';
  }
}

/**
 * What a robot carries and keeps in memory, as the café and its windows name it: a cup at each stage, Query's order
 * sheet with what's written on it so far, and a place stored in memory. English is the domain's own labels.
 */
export const CARGO_WORDS = words(
  {
    cargo: cargoLabel,
    held: heldLabel,
    paper: paperLabel,
    place: placeLabel,
  },
  {
    cargo: frCargo,
    held: (cargo) => frCargo(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : ' · À emporter'),
    paper: (paper: OrderTicket) =>
      (paper.item ? `Feuille de commande · ${paper.item === 'tea' ? 'Thé' : 'Café'}` : 'Feuille de commande vierge') +
      (paper.sugar_count !== null
        ? ` · ${countFr(paper.sugar_count, 'sucre')}`
        : paper.with_sugar !== null
          ? paper.with_sugar
            ? ' · Avec sucre'
            : ' · Sans sucre'
          : '') +
      (paper.to_go ? ' · À emporter' : '') +
      (paper.rush ? ' · Pressé' : '') +
      (paper.together ? ' · Ensemble' : ''),
    place: (place: Point) => {
      const at = storedPlace(place);
      if (typeof at === 'string')
        return { pickup: 'Comptoir de retrait', sink: 'Évier', togo: 'Étagère à emporter' }[at];
      return 'table' in at ? `Table ${at.table}` : `Case (${at.tile[0]}, ${at.tile[1]})`;
    },
  },
);

export type CargoWords = (typeof CARGO_WORDS)['en'];
