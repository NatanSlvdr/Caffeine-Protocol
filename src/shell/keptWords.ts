import { words } from '@/shared/language';

/**
 * The words around what the café keeps of its story: the guestbook by the till and the memories of Lou's mornings.
 * The notes the regulars wrote and the memories themselves are told in French in data/, beside their English.
 */
export const KEPT_WORDS = words(
  {
    guestbook: {
      kicker: (cafe: string) => `${cafe} · Guestbook`,
      title: 'Left by the till.',
      fresh: 'New',
      /** Under a note, before the shift's own name. */
      after: (shift: string) => `After Shift ${shift}, `,
      blank: 'The rest of the book is still blank.',
    },
    memories: {
      kicker: 'Lou’s · Memories',
      title: 'Before Niko’s time.',
      intro:
        'Mornings at Lou’s, played back from the crew’s logs. Each plays with the tools of its day and a routine of its own: your café’s routines stay as they are, and its stars are kept apart from the campaign’s.',
      fresh: 'New · ',
      tools: (shift: number) => ` · Shift ${shift}’s tools`,
      stars: (n: number) => `${n} of 3 stars`,
      unplayed: 'Not played yet',
      play: 'Play',
      again: 'Play again',
    },
  },
  {
    guestbook: {
      kicker: (cafe) => `${cafe} · Livre d’or`,
      title: 'Laissé près de la caisse.',
      fresh: 'Nouveau',
      after: (shift) => `Après le service ${shift}, `,
      blank: 'Le reste du livre est encore vierge.',
    },
    memories: {
      kicker: 'Chez Lou · Souvenirs',
      title: 'Avant l’époque de Niko.',
      intro:
        'Des matinées chez Lou, rejouées à partir des journaux de l’équipe. Chacune se joue avec les outils de son époque et une routine bien à elle : les routines de votre café restent telles quelles, et ses étoiles sont gardées à part de celles de la campagne.',
      fresh: 'Nouveau · ',
      tools: (shift) => ` · Les outils du service ${shift}`,
      stars: (n) => `${n} étoile${n > 1 ? 's' : ''} sur 3`,
      unplayed: 'Pas encore joué',
      play: 'Jouer',
      again: 'Rejouer',
    },
  },
);
