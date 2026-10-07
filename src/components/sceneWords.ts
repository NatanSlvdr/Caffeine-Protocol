import { placeName } from '@/domain';
import type { IconOrder, Place } from '@/domain';
import { countFr, words } from '@/shared/language';

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const FR_STATIONS: Record<Exclude<Place, { table: number }>, string> = {
  paper: 'Papier',
  register: 'Caisse',
  handoff: 'Passe de la cuisine',
  storage: 'Réserve',
  machine: 'Machine à café',
  sink: 'Évier',
  sugar: 'Sucre',
  lids: 'Couvercles',
  pickup: 'Comptoir de retrait',
  shelf: 'Étagère à emporter',
};

const FR_DRINKS: Record<string, string> = { coffee: 'café', tea: 'thé' };

/**
 * The words drawn in the café itself: the stations' floor lettering, the bubbles over the robots with what each is
 * doing, carrying and keeping in memory, the order queue at the handoff, and what a guest's order icons say. Block
 * names on an action chip are programming words and stay as they are; so do what guests and Niko say.
 */
export const SCENE_WORDS = words(
  {
    scene: 'The café: kitchen, order counter and dining room',
    /** The lettering on the floor by each station, shown while the routine is written. */
    floor: {
      handoff: 'ORDER HANDOFF',
      storage: 'STORAGE',
      machine: 'COFFEE MACHINE',
      sugar: 'SUGAR',
      lids: 'LIDS',
      pickup: 'DRINK PICKUP',
      sink: 'SINK',
      shelf: 'TO-GO SHELF',
      enter: 'ENTER',
    },
    /** A stand-in working on its own, before its routine is the player's to write. */
    auto: (name: string) => `${name} · Auto`,
    holding: (name: string) => `${name} is holding`,
    inventory: (name: string) => `${name} inventory`,
    memory: (name: string) => `${name} memory`,
    thinking: 'Thinking',
    /** The station a hand action reaches into, on its chip: "Sugar", "Table 3". */
    station: (place: Place) => capital(placeName(place).replace(/^the /, '')),
    action: (name: string, action: string, station?: string) => `${name}: ${action}${station ? ` at ${station}` : ''}`,
    /** The marks on an order or a cup. */
    marks: { toGo: 'To go', lid: 'Lid', rush: 'Rush', together: 'Together' },
    queue: 'Kitchen order queue',
    orders: 'Orders',
    waiting: 'Waiting orders',
    noneWaiting: 'None waiting',
    heard: 'Heard orders',
    /** One kind of drink in an order, as its icon reads out: "coffee ×2 + 1 sugar, to go". */
    order: ({ item, quantity, sugar, toGo, rush, together }: IconOrder & { quantity: number }) =>
      (item ? `${item} ×${quantity}` : `Unclear order${quantity > 1 ? ` ×${quantity}` : ''}`) +
      (sugar ? ` + ${sugar} sugar` : '') +
      (toGo ? ', to go' : '') +
      (rush ? ', in a rush' : '') +
      (together ? ', together' : ''),
  },
  {
    scene: 'Le café : cuisine, comptoir des commandes et salle',
    floor: {
      handoff: 'PASSE CUISINE',
      storage: 'RÉSERVE',
      machine: 'MACHINE À CAFÉ',
      sugar: 'SUCRE',
      lids: 'COUVERCLES',
      pickup: 'RETRAIT BOISSONS',
      sink: 'ÉVIER',
      shelf: 'À EMPORTER',
      enter: 'ENTRÉE',
    },
    auto: (name) => `${name} · Auto`,
    holding: (name) => `Ce que porte ${name}`,
    inventory: (name) => `Inventaire de ${name}`,
    memory: (name) => `Mémoire de ${name}`,
    thinking: 'Réfléchit',
    station: (place) => (typeof place === 'object' ? `Table ${place.table}` : FR_STATIONS[place]),
    action: (name, action, station) => `${name} : ${action}${station ? `, ${station}` : ''}`,
    marks: { toGo: 'À emporter', lid: 'Couvercle', rush: 'Pressé', together: 'Ensemble' },
    queue: 'File des commandes de la cuisine',
    orders: 'Commandes',
    waiting: 'Commandes en attente',
    noneWaiting: 'Aucune en attente',
    heard: 'Commandes entendues',
    order: ({ item, quantity, sugar, toGo, rush, together }) =>
      (item ? `${FR_DRINKS[item] ?? item} ×${quantity}` : `Commande floue${quantity > 1 ? ` ×${quantity}` : ''}`) +
      (sugar ? ` + ${countFr(sugar, 'sucre')}` : '') +
      (toGo ? ', à emporter' : '') +
      (rush ? ', pressé' : '') +
      (together ? ', ensemble' : ''),
  },
);
