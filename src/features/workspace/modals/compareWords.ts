import { count } from '@/domain';
import { countFr, words } from '@/shared/language';
import type { Change } from '../compare';

/** A number in the reader's language, to a tenth: “12.5” in English, “12,5” in French. */
const tenths = (n: number, point: string) => n.toFixed(1).replace('.', point);

/**
 * The words of comparing two runs: their names in the lists, each row of the table and how it moved, and what changed
 * in the routines between them. Block names in a routine's lines are programming words, left as they are.
 */
export const COMPARE_WORDS = words(
  {
    kicker: 'This visit',
    title: 'Compare runs',
    none: 'Two runs of the same rounds can be compared: two services, or the same round practised twice. Run this shift again to set a change against the run before it.',
    before: 'Before',
    after: 'After',
    run: (id: number) => `Run ${id}`,
    caption: (before: number, after: number) => `Run ${before} against run ${after}`,
    change: 'Change',
    /** Which way a row moved, said to a screen reader beside the arrow. */
    changes: { better: 'better', worse: 'worse', same: 'no change' } as Record<Change, string>,
    routines: 'What changed in the routines',
    allSame: (crew: boolean) => `The same routines both times${crew ? ', for every robot' : ''}.`,
    diff: (robot: string, before: number, after: number) => `${robot}’s routine, run ${before} to run ${after}`,
    sameRoutine: (robots: string) => `${robots}: the same routine both times.`,
    and: 'and',
    done: 'Done',
    /** A run named for the lists: “Run 3 · Service · Served”, “Run 5 · Bench 1, eased · Stopped”. */
    name: {
      service: 'Service',
      bench: (n: string, eased: boolean) => `Bench ${n}${eased ? ', eased' : ''}`,
      practice: (round: number) => `Practice, round ${round}`,
      verdict: (served: boolean): string => (served ? 'Served' : 'Stopped'),
    },
    /** Where a stopped run stopped: “Query stopped · Round 2 · Guest 3”, or “Query’s routine won’t run”. */
    stopped: {
      stopped: 'Stopped',
      compile: (robot: string) => `${robot}’s routine won’t run`,
      robot: (robot: string) => `${robot} stopped`,
      round: (round: number) => `Round ${round}`,
      guest: (n: number) => `Guest ${n}`,
      closing: 'Closing time',
    },
    rows: {
      outcome: 'Outcome',
      served: 'Served',
      nowServed: 'Now served',
      nowStops: 'Now stops',
      rounds: 'Rounds right',
      guests: 'Guests served',
      of: (n: number, of: number) => `${n} of ${of}`,
      blocks: 'Blocks used',
      steps: 'Steps run',
      time: 'Service time',
      seconds: (s: number) => `${tenths(s, '.')} s`,
      mood: 'Guests’ mood',
      percent: (n: number) => `${n}%`,
      points: (n: number) => `${n} points`,
      stars: 'Stars',
      starCount: (n: number) => count(n, 'star'),
      same: 'Same',
      /** How far a number moved: “2 more”, “1.5 s fewer”. */
      moved: (amount: string, up: boolean) => `${amount} ${up ? 'more' : 'fewer'}`,
      unjudged:
        'A stopped run’s steps, time and mood only count up to where it stopped, so they’re judged when both runs were served.',
    },
  },
  {
    kicker: 'Cette visite',
    title: 'Comparer des essais',
    none: 'Deux essais des mêmes manches peuvent être comparés : deux services, ou la même manche entraînée deux fois. Relancez ce service pour comparer un changement à l’essai d’avant.',
    before: 'Avant',
    after: 'Après',
    run: (id) => `Essai ${id}`,
    caption: (before, after) => `Essai ${before} face à l’essai ${after}`,
    change: 'Écart',
    changes: { better: 'mieux', worse: 'moins bien', same: 'aucun changement' },
    routines: 'Ce qui a changé dans les routines',
    allSame: (crew) => `Les mêmes routines les deux fois${crew ? ', pour chaque robot' : ''}.`,
    diff: (robot, before, after) => `Routine de ${robot}, de l’essai ${before} à l’essai ${after}`,
    sameRoutine: (robots) => `${robots} : la même routine les deux fois.`,
    and: 'et',
    done: 'Terminé',
    name: {
      service: 'Service',
      bench: (n, eased) => `Banc ${n}${eased ? ', assoupli' : ''}`,
      practice: (round) => `Entraînement, manche ${round}`,
      verdict: (served) => (served ? 'Servi' : 'Arrêté'),
    },
    stopped: {
      stopped: 'Arrêté',
      compile: (robot) => `La routine de ${robot} ne peut pas tourner`,
      robot: (robot) => `${robot} s’est arrêté`,
      round: (round) => `Manche ${round}`,
      guest: (n) => `Client ${n}`,
      closing: 'Fermeture',
    },
    rows: {
      outcome: 'Issue',
      served: 'Servi',
      nowServed: 'Servi désormais',
      nowStops: 'S’arrête désormais',
      rounds: 'Manches réussies',
      guests: 'Clients servis',
      of: (n, of) => `${n} sur ${of}`,
      blocks: 'Blocs utilisés',
      steps: 'Pas exécutés',
      time: 'Durée du service',
      seconds: (s) => `${tenths(s, ',')} s`,
      mood: 'Humeur des clients',
      percent: (n) => `${n} %`,
      points: (n) => countFr(n, 'point'),
      stars: 'Étoiles',
      starCount: (n) => countFr(n, 'étoile'),
      same: 'Identique',
      moved: (amount, up) => `${amount} de ${up ? 'plus' : 'moins'}`,
      unjudged:
        'Les pas, le temps et l’humeur d’un essai arrêté ne comptent que jusqu’à son arrêt : ils ne sont jugés que si les deux essais ont été servis.',
    },
  },
);
