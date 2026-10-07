import type { LegStage, OrderCup } from '@/domain';
import { words } from '@/shared/language';

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const FR_ORDINALS = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième'];
const FR_DRINKS: Record<string, string> = { coffee: 'café', tea: 'thé' };

/** A cup of an order by its drink, told apart when there are two of one: "tea", "second tea". */
const cupName = ({ item, nth }: OrderCup) => (nth ? `${ORDINALS[nth - 1] ?? `#${nth}`} ${item}` : item);
/** The same in French, after its article: “thé”, “deuxième thé”. Both drinks are masculine. */
const frCup = ({ item, nth }: OrderCup) =>
  (nth ? `${FR_ORDINALS[nth - 1] ?? `${nth}e`} ` : '') + (FR_DRINKS[item] ?? item);

/**
 * A leg of an order's way, as the order card says it. `who` did it; `cup` is the cup or ticket the leg is for, when the
 * order has several; `drink` names the one drink of a single-cup order where it is made; `table` is the guest's.
 */
export interface LegSay {
  stage: Exclude<LegStage, 'slip'>;
  who: string;
  cup?: OrderCup;
  drink?: string;
  toGo?: boolean;
  table: number;
}

/**
 * The words of looking back through a run: the timeline's jumps and what each moment was, and the card that follows
 * one guest's order through the café, leg by leg. What a guest said and why a robot stopped stay in English.
 */
export const ROUTE_WORDS = words(
  {
    leg: ({ stage, who, cup, drink, toGo, table }: LegSay): string => {
      const it = cup ? `the ${cupName(cup)}` : 'it';
      const ticket = cup ? `the ${cupName(cup)} ticket` : 'the ticket';
      switch (stage) {
        case 'arrive':
          return 'Walks in';
        case 'order':
          return `${who} takes the order`;
        case 'write':
          return `${who} writes ${ticket}`;
        case 'claim':
          return `${who} takes ${ticket}`;
        case 'make':
          return `${who} makes ${cup || !drink ? it : `the ${drink}`}`;
        case 'ready':
          return `${who} puts ${it} out for pickup`;
        case 'pickup':
          return `${who} picks ${it} up`;
        case 'serve':
          return toGo ? `${who} hands ${it} over to go` : `${who} serves ${it} at table ${table}`;
        case 'leave':
          return 'Leaves';
        case 'clear':
          return `${who} clears ${cup ? `the ${cupName(cup)} cup` : 'the cup'}`;
      }
    },
    /** One cup of an order of several, with its article: "the second tea". */
    cup: (cup: OrderCup) => `the ${cupName(cup)}`,
    /** Before why a robot stopped. */
    stopped: (who: string) => `${who} stopped: `,
    /** Anyone the café doesn't know by name, by their place in their round's line. */
    guest: (n: number) => `Guest ${n}`,
    following: (name: string) => `Following ${name}`,
    followingLabel: (name: string) => `Following ${name}’s order`,
    round: (n: number) => `Round ${n}`,
    stop: 'Stop following',
    notIn: 'Not in the café yet.',
    onItsWay: 'On its way…',
    /** A moment on the timeline, for a screen reader and a tick's title. */
    order: (who: string) => `${who} takes an order`,
    /** Between taking an order and what the guest said. */
    heard: ': ',
    timeline: 'Look back through the run',
    time: 'Service time',
    at: (when: string, earlier: boolean) => `${when}, ${earlier ? 'earlier' : 'now'}`,
    jumpBetween: 'Jump between',
    kinds: {
      all: ['Key moments', 'Previous key moment', 'Next key moment'],
      order: ['Orders', 'Previous order', 'Next order'],
      handoff: ['Handoffs', 'Previous handoff', 'Next handoff'],
    } as Record<'all' | 'order' | 'handoff', [string, string, string]>,
    /** The open robot's blocks, or lines in the text view. */
    robot: (name: string, lines: boolean): [string, string, string] => {
      const unit = lines ? 'line' : 'block';
      return [`${name}’s ${unit}s`, `${name}’s previous ${unit}`, `${name}’s next ${unit}`];
    },
    backToNow: 'Back to now',
    /** The next button, with nothing after the moment on screen. */
    nextToNow: (next: string) => `${next}: back to now`,
    follow: 'Follow an order',
    pick: 'Follow an order…',
  },
  {
    leg: ({ stage, who, cup, drink, toGo, table }) => {
      const the = cup ? `le ${frCup(cup)}` : drink ? `le ${FR_DRINKS[drink] ?? drink}` : undefined;
      const ticket = cup ? `le ticket du ${frCup(cup)}` : 'le ticket';
      // Without a cup to name, the drink is “le”, said before the verb.
      const does = (verb: string, rest = '') =>
        cup ? `${who} ${verb} le ${frCup(cup)}${rest}` : `${who} le ${verb}${rest}`;
      switch (stage) {
        case 'arrive':
          return 'Entre';
        case 'order':
          return `${who} prend la commande`;
        case 'write':
          return `${who} écrit ${ticket}`;
        case 'claim':
          return `${who} prend ${ticket}`;
        case 'make':
          return the ? `${who} prépare ${the}` : `${who} le prépare`;
        case 'ready':
          return does('pose', ' au comptoir de retrait');
        case 'pickup':
          return does('récupère');
        case 'serve':
          return toGo ? does('remet', ' à emporter') : does('sert', ` à la table ${table}`);
        case 'leave':
          return 'Repart';
        case 'clear':
          return `${who} débarrasse ${cup ? `la tasse du ${frCup(cup)}` : 'la tasse'}`;
      }
    },
    cup: (cup) => `le ${frCup(cup)}`,
    stopped: (who) => `${who} s’est arrêté : `,
    guest: (n) => `Client ${n}`,
    following: (name) => `Suivi : ${name}`,
    followingLabel: (name) => `Suivi de la commande de ${name}`,
    round: (n) => `Manche ${n}`,
    stop: 'Arrêter le suivi',
    notIn: 'Pas encore dans le café.',
    onItsWay: 'En route…',
    order: (who) => `${who} prend une commande`,
    heard: ' : ',
    timeline: 'Revenir sur l’essai',
    time: 'Temps du service',
    at: (when, earlier) => `${when}, ${earlier ? 'plus tôt' : 'maintenant'}`,
    jumpBetween: 'Sauter entre',
    kinds: {
      all: ['Moments clés', 'Moment clé précédent', 'Moment clé suivant'],
      order: ['Commandes', 'Commande précédente', 'Commande suivante'],
      handoff: ['Passages de relais', 'Passage de relais précédent', 'Passage de relais suivant'],
    },
    robot: (name, lines) =>
      lines
        ? [`Lignes de ${name}`, `Ligne précédente de ${name}`, `Ligne suivante de ${name}`]
        : [`Blocs de ${name}`, `Bloc précédent de ${name}`, `Bloc suivant de ${name}`],
    backToNow: 'Revenir à maintenant',
    nextToNow: (next) => `${next} : revenir à maintenant`,
    follow: 'Suivre une commande',
    pick: 'Suivre une commande…',
  },
);

export type RouteWords = (typeof ROUTE_WORDS)['en'];
