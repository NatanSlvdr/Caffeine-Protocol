import { count, type RobotRole } from '@/domain';
import { countFr, words } from '@/shared/language';

/**
 * What the crew says once a service is served, after the shift's own payoff: the robot's cheer, its delight at a new
 * best, and Niko's verdict on the stars. What they say when a run goes wrong is still English.
 */
export const REACTION_WORDS = words(
  {
    /** Niko, after a watched service with no payoff of its own. */
    watched: 'And that’s a whole service, start to finish. Easy when you watch it, right?',
    /** Stand-in cheers for shifts without a written payoff. */
    cheers: {
      query: ['*bip boop* Every order understood. Feeling: pleased?', '*bip* Zero errors. Is this… satisfaction?'],
      prep: ['*BEEP!* Every cup perfect! Ninety-two degrees!', '*sniff sniff* Smell that? Perfect service!'],
      floor: ['*ding ding!* Every guest served!', 'Zero spills! *bip* …Zero big spills.'],
    } satisfies Record<RobotRole, string[]>,
    /** A robot's delight at beating the shift's best, in stars, said even on a repeat: it's news every time. */
    newBest: {
      query: (stars: number, best: number) =>
        `*bip boop* ${count(stars, 'star')}, up from ${count(best, 'star')}. Recording: new best.`,
      prep: (stars: number, best: number) =>
        `*BEEP BEEP!* New best! ${count(stars, 'star')}, up from ${count(best, 'star')}!`,
      floor: (stars: number, best: number) =>
        `*ding ding ding!* Up from ${count(best, 'star')} to ${count(stars, 'star')}. New best!`,
    } satisfies Record<RobotRole, (stars: number, best: number) => string>,
    /** Niko names the star target that was missed, by how much, and why it matters in the café. */
    verdict: {
      one: (blocks: number, target: number) =>
        `Every guest served! The routine uses ${blocks} blocks, though, and ${target} would do: fewer blocks means less to fix when the menu changes.`,
      two: (steps: number, target: number) =>
        `Every guest served, with a tidy routine too! The robots still took ${steps} steps where ${target} would do: fewer steps and nobody waits as long.`,
      three: 'Three stars. That’s the tidiest routine I’ve ever seen.',
    },
  },
  {
    watched: 'Et voilà un service entier, du début à la fin. Facile quand on regarde, non ?',
    cheers: {
      query: [
        '*bip boop* Toutes les commandes comprises. Sentiment : content ?',
        '*bip* Zéro erreur. C’est ça… la satisfaction ?',
      ],
      prep: [
        '*BIP !* Chaque tasse parfaite ! Quatre-vingt-douze degrés !',
        '*snif snif* Vous sentez ? Service parfait !',
      ],
      floor: ['*ding ding !* Tous les clients servis !', 'Zéro goutte ! *bip* …Zéro grosse goutte.'],
    },
    newBest: {
      query: (stars, best) =>
        `*bip boop* ${countFr(stars, 'étoile')}, contre ${countFr(best, 'étoile')} avant. Enregistrement : nouveau record.`,
      prep: (stars, best) =>
        `*BIP BIP !* Nouveau record ! ${countFr(stars, 'étoile')}, contre ${countFr(best, 'étoile')} !`,
      floor: (stars, best) =>
        `*ding ding ding !* De ${countFr(best, 'étoile')} à ${countFr(stars, 'étoile')}. Nouveau record !`,
    },
    verdict: {
      one: (blocks, target) =>
        `Tous les clients servis ! Mais la routine utilise ${blocks} blocs, et ${target} suffiraient : moins de blocs, c’est moins à corriger quand la carte change.`,
      two: (steps, target) =>
        `Tous les clients servis, et avec une routine soignée ! Les robots ont quand même fait ${steps} pas là où ${target} suffiraient : moins de pas, et personne n’attend aussi longtemps.`,
      three: 'Trois étoiles. C’est la routine la plus soignée que j’aie jamais vue.',
    },
  },
);

export type ReactionWords = (typeof REACTION_WORDS)['en'];
