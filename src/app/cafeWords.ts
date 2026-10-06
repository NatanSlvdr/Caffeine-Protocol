import { count, type ProgressSave } from '@/domain';
import { MAX_CAFES } from '@/features/campaign/save/persistence';
import { countFr, words } from '@/shared/language';
import { starTotal } from '@/state/GameStore';

/** What a café holds, counted as the fresh-start window counts what it clears; empty for a café never opened. */
const served = (save: ProgressSave) => [Object.keys(save.stars).length, starTotal(save.stars)] as const;

/**
 * The words the house settings, the cafés kept in this browser and the fresh-start slip share: what a café holds, and
 * the cafés section's own.
 */
export const CAFE_WORDS = words(
  {
    holds: (save: ProgressSave) => {
      const [done, stars] = served(save);
      return done ? `${count(done, 'served shift')} and ${count(stars, 'star')}` : '';
    },
    /** What a café holds, as `holds` says it, or that it is a fresh one. */
    holdsOrFresh: (holds: string) => (holds ? `holds ${holds}` : 'is a fresh café, with no shifts served yet'),
    fresh: 'a fresh café, with no shifts served yet',
    exported: (file: string) => `Café exported as ${file}. Look for it with your downloads.`,
    exportCafe: 'Export café',
    noRoom: 'This browser wouldn’t keep another café. Your cafés are as they were.',
    heading: 'Cafés in this browser',
    intro:
      'Each café keeps its own progress, routines and settings. Your routine notebook and the language are shared by them all.',
    list: 'Cafés',
    nothingServed: 'No shifts served yet',
    openNow: 'Open now · ',
    open: 'Open',
    openNamed: (cafe: string) => `Open ${cafe}`,
    rename: 'Rename',
    renameNamed: (cafe: string) => `Rename ${cafe}`,
    newName: (cafe: string) => `New name for ${cafe}`,
    save: 'Save',
    cancel: 'Cancel',
    noRename: 'This browser wouldn’t keep the new name.',
    renamed: (cafe: string) => `Renamed “${cafe}”.`,
    remove: 'Remove',
    removeNamed: (cafe: string) => `Remove ${cafe}`,
    nameNew: 'Name the new café',
    openIt: 'Open it',
    newNote: 'It opens at the very start, with these settings. The page reloads, and a service under way starts over.',
    add: 'Add a café',
    startOver: 'Start this café over',
    full: `${MAX_CAFES} cafés is as many as one browser keeps: remove one to add another.`,
    removeTitle: 'Remove this café?',
    removeBody: (cafe: string, holdsOrFresh: string) =>
      `“${cafe}” ${holdsOrFresh}. Removing it deletes its progress, routines and settings from this browser, and no copy is kept. Export it first to keep it.`,
    exportedNamed: (cafe: string, file: string) => `“${cafe}” exported as ${file}. Look for it with your downloads.`,
    keep: 'Keep café',
    removeCafe: 'Remove café',
    noRemove: 'This browser wouldn’t let the café go.',
    removed: (cafe: string) => `Removed “${cafe}”.`,
  },
  {
    holds: (save) => {
      const [done, stars] = served(save);
      return done ? `${countFr(done, 'service servi', 'services servis')} et ${countFr(stars, 'étoile')}` : '';
    },
    holdsOrFresh: (holds) => (holds ? `contient ${holds}` : 'est un café tout neuf, sans aucun service servi'),
    fresh: 'un café tout neuf, sans aucun service servi',
    exported: (file) => `Café exporté sous ${file}. Vous le trouverez dans vos téléchargements.`,
    exportCafe: 'Exporter le café',
    noRoom: 'Ce navigateur n’a pas voulu garder un café de plus. Vos cafés sont tels qu’ils étaient.',
    heading: 'Les cafés de ce navigateur',
    intro:
      'Chaque café garde sa progression, ses routines et ses réglages. Votre carnet de routines et la langue sont communs à tous.',
    list: 'Cafés',
    nothingServed: 'Aucun service servi pour l’instant',
    openNow: 'Ouvert · ',
    open: 'Ouvrir',
    openNamed: (cafe) => `Ouvrir ${cafe}`,
    rename: 'Renommer',
    renameNamed: (cafe) => `Renommer ${cafe}`,
    newName: (cafe) => `Nouveau nom pour ${cafe}`,
    save: 'Enregistrer',
    cancel: 'Annuler',
    noRename: 'Ce navigateur n’a pas voulu garder le nouveau nom.',
    renamed: (cafe) => `« ${cafe} » renommé.`,
    remove: 'Retirer',
    removeNamed: (cafe) => `Retirer ${cafe}`,
    nameNew: 'Nommer le nouveau café',
    openIt: 'L’ouvrir',
    newNote:
      'Il s’ouvre au tout début, avec ces réglages. La page se recharge, et un service en cours reprend depuis le début.',
    add: 'Ajouter un café',
    startOver: 'Recommencer ce café',
    full: `Un navigateur garde ${MAX_CAFES} cafés au plus : retirez-en un pour en ajouter un autre.`,
    removeTitle: 'Retirer ce café ?',
    removeBody: (cafe, holdsOrFresh) =>
      `« ${cafe} » ${holdsOrFresh}. Le retirer efface sa progression, ses routines et ses réglages de ce navigateur, sans en garder de copie. Exportez-le d’abord pour le conserver.`,
    exportedNamed: (cafe, file) => `« ${cafe} » exporté sous ${file}. Vous le trouverez dans vos téléchargements.`,
    keep: 'Garder le café',
    removeCafe: 'Retirer le café',
    noRemove: 'Ce navigateur n’a pas voulu laisser partir le café.',
    removed: (cafe) => `« ${cafe} » retiré.`,
  },
);
