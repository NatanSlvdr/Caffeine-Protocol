import { words } from '@/shared/language';
import { HANDOVERS } from './handover';
import type { Handover } from './handover';

/** A helper's job as the card says it: who still does the rest, and each step, short and in full. */
interface Job {
  still: string;
  steps: { short: string; text: string }[];
}

/**
 * The words of the handover card: the job a robot takes over on its first shift and how much of it the routine does.
 * The jobs themselves are written once in `HANDOVERS`; the French follows them step by step. The block each step
 * takes is a programming word, named as its tile names it.
 */
export const HANDOVER_WORDS = words(
  {
    takingOver: (helper: string) => `Taking over from ${helper}`,
    count: (done: number, steps: number, robot: string) => `· ${done} of ${steps} in ${robot}’s routine`,
    fold: (open: boolean): string => (open ? 'Fold the steps' : 'Show the steps'),
    steps: (helper: string) => `${helper}’s steps`,
    lead: (helper: string, robot: string) => `${helper}’s job is ${robot}’s now.`,
    title: (step: string, block: string) => `${step}: ${block}`,
    /** A step for a screen reader, which hears it whole rather than the word in the row. */
    step: (step: string, block: string, done: boolean, robot: string) =>
      `${step}, with ${block}: ${done ? 'done.' : `not in ${robot}’s routine yet.`}`,
    /** The first missing step, around the step itself: “Not in Brew’s routine yet: grind…, with a Use up block.” */
    missing: (robot: string) => `Not in ${robot}’s routine yet: `,
    withBlock: (block: string) => `, with a ${block} block.`,
    covered: (robot: string, helper: string) =>
      `${robot}’s routine covers all of ${helper}’s job. Run the service to see it work.`,
    jobs: Object.fromEntries(
      HANDOVERS.map(({ role, still, steps }) => [
        role,
        { still, steps: steps.map(({ short, text }) => ({ short, text })) },
      ]),
    ) as Record<Handover['role'], Job>,
  },
  {
    takingOver: (helper) => `Prend le relais de ${helper}`,
    count: (done, steps, robot) => `· ${done} sur ${steps} dans la routine de ${robot}`,
    fold: (open) => (open ? 'Replier les étapes' : 'Afficher les étapes'),
    steps: (helper) => `Les étapes de ${helper}`,
    lead: (helper, robot) => `Le travail de ${helper} revient désormais à ${robot}.`,
    title: (step, block) => `${step} : ${block}`,
    step: (step, block, done, robot) =>
      `${step}, avec ${block} : ${done ? 'fait.' : `pas encore dans la routine de ${robot}.`}`,
    missing: (robot) => `Pas encore dans la routine de ${robot} : `,
    withBlock: (block) => `, avec un bloc ${block}.`,
    covered: (robot, helper) =>
      `La routine de ${robot} couvre tout le travail de ${helper}. Lancez le service pour la voir tourner.`,
    jobs: {
      prep: {
        still: 'Query remet les tickets, et Pip sert toujours la salle.',
        steps: [
          { short: 'Ticket', text: 'Attendre un ticket au passe de la cuisine' },
          { short: 'Grains', text: 'Prendre les grains à la réserve' },
          { short: 'Mouture', text: 'Les moudre dans la machine à café' },
          { short: 'Eau', text: 'Prendre de l’eau à l’évier' },
          { short: 'Café', text: 'Préparer le café dans la machine' },
          { short: 'Retrait', text: 'Laisser la boisson au comptoir de retrait' },
          { short: 'Encore', text: 'Revenir pour le ticket suivant' },
        ],
      },
      floor: {
        still: 'Pip débarrasse encore les tables, juste pour aujourd’hui.',
        steps: [
          { short: 'Boisson', text: 'Attendre qu’une boisson soit prête' },
          { short: 'Retrait', text: 'La prendre au comptoir de retrait' },
          { short: 'Table', text: 'Lire la table sur son ticket' },
          { short: 'Y aller', text: 'Marcher jusqu’à cette table' },
          { short: 'Service', text: 'Servir la boisson' },
          { short: 'Retour', text: 'Revenir au comptoir' },
          { short: 'Encore', text: 'Revenir pour la boisson suivante' },
        ],
      },
    },
  },
);
