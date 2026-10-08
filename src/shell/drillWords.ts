import { count } from '@/domain';
import { countFr, words } from '@/shared/language';

const done = (n: number) => (n > 1 ? 'faits' : 'fait');

/**
 * The drills window's words: the list by act and by flight, a flight's progress, and the frame around each drill. A
 * drill's own title, question and idea, a flight's and a kit's rule are the drill's, told in data/drills.fr.ts; why the
 * café turned a pick away is the simulation's, and stays English, as the blocks do everywhere.
 */
export const DRILL_WORDS = words(
  {
    kicker: (cafe: string) => `${cafe} · Away from the rail`,
    title: 'Drills.',
    intro:
      'One idea from a served shift at a time: fill the gap in a routine, call which block runs next, or build a passage from a kit that leaves a block out, and the café plays it out. A flight plays the drills on one idea one after another. A drill got right on the first pick, or a kit once served, is ticked; none of it counts toward stars.',
    kinds: { gap: 'Fill the gap', next: 'What runs next', kit: 'From a kit' },
    /** After a ticked drill's name, for a screen reader. */
    done: ', done',
    shift: (n: number) => `Shift ${n}`,
    fresh: 'New',
    tally: (ticked: number, total: number, waiting: number) =>
      `${ticked} of ${count(total, 'drill')} done.` +
      (waiting > 0
        ? ` ${count(waiting, 'more drill')} ${waiting === 1 ? 'opens' : 'open'} as later shifts are served.`
        : ''),
    flights: {
      label: 'Flights, by idea',
      head: 'Flights · By idea',
      progress: (ticks: number, n: number) => `${ticks} of ${count(n, 'drill')} done`,
      size: (n: number) => count(n, 'drill'),
      more: (n: number, shift: number) => ` · ${n} more once Shift ${shift} is served`,
      opens: (shift: number) => ` · Opens once Shift ${shift} is served`,
    },
    step: {
      label: (flight: string, i: number, n: number) => `${flight}, drill ${i} of ${n}`,
      count: (i: number, n: number) => `${i} of ${n}`,
      end: 'End of the flight',
      /** Before the next drill's name. */
      next: 'Next:',
    },
    back: 'All drills',
    /** Over the routine, before the shift's own name. */
    routine: (robot: string, shift: number) => `${robot}’s routine on Shift ${shift}, `,
    gap: 'The gap',
    restOfGap: 'The rest of the gap',
    passages: 'Passages',
    blocks: 'Blocks',
    served: 'Served.',
    notServed: 'Not served.',
    tryAnother: 'Try another passage.',
    takeBackAndTry: 'Take blocks back and try again.',
    /** Between the blocks of a passage read as one sentence. */
    then: ', then ',
    kit: {
      name: 'The kit',
      each: (n: number) => `${count(n, 'block')}, each used once`,
      placed: (block: string, n: number, of: number) => `${block} placed, ${n} of ${of}.`,
      takenBack: (block: string) => `${block} taken back.`,
      takeBack: 'Take back the last block',
      serve: 'Serve the shift',
    },
    next: {
      question: (robot: string) => `Which block does ${robot} run next?`,
      says: 'The guest says',
      holds: (robot: string) => `${robot} holds`,
      remembers: (robot: string) => `${robot} remembers`,
      justRan: 'just ran',
      ranNext: 'ran next',
      calledIt: 'Called it.',
      notThisTime: 'Not this time.',
      ran: (robot: string, letter: string, block: string) => `${robot} ran ${letter}, ${block}, next.`,
      choice: (letter: string, block: string) => `${letter}: ${block}`,
    },
  },
  {
    kicker: (cafe) => `${cafe} · Loin de la barre`,
    title: 'Exercices.',
    intro:
      'Une idée à la fois, tirée d’un service déjà assuré : complétez le trou dans une routine, devinez quel bloc s’exécute ensuite, ou construisez un passage avec un kit auquel il manque un bloc, et le café le joue. Une série enchaîne les exercices sur une même idée. Un exercice réussi du premier coup, ou un kit servi une fois, est coché ; rien de tout cela ne compte pour les étoiles.',
    kinds: { gap: 'Compléter le trou', next: 'Ce qui s’exécute ensuite', kit: 'Avec un kit' },
    done: ', fait',
    shift: (n) => `Service ${n}`,
    fresh: 'Nouveau',
    tally: (ticked, total, waiting) =>
      `${ticked} ${done(ticked)} sur ${countFr(total, 'exercice')}.` +
      (waiting > 0
        ? ` ${countFr(waiting, 'autre exercice', 'autres exercices')} ${waiting === 1 ? 's’ouvre' : 's’ouvrent'} à mesure que les services suivants sont assurés.`
        : ''),
    flights: {
      label: 'Séries, par idée',
      head: 'Séries · Par idée',
      progress: (ticks, n) => `${ticks} ${done(ticks)} sur ${countFr(n, 'exercice')}`,
      size: (n) => countFr(n, 'exercice'),
      more: (n, shift) => ` · ${n} de plus une fois le service ${shift} assuré`,
      opens: (shift) => ` · S’ouvre une fois le service ${shift} assuré`,
    },
    step: {
      label: (flight, i, n) => `${flight}, exercice ${i} sur ${n}`,
      count: (i, n) => `${i} sur ${n}`,
      end: 'Fin de la série',
      next: 'Suivant :',
    },
    back: 'Tous les exercices',
    routine: (robot, shift) => `La routine de ${robot} au service ${shift}, `,
    gap: 'Le trou',
    restOfGap: 'Le reste du trou',
    passages: 'Passages',
    blocks: 'Blocs',
    served: 'Servi.',
    notServed: 'Pas servi.',
    tryAnother: 'Essayez un autre passage.',
    takeBackAndTry: 'Reprenez des blocs et réessayez.',
    then: ', puis ',
    kit: {
      name: 'Le kit',
      each: (n) => `${countFr(n, 'bloc')}, chacun utilisé une fois`,
      placed: (block, n, of) => `${block} posé, ${n} sur ${of}.`,
      takenBack: (block) => `${block} repris.`,
      takeBack: 'Reprendre le dernier bloc',
      serve: 'Lancer le service',
    },
    next: {
      question: (robot) => `Quel bloc ${robot} exécute-t-il ensuite ?`,
      says: 'Le client dit',
      holds: (robot) => `${robot} porte`,
      remembers: (robot) => `${robot} retient`,
      justRan: 'vient de s’exécuter',
      ranNext: 's’est exécuté ensuite',
      calledIt: 'Bien vu.',
      notThisTime: 'Pas cette fois.',
      ran: (robot, letter, block) => `Ensuite, ${robot} a exécuté ${letter}, ${block}.`,
      choice: (letter, block) => `${letter} : ${block}`,
    },
  },
);
