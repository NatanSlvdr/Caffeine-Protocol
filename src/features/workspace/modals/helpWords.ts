import { words } from '@/shared/language';

/** A star target as Help sets it out: what a screen reader calls the stars, the target, and why it matters. */
interface Target {
  stars: string;
  goal: string;
  why: string;
}

/**
 * The words of a shift's field notes: the targets, the hints asked for one at a time, the clue's sentences and the
 * worked example's warning. The lesson, story, goal and idea are the shift's own, still in English. Block names are
 * programming words, so a clue quotes them as they read in the routine.
 */
export const HELP_WORDS = words(
  {
    kicker: (label: string) => `${label} · Field notes`,
    replay: 'Replay the intro',
    /** Why the greyed-out buttons are: the café is mid-service. */
    running: (example: boolean) => `Stop the service to replay the intro${example ? ' or use the example' : ''}.`,
    goal: 'Your goal:',
    targets: (blocks: number, steps: number): Target[] => [
      { stars: 'One star', goal: 'Every ticket correct', why: 'Every guest gets what they asked for' },
      { stars: 'Two stars', goal: `${blocks} blocks or fewer`, why: 'A short routine is easy to change' },
      { stars: 'Three stars', goal: `${steps} steps or fewer`, why: 'Every block run, by every robot' },
    ],
    challenges: 'Challenges · optional, for no stars',
    met: ' · Met',
    hints: 'Hints',
    /** The tiers, in the order they're asked for: the idea, a clue about the routine, the worked example. */
    tiers: ['Reminder', 'Clue', 'Worked example'],
    show: 'Show this block',
    drill: (shift: number, title: string) =>
      `The order rail’s Drills have one on this, from Shift ${shift}: “${title}”.`,
    warning: (robot: string, modifier: string) =>
      `The example replaces ${robot}’s routine. If you change your mind, Undo (${modifier} Z) brings your version back.`,
    keep: 'Keep my edits',
    replace: 'Replace my edits',
    /** The one button that climbs the tiers, by how many have been asked for; at the top it hides the example. */
    next: ['Remind me of the idea', 'Give me a clue', 'Reveal worked example', 'Hide worked example'],
    inUse: 'Example in use',
    use: 'Use this example',
    asked: (n: number, of: number) => `${n} of ${of} hints`,
    oneAtATime: 'Hints come one at a time',
    exampleFor: (robot: string) => `${robot}’s routine · the other robots keep theirs`,
    clue: {
      and: 'and',
      /** A block as the routine has it, quoted. */
      quote: (block: string) => `“${block}”`,
      elsewhere: (other: string, robot: string) =>
        `The last run stopped in ${other}’s routine, not ${robot}’s. Look there first.`,
      missing: (blocks: string, robot: string) =>
        `The worked example uses ${blocks}, which ${robot}’s routine doesn’t have yet.`,
      matches: (robot: string) => `${robot}’s routine matches the worked example, block for block.`,
      ends: (robot: string, block: string) =>
        `${robot}’s routine follows the worked example as far as it goes, then ends at ${block}, where the example carries on.`,
      beyond: (robot: string, block: string) =>
        `${robot}’s routine follows the whole worked example, then carries on at ${block}.`,
      first: (robot: string, block: string) =>
        `${robot}’s routine and the worked example part ways at the very first block, ${block}.`,
      parts: (robot: string, before: string, block: string) =>
        `${robot}’s routine follows the worked example as far as ${before}, then parts ways at ${block}.`,
    },
  },
  {
    kicker: (label) => `${label} · Notes de terrain`,
    replay: 'Revoir l’introduction',
    running: (example) => `Arrêtez le service pour revoir l’introduction${example ? ' ou utiliser l’exemple' : ''}.`,
    goal: 'Objectif :',
    targets: (blocks, steps) => [
      { stars: 'Une étoile', goal: 'Tous les bons justes', why: 'Chaque client reçoit ce qu’il a demandé' },
      { stars: 'Deux étoiles', goal: `${blocks} blocs au plus`, why: 'Une routine courte se modifie facilement' },
      { stars: 'Trois étoiles', goal: `${steps} pas au plus`, why: 'Chaque bloc exécuté, par chaque robot' },
    ],
    challenges: 'Défis · facultatifs, sans étoile',
    met: ' · Relevé',
    hints: 'Indices',
    tiers: ['Rappel', 'Indice', 'Exemple corrigé'],
    show: 'Montrer ce bloc',
    drill: (shift, title) =>
      `Les Exercices de la barre à bons en ont un là-dessus, du service ${shift} : « ${title} ».`,
    warning: (robot, modifier) =>
      `L’exemple remplace la routine de ${robot}. Si vous changez d’avis, Annuler (${modifier} Z) ramène votre version.`,
    keep: 'Garder mes modifications',
    replace: 'Remplacer mes modifications',
    next: ['Rappeler l’idée', 'Donner un indice', 'Révéler l’exemple corrigé', 'Masquer l’exemple corrigé'],
    inUse: 'Exemple utilisé',
    use: 'Utiliser cet exemple',
    asked: (n, of) => `${n} indice${n > 1 ? 's' : ''} sur ${of}`,
    oneAtATime: 'Les indices viennent un par un',
    exampleFor: (robot) => `Routine de ${robot} · les autres robots gardent la leur`,
    clue: {
      and: 'et',
      quote: (block) => `« ${block} »`,
      elsewhere: (other, robot) =>
        `Le dernier essai s’est arrêté dans la routine de ${other}, pas dans celle de ${robot}. Regardez-y d’abord.`,
      missing: (blocks, robot) => `L’exemple corrigé utilise ${blocks}, que la routine de ${robot} n’a pas encore.`,
      matches: (robot) => `La routine de ${robot} correspond à l’exemple corrigé, bloc pour bloc.`,
      ends: (robot, block) =>
        `La routine de ${robot} suit l’exemple corrigé aussi loin qu’elle va, puis s’arrête à ${block}, là où l’exemple continue.`,
      beyond: (robot, block) => `La routine de ${robot} suit tout l’exemple corrigé, puis continue à ${block}.`,
      first: (robot, block) => `La routine de ${robot} et l’exemple corrigé se séparent dès le premier bloc, ${block}.`,
      parts: (robot, before, block) =>
        `La routine de ${robot} suit l’exemple corrigé jusqu’à ${before}, puis s’en sépare à ${block}.`,
    },
  },
);
