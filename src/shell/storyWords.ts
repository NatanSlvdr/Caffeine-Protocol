import { words } from '@/shared/language';

/**
 * The words around the story pages: the button that ends a scene between shifts, and the closing receipt's bar, rows
 * and ways on. What Niko and the café say there is the story's, and stays English.
 */
export const STORY_WORDS = words(
  {
    toCounter: 'To the counter',
    readReceipt: 'Read the receipt',
    bar: 'Closing time',
    back: 'Campaign',
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
