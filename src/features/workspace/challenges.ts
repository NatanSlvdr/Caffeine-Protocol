import { countFr, words } from '@/shared/language';
import { count, measureService, meetsChallenge, type Challenge, type ChallengeMeasure, type RunResult } from '@/domain';

interface ChallengeWords {
  name: string;
  /** What meeting it takes. */
  goal: (target: number) => string;
  /** A service's measure, as the receipt reads it. */
  amount: (value: number) => string;
  /** The café fact the challenge turns on, or what it pulls against: never which blocks to write. */
  note: string;
}

/**
 * Each challenge in the café's words. The notes are claims about the café, and tests/unit/data/challenges.test.ts runs
 * routines that bear each one out.
 */
export const CHALLENGE_WORDS = words<Record<ChallengeMeasure, ChallengeWords>>(
  {
    walk: {
      name: 'Short legs',
      goal: (target) => `Porter walks ${count(target, 'tile')} or fewer over the whole service.`,
      amount: (value) => count(value, 'tile'),
      note: 'A guest drinks up in 12 s, sooner than Porter can walk back to the counter and out to the table again.',
    },
    wait: {
      name: 'No long waits',
      goal: (target) => `No guest waits more than ${target} s from walking in to their last drink.`,
      amount: (value) => `${value} s`,
      note: 'Fewer steps aren’t a quicker service: Brew claiming two tickets before making either runs fewer steps, but keeps the first guest waiting on the second order.',
    },
    rush: {
      name: 'Rush first',
      goal: (target) => `Every guest in a rush has their drinks within ${target} s of walking in.`,
      amount: (value) => `${value} s`,
      note: 'A rush order jumps the queue, but not the robot: it waits on whatever its robot is in the middle of. Brew claiming two tickets before making either holds rush orders up, even making each one first.',
    },
    close: {
      name: 'Early night',
      goal: (target) => `Every round is over within ${target} s, from opening to the whole crew stopped.`,
      amount: (value) => `${value} s`,
      note: 'Stopping at the closing call is the easy part. How soon the night ends is every walk and wait of the service added up, and fewer steps don’t bring it in: Brew claiming two tickets at a time runs fewer, and closes later.',
    },
  },
  {
    walk: {
      name: 'Petites jambes',
      goal: (target) => `Porter parcourt ${countFr(target, 'case')} au plus sur tout le service.`,
      amount: (value) => countFr(value, 'case'),
      note: 'Un client finit son verre en 12 s, avant que Porter ait pu revenir au comptoir puis repartir jusqu’à la table.',
    },
    wait: {
      name: 'Pas de longue attente',
      goal: (target) => `Aucun client n’attend plus de ${seconds(target)} entre son arrivée et sa dernière boisson.`,
      amount: seconds,
      note: 'Moins de pas ne font pas un service plus rapide : si Brew prend deux bons avant de préparer l’un ou l’autre, il exécute moins de pas, mais fait attendre le premier client pendant la deuxième commande.',
    },
    rush: {
      name: 'Les pressés d’abord',
      goal: (target) => `Chaque client pressé a ses boissons moins de ${seconds(target)} après son arrivée.`,
      amount: seconds,
      note: 'Une commande pressée passe devant la file, mais pas devant le robot : elle attend qu’il finisse ce qu’il a en cours. Si Brew prend deux bons avant de préparer l’un ou l’autre, il retient les commandes pressées, même en préparant chacune en premier.',
    },
    close: {
      name: 'Fermer tôt',
      goal: (target) =>
        `Chaque manche se termine en ${seconds(target)} au plus, de l’ouverture à l’arrêt de toute l’équipe.`,
      amount: seconds,
      note: 'S’arrêter à l’annonce de la fermeture est la partie facile. L’heure où la soirée finit, c’est chaque trajet et chaque attente du service mis bout à bout, et moins de pas ne l’avancent pas : si Brew prend deux bons à la fois, il en exécute moins, et ferme plus tard.',
    },
  },
);

/** Seconds with a decimal comma: “2,5 s”. */
function seconds(value: number) {
  return `${String(value).replace('.', ',')} s`;
}

/** One challenge as a run left it. */
export interface ChallengeOutcome {
  challenge: Challenge;
  words: ChallengeWords;
  /** This run's measure, as the receipt reads it. */
  value: number;
  met: boolean;
  /** Met on an earlier service, as the save had it before this one. */
  before: boolean;
}

export function challengeOutcomes(
  challenges: readonly Challenge[],
  result: RunResult,
  metBefore: readonly ChallengeMeasure[] = [],
  say: Record<ChallengeMeasure, ChallengeWords> = CHALLENGE_WORDS.en,
): ChallengeOutcome[] {
  return challenges.map((challenge) => ({
    challenge,
    words: say[challenge.measure],
    value: measureService(challenge.measure, result),
    met: meetsChallenge(challenge, result),
    before: metBefore.includes(challenge.measure),
  }));
}

/** The challenges a run meets, by the names the save keeps them under. */
export const challengesMet = (challenges: readonly Challenge[] | undefined, result: RunResult): ChallengeMeasure[] =>
  (challenges ?? []).filter((challenge) => meetsChallenge(challenge, result)).map((challenge) => challenge.measure);
