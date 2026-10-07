import type { ReactNode } from 'react';
import { words } from '@/shared/language';

/** A robot as the handbook introduces it: its job, and its part in the ticket's trip. */
type Job = { job: string; ticket: string };
type Robot = 'Query' | 'Brew' | 'Porter';

/**
 * The handbook's words. A shift's toolbar and most of its windows read in French, but the editor's tools are still in
 * English, so the French names those as they read there (**Tidy up**); the keys are the French keyboard's.
 */
export const GUIDE_WORDS = words(
  {
    kicker: (cafe: string) => `${cafe} · Staff handbook`,
    title: 'How the café runs.',
    stars: ['One star', 'Two stars', 'Three stars'],
    /** "a", "a and b", "a, b, and c". */
    list: (parts: readonly string[]) =>
      parts.length < 3 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`,
    jobs: {
      Query: { job: 'takes orders', ticket: 'writes down what the guest asked for' },
      Brew: { job: 'runs the kitchen', ticket: 'makes exactly what the ticket says' },
      Porter: { job: 'works the floor', ticket: 'takes it to the table it names' },
    } satisfies Record<Robot, Job>,
    starts: (robot: string, job: string, shift: string) => `${robot} ${job} from Shift ${shift}`,
    crew: (shifts: number, all: boolean, starts: string, met: number) =>
      `Over ${shifts} shifts, you program ${all ? 'three ' : ''}secondhand robots until it runs by itself${
        starts ? `: ${starts}` : ''
      }.${all ? '' : met > 0 ? ' More of the crew turn up as the café comes back.' : ' The first of them turns up after the opening day.'}`,
    crewHeading: 'The crew',
    guests: (crew: string) => `The café has more guests than one pair of hands can serve. ${crew}`,
    byHand: 'Until a robot takes over, its job is done by hand: Niko writes the tickets, Moka brews and Pip serves.',
    routineHeading: 'Writing a routine',
    adding: (
      <>
        Tap or click a block’s name in the library to add it to the end, or drag it exactly where it belongs. To add a
        few in the middle, tap a block in the routine first: new ones follow it, or fill it if it’s an empty branch,
        until you tap it again. A picked block also has buttons to copy it, move it a step or remove it, group and all.
        Set its values right in the code pane. From the keyboard, a value’s menu opens with the arrow keys, or by typing
        the first letters of the one you want.
      </>
    ),
    moving: (
      <>
        Drag a branch, loop or function by its first block to move it whole, or drag a block out of the code to remove
        it. On a touch screen, rest a finger on a block until it rises, then drag; a quicker swipe scrolls the routine.
        The arrow at the end of its first block folds it shut, to read a long routine at a glance; it opens by itself to
        show the block running or the one that failed. The target on a jump or a call takes you to where it lands, or to
        its function. A block the routine would stop on is ringed in amber before you run it, with a note under the code
        saying why. From the keyboard: <kbd>Space</kbd> to lift, arrow keys to move, <kbd>Space</kbd> to drop,{' '}
        <kbd>Esc</kbd> to put it back, <kbd>Delete</kbd> to remove it, <kbd>Enter</kbd> to pick it as the place new
        blocks go.
      </>
    ),
    typing: (
      <>
        Rather type? Turn on the <strong>Text editor</strong> in a shift’s Options: the same routine, one block per
        line, numbered down the side. With the caret inside an If, For or Function, a gold line in the margin joins it
        to its End. Under the text, a line says what the block on the caret’s line does, and <strong>Tidy up</strong> (
        <kbd>Shift + Alt + F</kbd>) lays the routine out by depth.
      </>
    ),
    undo: (modifier: string): ReactNode => (
      <>
        Changed your mind? <strong>Undo</strong> (<kbd>{modifier} + Z</kbd>) steps back through every edit, reset and
        worked example, one robot at a time, and <strong>Redo</strong> (<kbd>{modifier} + Shift + Z</kbd>) steps forward
        again.
      </>
    ),
    notebook: (
      <>
        Worth keeping? The <strong>Notebook</strong> beside Help keeps the open robot’s routine under a name, to bring
        back on any shift in its place or after it. A page says when it uses blocks the shift doesn’t have yet, or
        another robot’s. <strong>Write a lesson</strong> on a page to say what it shows and add a note to the blocks
        worth one, then export it as a text file to share. The notebook stays in this browser, shared by every café in
        it; export it to carry it to another.
      </>
    ),
    aroundHeading: 'Around the café',
    moves:
      'Move counts whole tiles in screen directions. A blocked move stops early, and customers never block the way. Station actions only work beside the matching equipment.',
    ticket: (trip: string) =>
      `The ticket ties the crew together: ${trip}. So a slip at the counter ends up at the table.`,
    serviceHeading: 'Service & stars',
    running: (modifier: string): ReactNode => (
      <>
        <strong>Run service</strong> (or <kbd>{modifier} + Enter</kbd>) sets the crew to work, and{' '}
        <strong>Stop &amp; edit</strong> (or <kbd>Esc</kbd>) takes you back to the code. If an instruction fails, its
        line lights up and you can fix it straight away. Most shifts send in a few rounds of guests, one after another,
        and every round has to go right. With the café idle, <kbd>Esc</kbd> heads back to the campaign.
      </>
    ),
    rating: (one: ReactNode, two: ReactNode, three: ReactNode): ReactNode => (
      <>
        {one} serves every order correctly, {two} also meets the block target, and {three} the step target on top. Each
        shift’s Help has its lesson, then hints one at a time: the idea, a clue about your routine, and a worked
        example.
      </>
    ),
    foot: 'Welcome to the team',
  },
  {
    kicker: (cafe) => `${cafe} · Livret du personnel`,
    title: 'Comment tourne le café.',
    stars: ['Une étoile', 'Deux étoiles', 'Trois étoiles'],
    list: (parts) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`),
    jobs: {
      Query: { job: 'prend les commandes', ticket: 'note ce que le client a demandé' },
      Brew: { job: 'tient la cuisine', ticket: 'prépare exactement ce que dit le ticket' },
      Porter: { job: 'fait le service en salle', ticket: 'l’apporte à la table indiquée' },
    },
    starts: (robot, job, shift) => `${robot} ${job} dès le service ${shift}`,
    crew: (shifts, all, starts, met) =>
      `En ${shifts} services, vous programmez ${all ? 'trois' : 'des'} robots d’occasion jusqu’à ce que le café tourne tout seul${
        starts ? ` : ${starts}` : ''
      }.${all ? '' : met > 0 ? ' D’autres membres de l’équipe arrivent à mesure que le café reprend vie.' : ' Le premier arrive après le jour d’ouverture.'}`,
    crewHeading: 'L’équipe',
    guests: (crew) => `Le café a plus de clients qu’une seule paire de mains ne peut en servir. ${crew}`,
    byHand:
      'Tant qu’un robot n’a pas pris le relais, son travail se fait à la main : Niko écrit les tickets, Moka prépare les boissons et Pip sert en salle.',
    routineHeading: 'Écrire une routine',
    adding: (
      <>
        Touchez ou cliquez le nom d’un bloc dans la bibliothèque pour l’ajouter à la fin, ou faites-le glisser
        exactement à sa place. Pour en ajouter plusieurs au milieu, touchez d’abord un bloc de la routine&nbsp;: les
        nouveaux le suivent, ou le remplissent si c’est une branche vide, jusqu’à ce que vous le touchiez de nouveau. Un
        bloc choisi a aussi des boutons pour le copier, le déplacer d’un cran ou le retirer, groupe compris. Réglez ses
        valeurs directement dans le volet du code. Au clavier, le menu d’une valeur s’ouvre avec les flèches, ou en
        tapant les premières lettres de celle que vous voulez.
      </>
    ),
    moving: (
      <>
        Faites glisser une branche, une boucle ou une fonction par son premier bloc pour la déplacer entière, ou sortez
        un bloc du code pour le retirer. Sur un écran tactile, gardez le doigt sur un bloc jusqu’à ce qu’il se soulève,
        puis faites-le glisser&#8239;; un geste plus rapide fait défiler la routine. La flèche au bout de son premier
        bloc le replie, pour lire une longue routine d’un coup d’œil&#8239;; il se rouvre de lui-même pour montrer le
        bloc en cours ou celui qui a échoué. La cible d’un saut ou d’un appel vous emmène là où il arrive, ou à sa
        fonction. Un bloc sur lequel la routine s’arrêterait est cerclé d’ambre avant que vous la lanciez, avec une note
        sous le code qui dit pourquoi. Au clavier&nbsp;: <kbd>Espace</kbd> pour le soulever, les flèches pour le
        déplacer, <kbd>Espace</kbd> pour le poser, <kbd>Échap</kbd> pour le remettre, <kbd>Suppr</kbd> pour le retirer,{' '}
        <kbd>Entrée</kbd> pour en faire l’endroit où vont les nouveaux blocs.
      </>
    ),
    typing: (
      <>
        Vous préférez taper&#8239;? Activez l’<strong>Éditeur de texte</strong> dans les Options d’un service&nbsp;: la
        même routine, un bloc par ligne, numérotée sur le côté. Quand le curseur est dans un If, un For ou une Function,
        un trait doré dans la marge le relie à son End. Sous le texte, une ligne dit ce que fait le bloc de la ligne du
        curseur, et <strong>Tidy up</strong> (<kbd>Maj + Alt + F</kbd>) range la routine par niveaux.
      </>
    ),
    undo: (modifier) => (
      <>
        Changé d’avis&#8239;? <strong>Annuler</strong> (<kbd>{modifier} + Z</kbd>) revient sur chaque modification,
        réinitialisation et exemple corrigé, un robot à la fois, et <strong>Rétablir</strong> (
        <kbd>{modifier} + Maj + Z</kbd>) repart en avant.
      </>
    ),
    notebook: (
      <>
        Une routine à garder&#8239;? Le <strong>Carnet</strong>, à côté de l’Aide, garde celle du robot ouvert sous un
        nom, pour la ressortir à n’importe quel service, le sien ou un suivant. Une page signale quand elle utilise des
        blocs que le service n’a pas encore, ou ceux d’un autre robot. Avec <strong>Écrire une leçon</strong>, dites sur
        une page ce qu’elle montre et annotez les blocs qui le méritent, puis exportez-la en fichier texte pour la
        partager. Le carnet reste dans ce navigateur, commun à tous ses cafés&#8239;; exportez-le pour l’emporter
        ailleurs.
      </>
    ),
    aroundHeading: 'Dans le café',
    moves:
      'Move compte des cases entières, dans les directions de l’écran. Un déplacement bloqué s’arrête avant, et les clients ne bloquent jamais le passage. Les actions de poste ne marchent qu’à côté de l’équipement correspondant.',
    ticket: (trip) => `Le ticket relie toute l’équipe : ${trip}. Ainsi, un bon pris au comptoir finit à la table.`,
    serviceHeading: 'Service et étoiles',
    running: (modifier) => (
      <>
        <strong>Lancer le service</strong> (ou <kbd>{modifier} + Entrée</kbd>) met l’équipe au travail, et{' '}
        <strong>Retour au code</strong> (ou <kbd>Échap</kbd>) vous y ramène. Si une instruction échoue, sa ligne
        s’allume et vous pouvez la corriger tout de suite. La plupart des services se jouent en quelques manches, l’une
        après l’autre, et chacune doit bien se passer. Quand le café est au repos, <kbd>Échap</kbd> ramène à la
        campagne.
      </>
    ),
    rating: (one, two, three) => (
      <>
        {one}&nbsp;: chaque commande servie correctement. {two}&nbsp;: l’objectif de blocs atteint en plus. {three}
        &nbsp;: l’objectif de pas en prime. L’<strong>Aide</strong> de chaque service donne sa leçon, puis des indices
        un par un&nbsp;: un rappel de l’idée, un indice sur votre routine, et un exemple corrigé.
      </>
    ),
    foot: 'Bienvenue dans l’équipe',
  },
);
