import { words } from '@/shared/language';

/**
 * The words around the story pages: the button that ends a scene between shifts, and the closing receipt: its bar,
 * its note, its rows and the ways on.
 */
export const STORY_WORDS = words(
  {
    toCounter: 'To the counter',
    readReceipt: 'Read the receipt',
    bar: 'Closing time',
    back: 'Campaign',
    kicker: 'Café Niko · Under new management',
    heading: 'Closing time.',
    /** The note over the receipt, ending on whether every shift has its three stars. */
    narration: (perfect: boolean) =>
      `Lou’s card hangs on the wall by the register. Niko sits down with a warm coffee: the café runs itself now, and the name over the door is his. ${
        perfect
          ? 'Every shift at three stars: Lou would have framed this receipt.'
          : 'Every guest went home with the right drink, and the stars still out there will keep.'
      }`,
    /** What each act after the prologue gave the café, in the order of `acts`; the prologue was served by hand. */
    milestones: [
      { act: 'Act I', line: 'Query took the orders' },
      { act: 'Act II', line: 'Brew learned every recipe' },
      { act: 'Act III', line: 'Porter learned the room' },
      { act: 'Act IV', line: 'The whole crew ran the day' },
    ],
    /** After a milestone, for a screen reader, before its tally of stars. */
    stars: ', stars',
    served: 'Shifts served',
    earned: 'Stars earned',
    perfect: 'Three-star shifts',
    home: 'Back to the café',
    missing: 'Go back for the missing stars',
    tinker: 'Keep tinkering',
    thanks: 'Thank you for spending a little time at our café',
  },
  {
    toCounter: 'Au comptoir',
    readReceipt: 'Lire le ticket',
    bar: 'Fermeture',
    back: 'Campagne',
    kicker: 'Café Niko · Nouvelle direction',
    heading: 'L’heure de la fermeture.',
    narration: (perfect) =>
      `La carte de Lou est accrochée au mur, près de la caisse. Niko s’assoit avec un café chaud : le café tourne tout seul, maintenant, et le nom au-dessus de la porte est le sien. ${
        perfect
          ? 'Tous les services à trois étoiles : Lou aurait encadré ce ticket.'
          : 'Chaque client est reparti avec la bonne boisson, et les étoiles qui manquent attendront.'
      }`,
    milestones: [
      { act: 'Acte I', line: 'Query a pris les commandes' },
      { act: 'Acte II', line: 'Brew a appris toutes les recettes' },
      { act: 'Acte III', line: 'Porter a appris la salle' },
      { act: 'Acte IV', line: 'Toute l’équipe a tenu la journée' },
    ],
    stars: ', étoiles',
    served: 'Services assurés',
    earned: 'Étoiles gagnées',
    perfect: 'Services trois étoiles',
    home: 'Retour au café',
    missing: 'Retourner chercher les étoiles manquantes',
    tinker: 'Continuer à bricoler',
    thanks: 'Merci d’avoir passé un moment dans notre café',
  },
);
