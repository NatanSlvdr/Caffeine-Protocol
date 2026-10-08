import { count, type BenchEase, type BenchSugar, type Drink } from '@/domain';
import { countFr, words } from '@/shared/language';

/** One ticket a bench guest should get, as the bench says it: the drink, its sugar, to go and rushed. */
interface TicketWords {
  drink: Record<Drink, string>;
  sugars: (n: number) => string;
  sugar: (sugar: boolean) => string;
  toGo: string;
  rush: string;
  and: string;
}

/**
 * The words of the test bench: its guests, what each asks for and should get, and the shift's rules it can ease. What
 * a guest says stays in English, quoted: it's what Query hears, and a routine listens for its words.
 */
export const BENCH_WORDS = words(
  {
    kicker: 'For no stars',
    title: 'Test bench',
    intro:
      'Write the guests to run the routines on: what each asks for, and when they come in. What each should get is worked out the way it is for the shift’s own guests.',
    startFrom: 'Start from',
    startFromLabel: 'Start from a round of the shift',
    round: (n: number) => `Round ${n}`,
    shiftsGuests: 'The shift’s guests',
    guests: (n: number) => count(n, 'guest'),
    empty: 'No guests on the bench. Add one, or start from the shift’s guests.',
    list: 'Bench guests',
    full: (most: number) => `The bench takes ${most} guests`,
    add: 'Add a guest',
    easeLegend: 'Ease the shift’s rules',
    easeNote: 'Practise one thing at a time. A bench that goes right eased says less: the shift keeps its own rules.',
    notKept: 'This browser isn’t keeping the bench, so it lasts until the café closes.',
    running: 'Stop the service to run the bench.',
    run: (guests: number, eased: boolean) => `Run the bench · ${count(guests, 'guest')}${eased ? ' · eased' : ''}`,
    addToRun: 'Add a guest to run the bench',
    added: (n: number) => `Guest ${n} added.`,
    /** A guest taken off the bench, and, when guests came after, that they move up a number. */
    removed: (n: number, after: boolean) =>
      `Guest ${n} removed.${after ? ` The guests after are numbered on from ${n}.` : ''}`,
    copied: (round: number, guests: number) => `Copied round ${round}: ${count(guests, 'guest')}.`,
    guest: (n: number) => `Guest ${n}`,
    opens: 'Comes in as the café opens',
    comesIn: (guest: number) => `Guest ${guest} comes in`,
    after: (gap: number, guest: number) => `${gap} s after guest ${guest}`,
    /** A guest's choice for a screen reader; `order` counts their drinks once they ask for more than one. */
    choice: (guest: number, order: number | undefined, what: 'drink' | 'sugar') =>
      `Guest ${guest}${order ? `, drink ${order}` : ''}: ${what}`,
    remove: (guest: number, order?: number) => `Remove guest ${guest}${order ? `, drink ${order}` : ''}`,
    drinks: { coffee: 'Coffee', tea: 'Tea' } as Record<Drink, string>,
    sugar: (sugar: BenchSugar): string =>
      typeof sugar === 'number'
        ? count(sugar, 'sugar')
        : { plain: 'No word on sugar', with: 'With sugar', without: 'Without sugar' }[sugar],
    toGo: 'To go',
    rush: 'In a rush',
    another: 'Another drink',
    together: 'Orders together',
    mumbles: 'Mumbles first',
    /** Whether what a guest asks for has run out, and what they have instead. */
    soldOut: {
      label: (guest: number) => `Guest ${guest}: is their drink in?`,
      in: 'Their drink is in',
      switch: 'Sold out: has the other',
      leave: 'Sold out: goes without',
      nothing: 'nothing',
    },
    /** What a guest says, around their quoted words: “Says “Tea”” or, mumbling first, the usual then the order. */
    says: ['Says “', '”'] as [string, string],
    mumbled: ['Mumbles “', '”, then says “', '” once asked'] as [string, string, string],
    shouldGet: 'Should get',
    /** A guest who mumbles gets their drink once Query has asked for help. */
    onceHelped: (robot: string) => `, once ${robot} asks for help`,
    ticket: {
      drink: { coffee: 'coffee', tea: 'tea' },
      sugars: (n) => count(n, 'sugar'),
      sugar: (sugar) => (sugar ? 'sugar' : 'no sugar'),
      toGo: 'to go',
      rush: 'rushed',
      and: 'and',
    } as TicketWords,
    /** A rule a bench can ease, as the bench offers it: what it's called, and what changes on this shift. */
    eases: {
      cups: { label: 'Twice the cups', detail: (cups: number) => `${cups * 2} cups instead of ${cups}.` },
      load: {
        label: 'One at a time will do',
        detail: (porter: boolean, load: number) =>
          `${porter ? 'Porter can carry' : 'Brew can make'} one drink a trip, not ${load}.`,
      },
      closing: { label: 'No closing time', detail: 'Nobody calls closing, so no robot has to stop.' },
    },
    /** The rules a bench run eased, said after “with”: “twice the cups and no closing time”. */
    eased: { cups: 'twice the cups', load: 'one at a time', closing: 'no closing time' } as Record<BenchEase, string>,
    and: 'and',
  },
  {
    kicker: 'Sans étoiles',
    title: 'Banc d’essai',
    intro:
      'Écrivez les clients sur qui essayer les routines : ce que chacun demande, et quand il arrive. Ce que chacun doit recevoir se déduit comme pour les clients du service.',
    startFrom: 'Partir de',
    startFromLabel: 'Partir d’une manche du service',
    round: (n) => `La manche ${n}`,
    shiftsGuests: 'Les clients du service',
    guests: (n) => countFr(n, 'client'),
    empty: 'Aucun client sur le banc. Ajoutez-en un, ou partez des clients du service.',
    list: 'Clients du banc',
    full: (most) => `Le banc accueille ${most} clients`,
    add: 'Ajouter un client',
    easeLegend: 'Assouplir les règles du service',
    easeNote:
      'Entraînez-vous à une chose à la fois. Un banc réussi avec des règles assouplies en dit moins : le service garde les siennes.',
    notKept: 'Ce navigateur ne garde pas le banc : il dure jusqu’à la fermeture du café.',
    running: 'Arrêtez le service pour lancer le banc.',
    run: (guests, eased) => `Lancer le banc · ${countFr(guests, 'client')}${eased ? ' · assoupli' : ''}`,
    addToRun: 'Ajoutez un client pour lancer le banc',
    added: (n) => `Client ${n} ajouté.`,
    removed: (n, after) =>
      `Client ${n} retiré.${after ? ` Les clients suivants sont renumérotés à partir de ${n}.` : ''}`,
    copied: (round, guests) => `Manche ${round} copiée : ${countFr(guests, 'client')}.`,
    guest: (n) => `Client ${n}`,
    opens: 'Arrive à l’ouverture du café',
    comesIn: (guest) => `Arrivée du client ${guest}`,
    after: (gap, guest) => `${gap} s après le client ${guest}`,
    choice: (guest, order, what) =>
      `Client ${guest}${order ? `, commande ${order}` : ''} : ${what === 'drink' ? 'boisson' : 'sucre'}`,
    remove: (guest, order) =>
      order ? `Retirer la commande ${order} du client ${guest}` : `Retirer le client ${guest}`,
    drinks: { coffee: 'Café', tea: 'Thé' },
    sugar: (sugar) =>
      typeof sugar === 'number'
        ? countFr(sugar, 'sucre')
        : { plain: 'Sucre non précisé', with: 'Avec sucre', without: 'Sans sucre' }[sugar],
    toGo: 'À emporter',
    rush: 'Pressé',
    another: 'Une autre boisson',
    together: 'Commande le tout ensemble',
    mumbles: 'Marmonne d’abord',
    soldOut: {
      label: (guest) => `Client ${guest} : reste-t-il sa boisson ?`,
      in: 'Il reste sa boisson',
      switch: 'Épuisée : prend l’autre',
      leave: 'Épuisée : repart sans rien',
      nothing: 'rien',
    },
    says: ['Dit « ', ' »'],
    mumbled: ['Marmonne « ', ' », puis dit « ', ' » une fois interrogé'],
    shouldGet: 'Doit recevoir',
    onceHelped: (robot) => `, une fois que ${robot} a demandé de l’aide`,
    ticket: {
      drink: { coffee: 'café', tea: 'thé' },
      sugars: (n) => countFr(n, 'sucre'),
      sugar: (sugar) => (sugar ? 'sucre' : 'sans sucre'),
      toGo: 'à emporter',
      rush: 'pressé',
      and: 'et',
    },
    eases: {
      cups: { label: 'Deux fois plus de tasses', detail: (cups) => `${cups * 2} tasses au lieu de ${cups}.` },
      load: {
        label: 'Une à la fois suffit',
        detail: (porter, load) =>
          `${porter ? 'Porter peut apporter' : 'Brew peut préparer'} une boisson par trajet, au lieu de ${load}.`,
      },
      closing: {
        label: 'Pas d’heure de fermeture',
        detail: 'Personne n’annonce la fermeture : aucun robot n’a à s’arrêter.',
      },
    },
    /** French says each eased rule whole, with its own “avec” or “sans”. */
    eased: { cups: 'avec deux fois plus de tasses', load: 'une boisson à la fois', closing: 'sans heure de fermeture' },
    and: 'et',
  },
);
