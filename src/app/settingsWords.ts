import type { BackupReason } from '@/features/campaign/save/persistence';
import type { DialoguePace } from '@/domain';
import { SAVE_REFUSALS } from '@/features/campaign/save/persistence';
import { words } from '@/shared/language';
import { SHORT_REPEATS } from '@/shared/ui/SettingRow';

/** Whose progress a replaced café takes with it: the open café's, by name when the browser keeps more than one. */
type Replaced = { kept: boolean; holdsOrFresh: string; open?: string; untouched: boolean; full: boolean };

/** The house settings' words. What bringing an old café up to date changed is still said in English. */
export const SETTINGS_WORDS = words(
  {
    kicker: (cafe: string) => `${cafe} · House settings`,
    title: 'The little things.',
    sound: 'Sound',
    music: 'Music',
    musicVolume: 'Music volume',
    language: 'Language',
    languageHint:
      'Shared by every café in this browser. French covers every screen and window and the whole story: each shift, the scenes between acts, the guestbook, the memories, the repair bay, the drills, the specials and the Long Day. A guest’s words and the blocks stay English, as a routine reads them, and so does the simulation’s own reason a robot stopped.',
    display: 'Display & motion',
    reducedMotion: 'Reduced motion',
    reducedBySystem: 'On, because your device asks for less motion.',
    reducedHint: 'Keep the movement, skip the extra animation.',
    pace: 'Dialogue text',
    paceWhole: 'Lines show whole while reduced motion is on.',
    paceHint: 'How the crew’s lines appear.',
    paces: { typed: 'Typed', quick: 'Quick', whole: 'Whole lines' } satisfies Record<DialoguePace, string>,
    pixelArt: 'Pixel-art shader',
    pixelArtHint: 'Crisp pixels and outlined edges.',
    shortRepeats: SHORT_REPEATS.en.title,
    shortRepeatsHint: SHORT_REPEATS.en.hint,
    fullscreen: 'Fullscreen',
    fullscreenHint: 'A little more room for your café.',
    exitFullscreen: 'Exit fullscreen',
    goFullscreen: 'Go fullscreen',
    fullscreenFailed: (leaving: boolean) =>
      `This browser window didn’t ${leaving ? 'leave' : 'go'} fullscreen. Try again, or use the browser’s own menu.`,
    saved: 'Your café, saved',
    savedIntro: 'Progress stays in this browser. Export a copy to keep it safe or carry it to another computer.',
    importCafe: 'Import café',
    importFile: 'Import save file',
    recovery: 'Export recovery copy',
    recoveryExported: (file: string) => `Recovery copy exported as ${file}. Look for it with your downloads.`,
    noStorage: 'The original storage could not be accessed.',
    notebookFile: 'It’s a routine notebook: import it from the Notebook on a shift.',
    refusals: SAVE_REFUSALS as Record<keyof typeof SAVE_REFUSALS, string>,
    damaged: (part: string) => `Part of it is damaged: ${part.charAt(0).toLowerCase()}${part.slice(1)}`,
    unreadable: 'It could not be read.',
    notImported: (file: string, why: string) => `${file} wasn’t imported. ${why} Your current café has been kept.`,
    before: {
      import: 'before your last import',
      reset: 'before you started this café over',
      restore: 'before you last restored a copy',
      migration: 'before the game updated its save',
    } satisfies Record<BackupReason, string>,
    keptCopy: (before: string, when: string, holds: string) => `Kept from ${before}, ${when}: ${holds}.`,
    updateChanged: 'What the update changed:',
    restoreKept: 'Restore kept copy',
    update: (waiting: boolean) =>
      `A new version of the café is ready. It takes over once every tab of the café is closed${
        waiting
          ? '; progress isn’t being saved right now, so it waits until then.'
          : ', or now: your progress is kept, though a service under way starts over.'
      }`,
    updateNow: 'Update and reload',
    savingFoot: (saving: boolean) => `${saving ? 'Saved as you go' : 'Not saving right now'} · Thank you, come again`,
    replaceKicker: (kept: boolean): string => (kept ? 'The kept copy' : 'Import a café'),
    replaceTitle: 'Replace this café?',
    replaceBody: ({ kept, holdsOrFresh, open, untouched, full }: Replaced) => {
      const what = open
        ? `the progress, routines and settings of “${open}”`
        : 'your current progress, routines and settings';
      return `${kept ? 'The kept copy' : 'This export'} ${holdsOrFresh}. ${
        kept
          ? `Restoring it will replace ${what}${untouched ? '' : ', and keep this café as the copy instead'}.`
          : `Importing it will replace ${what}.${full ? '' : ' Add it as a new café instead to keep both.'}`
      }`;
    },
    olderVersion: 'It was saved by an older version of the game, so:',
    keepCurrent: 'Keep current café',
    addAsNew: 'Add as a new café',
    importedName: 'Imported café',
    added: (cafe: string, holds: string) => `Added “${cafe}”: ${holds}. Open it from Cafés in this browser.`,
    replaced: (kept: boolean, holds: string) => `Café ${kept ? 'restored' : 'imported'}: ${holds}.`,
    restoreCopy: 'Restore copy',
    replaceCafe: 'Replace café',
  },
  {
    kicker: (cafe) => `${cafe} · Réglages de la maison`,
    title: 'Les petits détails.',
    sound: 'Son',
    music: 'Musique',
    musicVolume: 'Volume de la musique',
    language: 'Langue',
    languageHint:
      'Commune à tous les cafés de ce navigateur. Le français couvre chaque écran, chaque fenêtre et toute l’histoire : chaque service, les scènes entre les actes, le livre d’or, les souvenirs, l’atelier, les exercices, les commandes spéciales et la longue journée. Les mots des clients et les blocs restent en anglais, tels que les routines les lisent, comme la raison qu’a la simulation d’arrêter un robot.',
    display: 'Affichage et mouvement',
    reducedMotion: 'Mouvement réduit',
    reducedBySystem: 'Activé, car votre appareil demande moins de mouvement.',
    reducedHint: 'Garder le mouvement, sans les animations en plus.',
    pace: 'Texte des dialogues',
    paceWhole: 'Les répliques s’affichent entières tant que le mouvement réduit est activé.',
    paceHint: 'Comment s’affichent les répliques de l’équipe.',
    paces: { typed: 'Lettre à lettre', quick: 'Rapide', whole: 'Entières' },
    pixelArt: 'Shader pixel art',
    pixelArtHint: 'Des pixels nets et des contours marqués.',
    shortRepeats: SHORT_REPEATS.fr.title,
    shortRepeatsHint: SHORT_REPEATS.fr.hint,
    fullscreen: 'Plein écran',
    fullscreenHint: 'Un peu plus de place pour votre café.',
    exitFullscreen: 'Quitter le plein écran',
    goFullscreen: 'Passer en plein écran',
    fullscreenFailed: (leaving) =>
      `Cette fenêtre ${leaving ? 'n’a pas quitté le' : 'n’est pas passée en'} plein écran. Réessayez, ou passez par le menu du navigateur.`,
    saved: 'Votre café, sauvegardé',
    savedIntro:
      'La progression reste dans ce navigateur. Exportez-en une copie pour la mettre à l’abri ou l’emporter sur un autre ordinateur.',
    importCafe: 'Importer un café',
    importFile: 'Importer un fichier de sauvegarde',
    recovery: 'Exporter la copie de secours',
    recoveryExported: (file) => `Copie de secours exportée sous ${file}. Vous la trouverez dans vos téléchargements.`,
    noStorage: 'Impossible d’accéder à la sauvegarde d’origine.',
    notebookFile: 'C’est un carnet de routines : importez-le depuis le Carnet, pendant un service.',
    refusals: {
      large: 'Il est trop volumineux pour être un café exporté.',
      newer: 'Il vient d’une version plus récente de Caffeine Protocol.',
      foreign: 'Ce n’est pas un café exporté de Caffeine Protocol.',
    },
    // The save checks name the field in English; the French says the file is damaged and leaves the field out.
    damaged: () => 'Une partie du fichier est abîmée.',
    unreadable: 'Il n’a pas pu être lu.',
    notImported: (file, why) => `${file} n’a pas été importé. ${why} Votre café actuel est conservé.`,
    before: {
      import: 'avant votre dernier import',
      reset: 'avant que vous recommenciez ce café',
      restore: 'avant la dernière copie restaurée',
      migration: 'avant que le jeu mette à jour sa sauvegarde',
    },
    keptCopy: (before, when, holds) => `Copie gardée ${before}, le ${when} : ${holds}.`,
    updateChanged: 'Ce que la mise à jour a changé :',
    restoreKept: 'Restaurer la copie gardée',
    update: (waiting) =>
      `Une nouvelle version du café est prête. Elle prend le relais une fois tous les onglets du café fermés${
        waiting
          ? ' ; la progression n’est pas sauvegardée en ce moment, elle attend donc jusque-là.'
          : ', ou dès maintenant : votre progression est conservée, mais un service en cours reprend depuis le début.'
      }`,
    updateNow: 'Mettre à jour et recharger',
    savingFoot: (saving) =>
      `${saving ? 'Sauvegardé au fil du jeu' : 'Pas de sauvegarde pour l’instant'} · Merci, à bientôt`,
    replaceKicker: (kept) => (kept ? 'La copie gardée' : 'Importer un café'),
    replaceTitle: 'Remplacer ce café ?',
    replaceBody: ({ kept, holdsOrFresh, open, untouched, full }) => {
      const what = open
        ? `la progression, les routines et les réglages de « ${open} »`
        : 'votre progression, vos routines et vos réglages actuels';
      return `${kept ? 'La copie gardée' : 'Cet export'} ${holdsOrFresh}. ${
        kept
          ? `La restaurer remplacera ${what}${untouched ? '' : ', et gardera ce café comme copie à la place'}.`
          : `L’importer remplacera ${what}.${full ? '' : ' Ajoutez-le plutôt comme nouveau café pour garder les deux.'}`
      }`;
    },
    olderVersion: 'Il a été sauvegardé par une version plus ancienne du jeu, donc :',
    keepCurrent: 'Garder le café actuel',
    addAsNew: 'Ajouter comme nouveau café',
    importedName: 'Café importé',
    added: (cafe, holds) => `« ${cafe} » ajouté : ${holds}. Ouvrez-le depuis Les cafés de ce navigateur.`,
    replaced: (kept, holds) => `Café ${kept ? 'restauré' : 'importé'} : ${holds}.`,
    restoreCopy: 'Restaurer la copie',
    replaceCafe: 'Remplacer le café',
  },
);
