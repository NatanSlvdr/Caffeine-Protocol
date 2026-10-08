import { words } from '@/shared/language';

/**
 * The words around the crew's dialogue: the box's buttons and what a screen reader hears of it. What the crew says
 * is the story's, in the reader's language; what a guest said stays English, and is marked so.
 */
export const DIALOGUE_WORDS = words(
  {
    dialogue: 'Dialogue',
    /** Before a line, for a screen reader: "Juno, customer: ". */
    says: (who: string) => `${who}: `,
    /** A guest's role beside their name, or their name when they have none. */
    customer: 'Customer',
    /** A guest's role over their line: "Customer:". */
    role: (role: string) => `${role}:`,
    choices: 'What Niko says',
    saidNow: 'Said this time',
    saidBefore: 'Said last time',
    line: (n: number, of: number) => `Line ${n} of ${of}`,
    back: 'Back',
    backTitle: 'The line before · ←',
    skip: 'Skip',
    skipTitle: 'Skip the rest · Esc',
    next: 'Next',
    nextTitle: 'Enter or Space',
    done: 'Continue',
  },
  {
    dialogue: 'Dialogue',
    says: (who) => `${who} : `,
    customer: 'Client',
    role: (role) => `${role} :`,
    choices: 'Ce que dit Niko',
    saidNow: 'Dit cette fois',
    saidBefore: 'Dit la dernière fois',
    line: (n, of) => `Réplique ${n} sur ${of}`,
    back: 'Retour',
    backTitle: 'La réplique précédente · ←',
    skip: 'Passer',
    skipTitle: 'Passer la suite · Échap',
    next: 'Suivant',
    nextTitle: 'Entrée ou Espace',
    done: 'Continuer',
  },
);
