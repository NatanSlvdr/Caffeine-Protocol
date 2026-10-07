import { countFr, words } from '@/shared/language';

/** How a line of a routine set against the open one changes it: brought back, brought in, or taken out. */
type Change = 'back' | 'in' | 'out';

const lines = (n: number) => `${n} line${n === 1 ? '' : 's'}`;

/**
 * The words of a shift's options and of putting a routine back: the options window, the restore window, the line by
 * line comparison both it and the notebook show, and the names of the versions to go back to. The problem report
 * itself stays in English, for whoever reads it to play the problem back.
 */
export const OPTIONS_WORDS = words(
  {
    kicker: 'This shift',
    title: 'Workspace options',
    pixelArt: 'Pixel-art shader',
    pixelArtHint: 'Render the café with crisp pixels and outlined edges.',
    textEditor: 'Text editor',
    // A greyed-out switch says why in its own hint, which is what a screen reader reads with it.
    textEditorHint: (observation: boolean): string =>
      observation
        ? 'Not on this shift: it’s watch-only, so there’s no routine to show.'
        : 'The same routine, in a plain-text view. Kept for every shift.',
    views: 'Comments and empty lines remain intact when switching views. Editing is locked during playback.',
    tips: 'First-routine tips',
    tipsHint: 'Build, run, fix: one step at a time, under the routine, until the shift is served.',
    restore: (robot: string) => `Restore ${robot}’s routine`,
    /** Why restoring is greyed out: a watch-only shift, nothing different to go back to, or a service playing. */
    restoreNote: (robot: string, why: 'observation' | 'same' | 'running') =>
      why === 'observation'
        ? 'This shift is watch-only: the crew serves by hand, so there’s no routine to edit or restore.'
        : why === 'same'
          ? `${robot}’s routine is just like every earlier version.`
          : `Stop the service to restore ${robot}’s routine.`,
    compare: 'Compare runs',
    compareNote: 'Run the same rounds twice, two services or one round practised twice, to compare them.',
    report: 'Something wrong with the game?',
    reportText:
      'A problem report holds this shift, your routines and your last run, so the problem can be played back. It’s saved as a file on this computer, and goes nowhere unless you share it.',
    review: 'Review a problem report',
    preview: 'Problem report, as it will be saved',
    save: 'Save report',
    notNow: 'Not now',
    saved: (name: string) => `Report saved as ${name}. Look for it with your downloads.`,
    restoring: {
      kicker: 'Workspace options',
      legend: 'Version to restore',
      same: (robot: string) => `The same as ${robot}’s routine now.`,
      only: (robot: string, alone: boolean, modifier: string) =>
        `Only ${robot}’s routine changes${alone ? '' : '; the other robots keep theirs'}. Undo (${modifier} Z) brings yours back.`,
      keep: 'Keep my edits',
      confirm: 'Restore this version',
    },
    versions: {
      served: {
        label: 'Last served',
        detail: (robot: string) => `${robot}’s routine from the last service on this shift that went right.`,
      },
      carried: {
        label: (shift: string) => `From Shift ${shift}`,
        detail: (robot: string) => `${robot}’s routine as it came in from the shift before, the way this shift opened.`,
      },
      starter: {
        label: 'Shift starter',
        detail: (robot: string) => `The routine this shift starts ${robot} on, before anything is carried in.`,
      },
    },
    diff: {
      heading: (robot: string) => `Against ${robot}’s routine now`,
      /** How many lines come back or in, and go out: “3 lines back · 1 line out”. */
      change: (n: number, change: Change) => `${lines(n)} ${change}`,
      spacing: 'Only the spacing differs',
      /** Said before a changed line, for a screen reader. */
      mark: (change: Change): string => (change === 'back' ? 'Back: ' : change === 'in' ? 'In: ' : 'Out: '),
    },
  },
  {
    kicker: 'Ce service',
    title: 'Options',
    pixelArt: 'Shader pixel art',
    pixelArtHint: 'Dessiner le café en pixels nets, aux contours marqués.',
    textEditor: 'Éditeur de texte',
    textEditorHint: (observation) =>
      observation
        ? 'Pas sur ce service : il est à regarder, il n’a donc pas de routine à afficher.'
        : 'La même routine, en texte brut. Gardé pour tous les services.',
    views:
      'Les commentaires et les lignes vides restent intacts d’une vue à l’autre. La routine est verrouillée pendant la lecture.',
    tips: 'Conseils de la première routine',
    tipsHint:
      'Construire, lancer, corriger : une étape à la fois, sous la routine, jusqu’à ce que le service soit servi.',
    restore: (robot) => `Restaurer la routine de ${robot}`,
    restoreNote: (robot, why) =>
      why === 'observation'
        ? 'Ce service est à regarder : l’équipe sert à la main, il n’y a donc pas de routine à modifier ni à restaurer.'
        : why === 'same'
          ? `La routine de ${robot} est identique à chacune des versions précédentes.`
          : `Arrêtez le service pour restaurer la routine de ${robot}.`,
    compare: 'Comparer des essais',
    compareNote:
      'Jouez deux fois les mêmes manches, en deux services ou en entraînant deux fois une manche, pour les comparer.',
    report: 'Un problème avec le jeu ?',
    reportText:
      'Un rapport de problème contient ce service, vos routines et votre dernier essai, pour que le problème puisse être rejoué. Il est enregistré dans un fichier sur cet ordinateur, et ne va nulle part si vous ne le partagez pas.',
    review: 'Voir un rapport de problème',
    preview: 'Rapport de problème, tel qu’il sera enregistré',
    save: 'Enregistrer le rapport',
    notNow: 'Pas maintenant',
    saved: (name) => `Rapport enregistré sous ${name}, avec vos téléchargements.`,
    restoring: {
      kicker: 'Options',
      legend: 'Version à restaurer',
      same: (robot) => `Identique à la routine actuelle de ${robot}.`,
      only: (robot, alone, modifier) =>
        `Seule la routine de ${robot} change${alone ? '' : ' ; les autres robots gardent la leur'}. Annuler (${modifier} Z) ramène la vôtre.`,
      keep: 'Garder mes modifications',
      confirm: 'Restaurer cette version',
    },
    versions: {
      served: {
        label: 'Dernière servie',
        detail: (robot) => `La routine de ${robot} au dernier essai réussi de ce service.`,
      },
      carried: {
        label: (shift) => `Du service ${shift}`,
        detail: (robot) =>
          `La routine de ${robot} telle qu’elle est arrivée du service précédent, à l’ouverture de celui-ci.`,
      },
      starter: {
        label: 'Routine de départ',
        detail: (robot) => `La routine sur laquelle ce service fait démarrer ${robot}, avant toute reprise.`,
      },
    },
    diff: {
      heading: (robot) => `Par rapport à la routine actuelle de ${robot}`,
      change: (n, change) =>
        change === 'back'
          ? countFr(n, 'ligne revient', 'lignes reviennent')
          : change === 'in'
            ? countFr(n, 'ligne ajoutée', 'lignes ajoutées')
            : countFr(n, 'ligne retirée', 'lignes retirées'),
      spacing: 'Seuls les espacements diffèrent',
      mark: (change) => (change === 'back' ? 'Revient : ' : change === 'in' ? 'Ajoutée : ' : 'Retirée : '),
    },
  },
);
