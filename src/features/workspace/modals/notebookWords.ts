import { countFr, words } from '@/shared/language';

/** What became of a page's lesson when another routine took its place: none to keep, kept whole, or so many notes lost. */
type LessonKept = 'none' | 'whole' | number;

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The routine notebook's words: keeping and bringing back pages, carrying the notebook to another browser, writing a
 * page up as a lesson, and the lesson's own text file. Page names, routines and what a player writes are theirs, and
 * stay as written.
 */
export const NOTEBOOK_WORDS = words(
  {
    kicker: 'Kept in this browser',
    title: 'Routine notebook',
    /** The name a new page is offered under. */
    suggested: (robot: string, shift: string) => `${robot}, Shift ${shift}`,
    keepAs: (robot: string) => `Keep ${robot}’s routine as`,
    keep: 'Keep page',
    replace: 'Replace page',
    nothingToKeep: (robot: string) => `${robot}’s routine is empty: there’s nothing to keep yet.`,
    full: (max: number) => `The notebook is full at ${max} pages: remove one to make room.`,
    already: (name: string) => `Already kept as “${name}”.`,
    kept: (robot: string, name: string) => `Kept ${robot}’s routine as “${name}”.`,
    replaced: (name: string, robot: string, lesson: LessonKept) =>
      `Replaced “${name}” with ${robot}’s routine.${
        lesson === 'none'
          ? ''
          : lesson === 'whole'
            ? ' Its lesson stays.'
            : ` Its lesson stays, but for ${lesson === 1 ? 'a note on a block' : `${lesson} notes on blocks`} no longer there.`
      }`,
    removed: (name: string) => `Removed “${name}”.`,
    back: (name: string) => `“${name}” is back in the notebook.`,
    notKept: 'This browser isn’t keeping the notebook, so it lasts until the café closes. Export it to keep it.',
    blocked: (robot: string) => `Stop the service to change ${robot}’s routine.`,
    empty: 'No pages yet. Keep a routine that works, or a part worth reusing, and bring it back on any shift.',
    pages: 'Notebook pages',
    /** A page's line under its name: whose, from which shift, how long, and its lesson in a few words. */
    page: (robot: string, shift: string, blocks: number, lesson?: number): string =>
      `${robot} · Shift ${shift} · ${count(blocks, 'block')}${
        lesson === undefined ? '' : lesson ? ` · lesson, ${count(lesson, 'note')}` : ' · lesson'
      }`,
    putBack: 'Put it back',
    how: (robot: string, modifier: string) =>
      `Use puts the page in place of ${robot}’s routine; Add to the end puts it after the last line. Undo (${modifier} Z) brings yours back.`,
    remove: 'Remove page',
    editLesson: 'Edit the lesson',
    writeLesson: 'Write a lesson',
    addToEnd: 'Add to the end',
    same: (robot: string) => `Same as ${robot}’s now`,
    use: 'Use this page',
    /** Said on the shift once the notebook has closed. */
    used: (robot: string, name: string) => `${robot}’s routine is now “${name}”. Undo brings yours back.`,
    addedToEnd: (name: string, robot: string) => `Added “${name}” to the end of ${robot}’s routine. Undo takes it out.`,
    carry: 'Carry it to another browser',
    carryText:
      'Export the notebook as a file to keep a copy, or to bring it to another computer. Importing one adds its pages to these.',
    export: 'Export notebook',
    import: 'Import notebook',
    importFile: 'Import notebook file',
    exported: (file: string) => `Notebook exported as ${file}. Look for it with your downloads.`,
    /** What came in from a file, sentence by sentence; a count of nothing says nothing. */
    added: (n: number, file: string) => `Added ${count(n, 'page')} from ${file}.`,
    nothingNew: (file: string) => `Nothing new in ${file}.`,
    here: (n: number) => `${count(n, 'page')} already here.`,
    leftOut: (n: number) => `${count(n, 'page')} left out: the notebook is full.`,
    damaged: (n: number) => `${count(n, 'damaged page')} couldn’t be read.`,
    /** Why a file wasn't imported. */
    refused: {
      large: 'It is too large to be a routine notebook.',
      notebook: 'It isn’t a routine notebook.',
      cafe: 'It’s a café export: import it from Settings.',
    },
    notImported: (file: string, why: string) => `${file} wasn’t imported. ${why} Your notebook has been kept.`,
    lesson: {
      back: 'Back to the notebook',
      title: (name: string) => `Lesson · ${name}`,
      meta: (robot: string, shift: string, from?: string) =>
        `${robot} · kept on Shift ${shift} · ${from ? `${robot} reads it from Shift ${from} on` : `${robot} can’t read it on any shift`}`,
      about: 'What it shows',
      aboutHint: 'A sentence or two to open the lesson',
      notes: 'Notes on blocks',
      notesHint: 'Pick a block to say a word on it. The lesson walks through the notes in the routine’s order.',
      block: (line: number, text: string, step: number) =>
        `Line ${line}: ${text}, ${step ? `note ${step}` : 'add a note'}`,
      noteHint: 'What this block does here',
      note: (step: number, line: number) => `Note ${step}, on line ${line}`,
      removeNote: (step: number) => `Remove note ${step}`,
      noted: (line: number) => `Note added on line ${line}.`,
      unnoted: (line: number) => `Note on line ${line} removed.`,
      noBlocks: 'This page has no blocks to note.',
      kept: 'Kept as you write. The lesson goes out as plain text, with nothing in it that runs.',
      export: 'Export lesson',
      exported: (file: string) => `Lesson exported as ${file}. Look for it with your downloads.`,
    },
    /** The lesson's text file, to read away from the café. */
    file: {
      from: 'A lesson from the Caffeine Protocol routine notebook',
      kept: (robot: string, shift: string, from?: string) =>
        `${robot}’s routine, kept on Shift ${shift}. ${from ? `${robot} can read it from Shift ${from} on.` : `${robot} can’t read it on any shift.`}`,
      routine: (notes: number) =>
        notes ? `The routine, with ${notes === 1 ? 'its note' : `its ${notes} notes`} marked:` : 'The routine:',
      walkthrough: 'Walkthrough',
      line: (line: number) => `line ${line}`,
      tryIt: (from?: string) =>
        `${from ? `To try it, type the routine into the café’s text editor on Shift ${from} or later. ` : ''}The lesson is plain text: nothing in it runs.`,
    },
  },
  {
    kicker: 'Gardé dans ce navigateur',
    title: 'Carnet de routines',
    suggested: (robot, shift) => `${robot}, service ${shift}`,
    keepAs: (robot) => `Garder la routine de ${robot} sous le nom`,
    keep: 'Garder la page',
    replace: 'Remplacer la page',
    nothingToKeep: (robot) => `La routine de ${robot} est vide : il n’y a encore rien à garder.`,
    full: (max) => `Le carnet est plein, à ${max} pages : retirez-en une pour faire de la place.`,
    already: (name) => `Déjà gardée sous le nom « ${name} ».`,
    kept: (robot, name) => `Routine de ${robot} gardée sous le nom « ${name} ».`,
    replaced: (name, robot, lesson) =>
      `« ${name} » remplacée par la routine de ${robot}.${
        lesson === 'none'
          ? ''
          : lesson === 'whole'
            ? ' Sa leçon reste.'
            : ` Sa leçon reste, sauf ${lesson === 1 ? 'une note sur un bloc qui n’y est plus' : `${lesson} notes sur des blocs qui n’y sont plus`}.`
      }`,
    removed: (name) => `« ${name} » retirée.`,
    back: (name) => `« ${name} » est de retour dans le carnet.`,
    notKept:
      'Ce navigateur ne garde pas le carnet : il dure jusqu’à la fermeture du café. Exportez-le pour le conserver.',
    blocked: (robot) => `Arrêtez le service pour changer la routine de ${robot}.`,
    empty:
      'Pas encore de page. Gardez une routine qui marche, ou un morceau à réutiliser, et retrouvez-la sur n’importe quel service.',
    pages: 'Pages du carnet',
    page: (robot, shift, blocks, lesson) =>
      `${robot} · Service ${shift} · ${countFr(blocks, 'bloc')}${
        lesson === undefined ? '' : lesson ? ` · leçon, ${countFr(lesson, 'note')}` : ' · leçon'
      }`,
    putBack: 'La remettre',
    how: (robot, modifier) =>
      `Utiliser met la page à la place de la routine de ${robot} ; Ajouter à la fin la met après la dernière ligne. Annuler (${modifier} Z) ramène la vôtre.`,
    remove: 'Retirer la page',
    editLesson: 'Modifier la leçon',
    writeLesson: 'Écrire une leçon',
    addToEnd: 'Ajouter à la fin',
    same: (robot) => `Identique à celle de ${robot}`,
    use: 'Utiliser cette page',
    used: (robot, name) => `La routine de ${robot} est maintenant « ${name} ». Annuler ramène la vôtre.`,
    addedToEnd: (name, robot) => `« ${name} » ajoutée à la fin de la routine de ${robot}. Annuler la retire.`,
    carry: 'L’emporter dans un autre navigateur',
    carryText:
      'Exportez le carnet dans un fichier pour en garder une copie, ou pour l’emporter sur un autre ordinateur. En importer un ajoute ses pages à celles-ci.',
    export: 'Exporter le carnet',
    import: 'Importer un carnet',
    importFile: 'Fichier de carnet à importer',
    exported: (file) => `Carnet exporté sous ${file}, avec vos téléchargements.`,
    added: (n, file) => `${countFr(n, 'page ajoutée', 'pages ajoutées')} depuis ${file}.`,
    nothingNew: (file) => `Rien de nouveau dans ${file}.`,
    here: (n) => (n > 1 ? `${n} pages déjà là.` : `${n} page déjà là.`),
    leftOut: (n) => `${countFr(n, 'page laissée', 'pages laissées')} de côté : le carnet est plein.`,
    damaged: (n) => (n > 1 ? `${n} pages abîmées n’ont pas pu être lues.` : `${n} page abîmée n’a pas pu être lue.`),
    refused: {
      large: 'Il est trop gros pour être un carnet de routines.',
      notebook: 'Ce n’est pas un carnet de routines.',
      cafe: 'C’est un export de café : importez-le depuis les Réglages.',
    },
    notImported: (file, why) => `${file} n’a pas été importé. ${why} Votre carnet a été conservé.`,
    lesson: {
      back: 'Retour au carnet',
      title: (name) => `Leçon · ${name}`,
      meta: (robot, shift, from) =>
        `${robot} · gardée au service ${shift} · ${from ? `${robot} la lit à partir du service ${from}` : `${robot} ne peut la lire sur aucun service`}`,
      about: 'Ce qu’elle montre',
      aboutHint: 'Une phrase ou deux pour ouvrir la leçon',
      notes: 'Notes sur les blocs',
      notesHint: 'Choisissez un bloc pour en dire un mot. La leçon parcourt les notes dans l’ordre de la routine.',
      block: (line, text, step) => `Ligne ${line} : ${text}, ${step ? `note ${step}` : 'ajouter une note'}`,
      noteHint: 'Ce que fait ce bloc ici',
      note: (step, line) => `Note ${step}, ligne ${line}`,
      removeNote: (step) => `Retirer la note ${step}`,
      noted: (line) => `Note ajoutée ligne ${line}.`,
      unnoted: (line) => `Note de la ligne ${line} retirée.`,
      noBlocks: 'Cette page n’a aucun bloc à annoter.',
      kept: 'Gardée au fil de l’écriture. La leçon sort en texte brut, sans rien qui s’exécute.',
      export: 'Exporter la leçon',
      exported: (file) => `Leçon exportée sous ${file}, avec vos téléchargements.`,
    },
    file: {
      from: 'Une leçon du carnet de routines de Caffeine Protocol',
      kept: (robot, shift, from) =>
        `La routine de ${robot}, gardée au service ${shift}. ${from ? `${robot} peut la lire à partir du service ${from}.` : `${robot} ne peut la lire sur aucun service.`}`,
      routine: (notes) =>
        notes
          ? `La routine, ${notes === 1 ? 'avec sa note marquée' : `avec ses ${notes} notes marquées`} :`
          : 'La routine :',
      walkthrough: 'Pas à pas',
      line: (line) => `ligne ${line}`,
      tryIt: (from) =>
        `${from ? `Pour l’essayer, tapez la routine dans l’éditeur de texte du café, au service ${from} ou après. ` : ''}La leçon est en texte brut : rien ne s’y exécute.`,
    },
  },
);
