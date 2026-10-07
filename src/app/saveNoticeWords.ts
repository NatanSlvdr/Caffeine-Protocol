import { SAVE_PROBLEMS, type SaveProblem } from '@/features/campaign/save/persistence';
import { words } from '@/shared/language';

/**
 * The notice pinned over every screen when the café isn't being saved, or once after an older café was brought up to
 * date. What the update changed is listed by the save checks, in English.
 */
export const SAVE_NOTICE_WORDS = words(
  {
    /** Why the café isn't being saved, said here and in Settings. */
    problems: SAVE_PROBLEMS as Record<SaveProblem, string>,
    elsewhere:
      'This café was just saved from another tab or window. This one has stopped saving, so neither overwrites the other.',
    loadNewer: 'Load the newer progress',
    keepThis: 'Keep this tab’s progress',
    updated: 'Your café was brought up to date.',
    openSettings: 'Open settings',
    dismiss: 'Dismiss',
  },
  {
    problems: {
      unreadable:
        'La progression sauvegardée n’a pas pu être lue, donc la nouvelle n’est pas sauvegardée. Les données d’origine sont intactes : exportez une copie de secours depuis les Réglages.',
      unsaved: 'La progression n’a pas pu être sauvegardée. Exportez votre café depuis les Réglages pour la garder.',
      blocked:
        'Ce navigateur ne laisse pas le café sauvegarder ici, donc la progression faite maintenant ne sera pas gardée. Exportez votre café depuis les Réglages pour la garder.',
    },
    elsewhere:
      'Ce café vient d’être sauvegardé depuis un autre onglet ou une autre fenêtre. Celui-ci a cessé de sauvegarder, pour que l’un n’écrase pas l’autre.',
    loadNewer: 'Charger la progression la plus récente',
    keepThis: 'Garder la progression de cet onglet',
    updated: 'Votre café a été mis à jour.',
    openSettings: 'Ouvrir les réglages',
    dismiss: 'Ignorer',
  },
);
