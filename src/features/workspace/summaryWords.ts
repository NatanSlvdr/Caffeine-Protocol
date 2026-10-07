import { words } from '@/shared/language';

const FR_NOUNS: Record<string, string> = { coffee: 'café', tea: 'thé' };

/** A drink on a counter or a table: “thé”, “2 thés”, and “boisson” for one not yet known. */
const frNoun = (item: string, n = 1) => {
  const noun = FR_NOUNS[item] ?? 'boisson';
  return n > 1 ? `${n} ${noun}s` : noun;
};

/** What a guest is having, with their possessive: “son café”, “sa boisson”, “ses boissons”. */
const frTheir = (drink: string) =>
  drink === 'drinks' ? 'ses boissons' : drink in FR_NOUNS ? `son ${FR_NOUNS[drink]}` : 'sa boisson';

const their = (drink: string) => `their ${drink || 'drink'}`;

/**
 * The words of the café told in words: the summary beside the scene, with each guest's visit, what the crew carries
 * and what waits on the counters, and what a screen reader hears happen as the service plays. A guest's drink is its
 * item, empty while it isn't known yet, or “drinks” for an order of several.
 */
export const SUMMARY_WORDS = words(
  {
    title: 'The café in words',
    guests: (served: number, total: number) => `Guests · ${served} of ${total} served`,
    nobody: 'No one in the café just now.',
    crew: 'Crew',
    counters: 'Counters',
    /** How a guest's visit stands, from walking up to heading out. */
    visit: {
      walkingUp: 'Walking up to the café',
      inLine: 'In line to order',
      ordering: 'Ordering at the register',
      waitingTable: 'Waiting for a table',
      walkingTo: (table: number) => `Walking to table ${table}`,
      seated: (table: number, drink: string) => `At table ${table}, waiting for ${their(drink)}`,
      toGo: (drink: string) => `Waiting for ${their(drink)} to go`,
      drinking: (table: number, drink: string) => `Drinking ${their(drink)} at table ${table}`,
      leaving: (drink: string) => `Leaving with ${their(drink)}`,
      out: 'Heading out',
      outServed: 'Heading out, served',
    },
    /** After what a robot is doing, what it holds. */
    carrying: (held: string) => `; carrying ${held}`,
    ticketsFor: (robot: string) => `Tickets for ${robot}`,
    pickup: 'Ready at pickup',
    tables: 'Left on the tables',
    none: 'None',
    /** Drinks of one kind on a counter, counted together: “2 tea to go”. */
    items: (item: string, toGo: boolean, n: number) =>
      `${n > 1 ? `${n} ` : ''}${item || 'drink'}${toGo ? ' to go' : ''}`,
    onTable: (item: string, table: number) => `${item || 'drink'} at table ${table}`,
    /** What happened, for a screen reader; `cup` names one cup of an order of several. */
    begins: (round: number, rounds: number) => `Round ${round} of ${rounds} begins`,
    walksIn: (name: string) => `${name} walks in`,
    toGo: (name: string, drink: string, cup?: string) => `${name} gets ${cup ?? their(drink)} to go`,
    served: (name: string, table: number, _drink: string, cup?: string) =>
      `${name} is served ${cup ? `${cup} ` : ''}at table ${table}`,
    leaves: (name: string) => `${name} leaves`,
    more: (n: number) => `And ${n} more.`,
  },
  {
    title: 'Le café en mots',
    guests: (served, total) => `Clients · ${served} ${served > 1 ? 'servis' : 'servi'} sur ${total}`,
    nobody: 'Personne dans le café pour l’instant.',
    crew: 'Équipe',
    counters: 'Comptoirs',
    visit: {
      walkingUp: 'Arrive au café',
      inLine: 'Fait la queue pour commander',
      ordering: 'Commande à la caisse',
      waitingTable: 'Attend une table',
      walkingTo: (table) => `Va à la table ${table}`,
      seated: (table, drink) => `À la table ${table}, attend ${frTheir(drink)}`,
      toGo: (drink) => `Attend ${frTheir(drink)} à emporter`,
      drinking: (table, drink) => `Boit ${frTheir(drink)} à la table ${table}`,
      leaving: (drink) => `Repart avec ${frTheir(drink)}`,
      out: 'Repart',
      outServed: 'Repart, commande servie',
    },
    carrying: (held) => ` ; porte ${held}`,
    ticketsFor: (robot) => `Tickets pour ${robot}`,
    pickup: 'Prêt au comptoir de retrait',
    tables: 'Laissé sur les tables',
    none: 'Rien',
    items: (item, toGo, n) => frNoun(item, n) + (toGo ? ' à emporter' : ''),
    onTable: (item, table) => `${frNoun(item)} à la table ${table}`,
    begins: (round, rounds) => `La manche ${round} sur ${rounds} commence`,
    walksIn: (name) => `${name} entre`,
    toGo: (name, drink, cup) => `${name} reçoit ${cup ?? frTheir(drink)} à emporter`,
    served: (name, table, drink, cup) => `${name} reçoit ${cup ?? frTheir(drink)} à la table ${table}`,
    leaves: (name) => `${name} repart`,
    more: (n) => `Et ${n} de plus.`,
  },
);

export type SummaryWords = (typeof SUMMARY_WORDS)['en'];
