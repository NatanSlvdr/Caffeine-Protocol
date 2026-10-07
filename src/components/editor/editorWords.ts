import { count, spokenBlock } from '@/domain';
import { countFr, words } from '@/shared/language';

/** A field of a block's operands, as its menu or number is labelled after the block: "Block 3 value". */
type OperandPart =
  | 'value'
  | 'operator'
  | 'source'
  | 'connector'
  | 'more'
  | 'variable'
  | 'quantity'
  | 'direction'
  | 'tiles'
  | 'selector'
  | 'condition';

/** Why a block can't be copied: a function has one name, and a jump lands in one place. */
export type CopyBlocker = 'function' | 'position' | '';

const PARTS: Record<OperandPart, string> = {
  value: 'value',
  operator: 'operator',
  source: 'source',
  connector: 'connector',
  more: 'add another condition',
  variable: 'variable',
  quantity: 'quantity',
  direction: 'direction',
  tiles: 'tiles',
  selector: 'selector',
  condition: 'condition',
};

const FR_PARTS: Record<OperandPart, string> = {
  value: 'valeur',
  operator: 'opérateur',
  source: 'source',
  connector: 'liaison',
  more: 'ajouter une autre condition',
  variable: 'variable',
  quantity: 'quantité',
  direction: 'direction',
  tiles: 'cases',
  selector: 'sélecteur',
  condition: 'condition',
};

/** A block by its number in the code pane and what it says: "block 3 (move right 1)". Block names stay English. */
const named = (n: number, command: string) => `block ${n} (${spokenBlock(command)})`;
const frNamed = (n: number, command: string) => `bloc ${n} (${spokenBlock(command)})`;
const group = (grouped: boolean) => (grouped ? ' and its group' : '');
const frGroup = (grouped: boolean) => (grouped ? ' et son groupe' : '');
const sentence = (text: string) => text[0].toUpperCase() + text.slice(1);

/** Where a pause mark goes in French: a line is feminine, a block masculine. */
const frSpot = (lines: boolean, n: number) =>
  lines
    ? { the: `la ligne ${n}`, at: `à la ligne ${n}`, of: `de la ligne ${n}`, it: 'la', marked: 'marquée' }
    : { the: `le bloc ${n}`, at: `au bloc ${n}`, of: `du bloc ${n}`, it: 'le', marked: 'marqué' };

/**
 * The words of the code editor: its library and code zone, the text view's help, the buttons on a picked block, what
 * a screen reader hears as blocks are added, moved, folded, marked and dragged, and the labels of a block's fields.
 * Block names, the words on the blocks and what stops a routine are programming words, left as they are.
 */
export const EDITOR_WORDS = words(
  {
    library: 'Available code blocks',
    codeZone: 'Code zone',
    /** The watch-only shift's code zone. */
    observation: (robot: string, shift: string) =>
      `No routine to write today: the crew serves this shift by hand. ${robot} joins on Shift ${shift}.`,
    text: {
      label: 'Routine text',
      placeholder: 'One block per line, like LISTEN or MOVE RIGHT 1',
      stoppedOn: (line: number) => `The service stopped on line ${line}. `,
      needsFix: (line: number, message: string) => `Line ${line} needs a fix before Run: ${message} `,
      marks: 'F9 marks the line for the service to pause at. ',
      keys: 'Tab indents, Shift+Tab outdents, Shift+Alt+F tidies the layout, Escape leaves the editor.',
    },
    emptyHint: 'Tap or click a block in the library, or drag one here',
    nextHere: 'The next block goes here',
    dropHere: 'Drop a block here',
    tidy: 'Tidy up',
    show: 'Show',
    /** Where the routine check points, before what stops it there. */
    problemAt: (lines: boolean, n: number) => `${lines ? 'Line' : 'Block'} ${n}: `,
    /** What a screen reader hears as the editor changes the routine. */
    said: {
      laidOut: 'The routine is already laid out.',
      tidied: 'Laid the routine out by depth.',
      noPause: (lines: boolean, n: number) =>
        `Nothing starts on ${lines ? 'line' : 'block'} ${n} for the service to pause at.`,
      unmarked: (lines: boolean, n: number) => `Took the mark off ${lines ? 'line' : 'block'} ${n}.`,
      marked: (lines: boolean, n: number, robot: string) =>
        `Marked ${lines ? 'line' : 'block'} ${n}: the service pauses as ${robot} starts it.`,
      folded: (n: number, command: string, inside: number) =>
        `Folded ${named(n, command)}, with ${count(inside, 'block')} inside.`,
      unfolded: (n: number, command: string) => `Unfolded ${named(n, command)}.`,
      revealed: (hiding: [number, string][], n: number, command: string) =>
        `Unfolded ${hiding.map(([at, block]) => named(at, block)).join(' and ')} to show ${named(n, command)}.`,
      atEnd: 'New blocks go at the end of the routine again.',
      picked: (spot: string) => `New blocks go ${spot}. Pick it again, or press Escape, to add at the end.`,
      added: (n: number, command: string, spot: string | null) =>
        `Added block ${n} (${spokenBlock(command)}) ${spot ?? 'at the end of the routine'}.`,
      removed: (n: number, command: string, grouped: boolean) => `Removed ${named(n, command)}${group(grouped)}.`,
      cantCopy: (n: number, why: CopyBlocker) =>
        `Block ${n} can’t be copied: ${
          why === 'function'
            ? 'a function needs a name of its own, so add a new one from the library instead'
            : 'a jump lands in only one place, so add a new jump from the library instead'
        }.`,
      copied: (n: number, command: string, grouped: boolean, copy: number) =>
        `Copied ${named(n, command)}${group(grouped)}. The copy is block ${copy}.`,
      edge: (n: number, up: boolean) => `Block ${n} is already at the ${up ? 'top' : 'bottom'} of the routine.`,
      moved: (n: number, command: string, grouped: boolean, up: boolean, now: number) =>
        `Moved ${named(n, command)}${group(grouped)} ${up ? 'up' : 'down'}. It is block ${now} now.`,
    },
    /** Where library blocks go once a routine block is picked. */
    spot: {
      inside: (n: number, command: string) => `inside ${named(n, command)}`,
      after: (n: number, command: string, grouped: boolean) => `after ${named(n, command)}${group(grouped)}`,
    },
    /** A jump's or a call's button to where it goes. */
    goTo: {
      label: (jump: boolean, n: number, command: string) =>
        jump ? `Go to where the jump lands, ${named(n, command)}` : `Go to ${named(n, command)}`,
      title: (jump: boolean): string => (jump ? 'Go to where it lands' : 'Go to the function'),
    },
    /** The buttons beside a picked block. */
    actions: {
      block: (n: number) => `Block ${n}`,
      copy: 'Copy',
      up: 'Move up',
      down: 'Move down',
      remove: 'Remove',
    },
    /** A routine block, as a screen reader names it, and its number, fold and jump buttons. */
    row: {
      pauseAt: (n: number) => `Pause at block ${n}`,
      pauses: 'The service pauses here. Click to take the mark off.',
      pause: 'Pause the service here',
      drag: (n: number, command: string, grouped: boolean) => `Drag ${named(n, command)}${group(grouped)}`,
      dragTarget: (command: string) => `Drag ${spokenBlock(command)}`,
      failed: ', where the service stopped',
      flagged: ', which needs a fix before Run',
      marked: ', marked to pause at',
      folded: (inside: number) => `, folded with ${count(inside, 'block')} inside`,
      picked: ', where new blocks go',
      target: 'The jump lands here. Drag to move it.',
      destination: 'Jump destination',
      fold: (folded: boolean, n: number) => `${folded ? 'Unfold' : 'Fold'} block ${n}`,
      foldTitle: (folded: boolean, inside: number) =>
        folded ? `Show the ${count(inside, 'block')} inside` : 'Fold this group',
    },
    /** A library tile, the drag preview, and the cursor on the running block. */
    insert: (command: string) => `Insert ${spokenBlock(command)}`,
    libraryBlock: (verb: string) => `Library ${verb}`,
    preview: 'Preview',
    cursor: 'Current instruction',
    /** A direction menu with nothing chosen yet; the directions themselves are block words. */
    chooseDirection: 'Choose direction',
    /** A block's fields, labelled after the block; a condition after the first is numbered. */
    field: (label: string, part: OperandPart, row = 0) =>
      `${label}${row ? ` condition ${row + 1}` : ''} ${PARTS[part]}`,
    moreTitle: 'Optional: add another condition',
    removeFollowing: 'Remove following condition',
    noOther: 'No other condition',
    /** What a screen reader hears while a block is dragged, with the numbers the code pane shows. */
    drag: {
      instructions:
        'Press Space to lift this block, the arrow keys to choose a spot, Space to drop it there, or Escape to cancel. In the routine, Enter picks a block as the place library blocks go.',
      block: named,
      newBlock: (command: string) => `a new ${spokenBlock(command)} block`,
      someBlock: 'the block',
      elseBranch: 'as a new else branch',
      inPlace: 'in its current spot',
      before: (block: string) => `before ${block}`,
      end: 'at the end',
      routineEnd: 'at the end of the routine',
      inside: (where: string, owner: string) => `${where}, inside ${owner}`,
      start: (name: string) => `Picked up ${name}.`,
      over: (name: string, place: string) => sentence(`${name}: ${place}.`),
      nowhere: (name: string) => sentence(`${name} is not over a drop spot.`),
      dropped: (name: string, place: string) => `Dropped ${name} ${place}.`,
      notAdded: (name: string) => `${sentence(name)} wasn’t over a drop spot. Nothing was added.`,
      removed: (name: string) => `Removed ${name} from the routine.`,
      putBack: (name: string) => `Put ${name} back.`,
      cancelled: 'Cancelled. Nothing was added.',
      stays: (name: string) => `Cancelled. ${sentence(name)} stays where it was.`,
    },
  },
  {
    library: 'Blocs de code disponibles',
    codeZone: 'Zone de code',
    observation: (robot, shift) =>
      `Pas de routine à écrire aujourd’hui : l’équipe sert ce service à la main. ${robot} arrive au service ${shift}.`,
    text: {
      label: 'Texte de la routine',
      placeholder: 'Un bloc par ligne, comme LISTEN ou MOVE RIGHT 1',
      stoppedOn: (line) => `Le service s’est arrêté à la ligne ${line}. `,
      needsFix: (line, message) => `La ligne ${line} est à corriger avant de lancer : ${message} `,
      marks: 'F9 marque la ligne où le service se met en pause. ',
      keys: 'Tab indente, Maj+Tab désindente, Maj+Alt+F range la mise en page, Échap quitte l’éditeur.',
    },
    emptyHint: 'Touchez ou cliquez un bloc de la bibliothèque, ou glissez-en un ici',
    nextHere: 'Le prochain bloc va ici',
    dropHere: 'Déposez un bloc ici',
    tidy: 'Ranger',
    show: 'Afficher',
    problemAt: (lines, n) => `${lines ? 'Ligne' : 'Bloc'} ${n} : `,
    said: {
      laidOut: 'La routine est déjà rangée.',
      tidied: 'Routine rangée selon sa profondeur.',
      noPause: (lines, n) => `Rien ne commence ${frSpot(lines, n).at} : le service ne peut pas s’y mettre en pause.`,
      unmarked: (lines, n) => `Marque retirée ${frSpot(lines, n).of}.`,
      marked: (lines, n, robot) => {
        const spot = frSpot(lines, n);
        return `${sentence(spot.the)} est ${spot.marked} : le service se met en pause quand ${robot} ${spot.it} commence.`;
      },
      folded: (n, command, inside) =>
        `${sentence(frNamed(n, command))} replié, avec ${countFr(inside, 'bloc')} à l’intérieur.`,
      unfolded: (n, command) => `${sentence(frNamed(n, command))} déplié.`,
      revealed: (hiding, n, command) =>
        `Ouverture du ${hiding.map(([at, block]) => frNamed(at, block)).join(' et du ')} pour montrer le ${frNamed(n, command)}.`,
      atEnd: 'Les nouveaux blocs vont de nouveau à la fin de la routine.',
      picked: (spot) =>
        `Les nouveaux blocs vont ${spot}. Choisissez-le de nouveau, ou appuyez sur Échap, pour ajouter à la fin.`,
      added: (n, command, spot) => `${sentence(frNamed(n, command))} ajouté ${spot ?? 'à la fin de la routine'}.`,
      removed: (n, command, grouped) =>
        `${sentence(frNamed(n, command))}${frGroup(grouped)} ${grouped ? 'retirés' : 'retiré'}.`,
      cantCopy: (n, why) =>
        `Le bloc ${n} ne peut pas être copié : ${
          why === 'function'
            ? 'une fonction a besoin d’un nom à elle, ajoutez-en donc une nouvelle depuis la bibliothèque'
            : 'un saut n’atterrit qu’à un seul endroit, ajoutez donc un nouveau saut depuis la bibliothèque'
        }.`,
      copied: (n, command, grouped, copy) =>
        `${sentence(frNamed(n, command))}${frGroup(grouped)} ${grouped ? 'copiés' : 'copié'}. La copie est le bloc ${copy}.`,
      edge: (n, up) => `Le bloc ${n} est déjà ${up ? 'en haut' : 'en bas'} de la routine.`,
      moved: (n, command, grouped, up, now) =>
        `${sentence(frNamed(n, command))}${frGroup(grouped)} ${up ? 'monté' : 'descendu'}${grouped ? 's' : ''}. C’est maintenant le bloc ${now}.`,
    },
    spot: {
      inside: (n, command) => `dans le ${frNamed(n, command)}`,
      after: (n, command, grouped) => `après le ${frNamed(n, command)}${frGroup(grouped)}`,
    },
    goTo: {
      label: (jump, n, command) =>
        jump ? `Aller où le saut atterrit, ${frNamed(n, command)}` : `Aller au ${frNamed(n, command)}`,
      title: (jump) => (jump ? 'Aller où il atterrit' : 'Aller à la fonction'),
    },
    actions: {
      block: (n) => `Bloc ${n}`,
      copy: 'Copier',
      up: 'Monter',
      down: 'Descendre',
      remove: 'Retirer',
    },
    row: {
      pauseAt: (n) => `Pause au bloc ${n}`,
      pauses: 'Le service se met en pause ici. Cliquez pour retirer la marque.',
      pause: 'Mettre le service en pause ici',
      drag: (n, command, grouped) => `Glisser le ${frNamed(n, command)}${frGroup(grouped)}`,
      dragTarget: (command) => `Glisser ${spokenBlock(command)}`,
      failed: ', où le service s’est arrêté',
      flagged: ', à corriger avant de lancer',
      marked: ', marqué pour la pause',
      folded: (inside) => `, replié avec ${countFr(inside, 'bloc')} à l’intérieur`,
      picked: ', où vont les nouveaux blocs',
      target: 'Le saut atterrit ici. Glissez pour le déplacer.',
      destination: 'Destination du saut',
      fold: (folded, n) => `${folded ? 'Déplier' : 'Replier'} le bloc ${n}`,
      foldTitle: (folded, inside) =>
        folded
          ? inside > 1
            ? `Afficher les ${inside} blocs à l’intérieur`
            : 'Afficher le bloc à l’intérieur'
          : 'Replier ce groupe',
    },
    insert: (command) => `Insérer ${spokenBlock(command)}`,
    libraryBlock: (verb) => `Bibliothèque ${verb}`,
    preview: 'Aperçu',
    cursor: 'Instruction en cours',
    chooseDirection: 'Choisir une direction',
    field: (label, part, row = 0) => `${label}${row ? `, condition ${row + 1}` : ''}, ${FR_PARTS[part]}`,
    moreTitle: 'Facultatif : ajouter une autre condition',
    removeFollowing: 'Retirer la condition suivante',
    noOther: 'Aucune autre condition',
    drag: {
      instructions:
        'Appuyez sur Espace pour soulever ce bloc, sur les flèches pour choisir un emplacement, sur Espace pour l’y déposer, ou sur Échap pour annuler. Dans la routine, Entrée fait d’un bloc l’endroit où vont les blocs de la bibliothèque.',
      block: (n, command) => `le ${frNamed(n, command)}`,
      newBlock: (command) => `un nouveau bloc ${spokenBlock(command)}`,
      someBlock: 'le bloc',
      elseBranch: 'comme nouvelle branche else',
      inPlace: 'à sa place actuelle',
      before: (block) => `avant ${block}`,
      end: 'à la fin',
      routineEnd: 'à la fin de la routine',
      inside: (where, owner) => `${where}, dans ${owner}`,
      start: (name) => `Vous tenez ${name}.`,
      over: (name, place) => sentence(`${name} : ${place}.`),
      nowhere: (name) => sentence(`${name} n’est au-dessus d’aucun emplacement.`),
      dropped: (name, place) => `${sentence(name)} déposé ${place}.`,
      notAdded: (name) => `${sentence(name)} n’était au-dessus d’aucun emplacement. Rien n’a été ajouté.`,
      removed: (name) => `${sentence(name)} retiré de la routine.`,
      putBack: (name) => `${sentence(name)} remis à sa place.`,
      cancelled: 'Annulé. Rien n’a été ajouté.',
      stays: (name) => `Annulé. ${sentence(name)} reste où il était.`,
    },
  },
);

export type EditorWords = (typeof EDITOR_WORDS)['en'];
