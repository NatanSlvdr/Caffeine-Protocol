import { count } from '@/domain';
import { countFr, words } from '@/shared/language';
import type { WaitStage } from '../waits';

/**
 * The words of a service's receipt: the stars and totals against the shift's targets, where the guests' time went,
 * the challenges, and the way on. A shift's name and a special's thanks are its own, in the reader's language; a
 * wave's are still English.
 */
export const RECEIPT_WORDS = words(
  {
    title: 'Service complete',
    kicker: (label: string) => `${label} · Service receipt`,
    /** The watch-only shift is the opening day, before any robot: the café's people serve it by hand. */
    byHand: 'Niko, Moka and Pip served every order by hand.',
    served: 'Every order, taken care of.',
    stars: (n: number) => `${n} of 3 stars`,
    /** A missed target says how far off it was, so the next star is a number to beat, not a guess. */
    held: (over: number) => `Steps are on target too, but stars climb in order: trim ${count(over, 'block')} first.`,
    fewerBlocks: (over: number, target: number) =>
      `One more star: use ${count(over, 'fewer block')}, ${target} or fewer.`,
    fewerSteps: (over: number, target: number) =>
      `One more star: run ${count(over, 'fewer step')}, ${target} or fewer.`,
    newBest: (best: number) => `New best, up from ${count(best, 'star')}!`,
    bestStays: (best: number) => `Your best stays at ${count(best, 'star')}.`,
    guests: 'Guests served',
    blocks: 'Blocks used',
    steps: 'Steps run',
    together: 'Tables served together',
    /** How close a table's drinks came, the longest any table waited from its first drink to its last. */
    within: (tables: number, gap: number) => `· ${tables === 1 ? 'within' : 'all within'} ${gap} s`,
    /** The "/ 4" and the ✓ are drawn for the eye, so screen readers hear the target and the verdict instead. */
    target: (target: number, met: boolean) => `, star target ${target}, ${met ? 'met' : 'missed'}`,
    compare: (run: number) => `Compare with run ${run}`,
    waits: {
      ordering: 'Ordering',
      making: 'Making drinks',
      seating: 'Finding a table',
      clearing: 'Clearing a table',
      delivery: 'Carrying drinks out',
    } as Record<WaitStage, string>,
    /** What held guests up most, said once. */
    waitedMost: {
      ordering: 'Most of the guests’ wait was in line to order.',
      making: 'Most of the guests’ wait was for their drinks to be made.',
      seating: 'Most of the guests’ wait was for a free table.',
      clearing: 'Most of the guests’ wait was for a table to be cleared.',
      delivery: 'Most of the guests’ wait was for ready drinks to be carried out.',
    } as Record<WaitStage, string>,
    challenges: 'Challenges',
    optional: '· optional, for no stars',
    /** Whether this service met a challenge, and whether that's news. */
    verdict: (met: boolean, before: boolean): string =>
      met ? (before ? 'Met' : 'Met, for the first time') : before ? 'Not this time · met before' : 'Not yet',
    thisService: (amount: string) => `This service: ${amount}.`,
    nextUp: 'Thank you. Next up:',
    lastOrder: 'Last order of the day.',
    stay: 'Stay on this shift',
    backToCampaign: 'Back to the campaign',
    nextShift: 'Next shift',
    closing: 'Closing time',
  },
  {
    title: 'Service terminé',
    kicker: (label) => `${label} · Addition`,
    byHand: 'Niko, Moka et Pip ont servi chaque commande à la main.',
    served: 'Chaque commande, honorée.',
    stars: (n) => `${n} étoile${n > 1 ? 's' : ''} sur 3`,
    held: (over) =>
      `Les pas sont dans la cible aussi, mais les étoiles se gagnent dans l’ordre : retirez d’abord ${countFr(over, 'bloc')}.`,
    fewerBlocks: (over, target) => `Une étoile de plus : ${countFr(over, 'bloc')} de moins, ${target} au plus.`,
    fewerSteps: (over, target) => `Une étoile de plus : ${countFr(over, 'pas', 'pas')} de moins, ${target} au plus.`,
    newBest: (best) => `Nouveau record, contre ${countFr(best, 'étoile')} jusqu’ici !`,
    bestStays: (best) => `Votre record reste à ${countFr(best, 'étoile')}.`,
    guests: 'Clients servis',
    blocks: 'Blocs utilisés',
    steps: 'Pas exécutés',
    together: 'Tables servies ensemble',
    within: (tables, gap) => `· ${tables === 1 ? '' : 'toutes '}à ${String(gap).replace('.', ',')} s près`,
    target: (target, met) => `, cible ${target}, ${met ? 'atteinte' : 'manquée'}`,
    compare: (run) => `Comparer avec l’essai ${run}`,
    waits: {
      ordering: 'Commande',
      making: 'Préparation des boissons',
      seating: 'Attente d’une table',
      clearing: 'Débarrassage d’une table',
      delivery: 'Service des boissons',
    },
    waitedMost: {
      ordering: 'Les clients ont surtout attendu dans la file pour commander.',
      making: 'Les clients ont surtout attendu que leurs boissons soient préparées.',
      seating: 'Les clients ont surtout attendu une table libre.',
      clearing: 'Les clients ont surtout attendu qu’une table soit débarrassée.',
      delivery: 'Les clients ont surtout attendu qu’on leur apporte des boissons déjà prêtes.',
    },
    challenges: 'Défis',
    optional: '· facultatifs, sans étoile',
    verdict: (met, before) =>
      met
        ? before
          ? 'Relevé'
          : 'Relevé, pour la première fois'
        : before
          ? 'Pas cette fois · déjà relevé'
          : 'Pas encore',
    thisService: (amount) => `Ce service : ${amount}.`,
    nextUp: 'Merci. À suivre :',
    lastOrder: 'Dernière commande de la journée.',
    stay: 'Rester sur ce service',
    backToCampaign: 'Retour à la campagne',
    nextShift: 'Service suivant',
    closing: 'Fermeture',
  },
);
