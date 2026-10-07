import { count, type RobotRole } from '@/domain';
import { countFr, words } from '@/shared/language';
import type { PhotoView } from './photo';

/** How far the service has got, for the toolbar to say to a screen reader while it plays. */
interface Playing {
  bench: boolean;
  /** The bench eases some of the shift's rules, said after "with" in English: "twice the cups". */
  eased: string;
  practice: boolean;
  round: number;
  rounds: number;
  /** The shift sends in more than one round, so there are rounds to count. */
  counted: boolean;
  /** The watch-only shift, which has no routines to lock. */
  observation: boolean;
}

/**
 * The shift screen's words: the bar over the café, the playback toolbar and its pause menu. The shift's title, story
 * and goal are still in English, and so are the bench's eased rules, so the French toolbar says only that it eases some.
 */
export const WORKSPACE_WORDS = words(
  {
    /** A campaign shift's name beside its title. */
    shift: (n: string) => `Shift ${n}`,
    campaign: 'Campaign',
    blockPaths: 'Block paths',
    blockPathsTitle: 'Show where the picked Move, Take, Deposit or Use block goes in the café',
    photo: 'Photo',
    photoMode: 'Photo mode',
    photoReady: 'Hold the café still and save a photo of it, without the routines',
    photoWaits: 'Photos are taken with the scene and windows closed, and a service paused',
    photoFailed: 'The café couldn’t be photographed just now. Try again in a moment.',
    photoSaved: (name: string) => `Saved as ${name}. Look for it with your downloads.`,
    inWords: 'Café in words',
    inWordsTitle: 'Tell the service in words: the guests, the crew, the counters, and what happens as it plays',
    camera: 'Camera view',
    fullCafe: 'Full café',
    areas: { query: 'Query’s counter', prep: 'Brew’s kitchen', floor: 'Porter’s dining room' } as Record<
      RobotRole,
      string
    >,
    /** Where the café in words says the service is while it plays. */
    round: (round: number, rounds: number) => `Round ${round} of ${rounds}`,
    benching: 'Running the bench',
    playing: 'Playing',
    seeReceipt: 'See the receipt',
    backToCode: 'Back to the code',
    startShift: 'Start the shift',
    routine: (robot: string) => `${robot}’s routine`,
    /** What undo or redo did to the open robot's routine, or that there was nothing to do. */
    history: (direction: 'undo' | 'redo', robot: string, done: boolean) =>
      done
        ? `${direction === 'undo' ? 'Undid' : 'Redid'} an edit to ${robot}’s routine.`
        : `Nothing to ${direction} in ${robot}’s routine.`,
    tipsHidden: 'Tips hidden. Workspace options brings them back.',
    /** A version of the routine put back, named as the restore window lists it. */
    restored: (robot: string, version: string) =>
      `${robot}’s routine is back to the ${version.toLowerCase()} version. Undo brings yours back.`,
    photoBar: {
      framing: 'Framing',
      views: { cafe: 'Whole café', query: 'Counter', prep: 'Kitchen', floor: 'Dining room' } as Record<
        PhotoView,
        string
      >,
      saving: 'Saving…',
      save: 'Save photo',
      done: 'Done',
      escape: 'Esc',
    },
    /** Practice, or a bench, that went right, said beside the code. */
    practice: {
      title: (round: number, bench: boolean) => (bench ? 'The bench went right' : `Round ${round} went right`),
      reason: (bench: boolean, eased: string): string =>
        bench
          ? eased
            ? `The bench ran with ${eased}, and earns no stars: they come from the shift’s own guests and rules, every round of them.`
            : 'The bench earns no stars: they come from the shift’s own guests, every round of them.'
          : 'Practice earns no stars: the whole service has to get every round right.',
      runAll: 'Run the whole service',
    },
    /** The first routine's tips, each step ticked off by what the player has done, never by a button. */
    tips: {
      heading: 'First routine',
      step: (step: number, steps: number) => `Step ${step} of ${steps}`,
      hide: 'Hide the first-routine tips',
      hideTitle: 'Hide tips',
      steps: [
        {
          title: 'Build it',
          text: 'Add Take, Write, Move and Deposit under Wait for Orders: tap a library block or drag it into place, then set its fields.',
        },
        { title: 'Run it', text: 'Press Run service and watch Query follow the routine, from top to bottom.' },
        { title: 'Fix it', text: 'The card below says where Query stopped. Change that block, then run again.' },
      ],
    },
    toolbar: {
      group: 'Simulation controls',
      /** The run button, for a service stopped or playing; the watch-only shift has no routine to go back to. */
      run: (running: boolean, observation: boolean): string =>
        running ? (observation ? 'Stop watching' : 'Stop & edit') : observation ? 'Watch service' : 'Run service',
      resume: 'Resume',
      pause: 'Pause',
      resumeLabel: 'Resume playback',
      pauseLabel: 'Pause playback',
      step: (robot: string) => `Step ${robot}`,
      stepTitle: (robot: string) => `Play on until ${robot} starts its next block, or starts waiting`,
      nextEvent: 'Next event',
      nextEventTitle: 'Play on until any of your robots starts a block, or starts waiting',
      pauseToStep: 'Pause to step',
      bench: 'Bench',
      noStars: (eased: boolean): string => (eased ? 'Eased, for no stars' : 'For no stars'),
      practice: 'Practice',
      round: (round: number, rounds: number) => `Round ${round} of ${rounds}`,
      speed: 'Speed',
      times: (speed: number) => `${speed}×`,
      perBlock: (seconds: number) => `1 block · ${seconds.toFixed(2)}s`,
      speedLabel: 'Playback speed',
      speedSaid: (speed: number) => `${speed}× speed`,
      paused: 'Service paused.',
      playing: ({ bench, eased, practice, round, rounds, counted, observation }: Playing) =>
        `${
          bench
            ? `Running the bench${eased ? ` with ${eased}` : ''}, for no stars`
            : practice
              ? `Practising round ${round} of ${rounds}, for no stars`
              : `Service running${counted ? `, round ${round} of ${rounds}${round > 1 ? `, ${round - 1} passed` : ''}` : ''}`
        }.${observation ? '' : ' The routines are locked until it stops.'}`,
    },
    pauseAt: {
      button: 'Pause at',
      label: (set: number) => `Pause at${set ? `, ${count(set, 'setting')} on` : ''}`,
      title: 'Where the service pauses by itself',
      heading: 'Pause the service by itself',
      marks: (marks: number, lines: boolean) =>
        marks ? `At ${count(marks, lines ? 'marked line' : 'marked block')}` : 'No marks yet',
      where: (lines: boolean): string =>
        lines
          ? 'Click a line number, or press F9 on a line, to mark it.'
          : 'Click a block’s number, or press F9 on a block, to mark it.',
      clear: 'Clear',
      clearMarks: 'Clear marks',
      handoffs: 'Every handoff',
      handoffsNote: 'When Brew takes a ticket, or Porter a drink',
      slips: 'A slip',
      slipsNote: 'Look around the moment it goes wrong, before the crew reacts',
    },
  },
  {
    shift: (n) => `Service ${n}`,
    campaign: 'Campagne',
    blockPaths: 'Trajets des blocs',
    blockPathsTitle: 'Montrer où va dans le café le bloc Move, Take, Deposit ou Use choisi',
    photo: 'Photo',
    photoMode: 'Mode photo',
    photoReady: 'Figer le café et en prendre une photo, sans les routines',
    photoWaits: 'Les photos se prennent scène et fenêtres fermées, le service en pause',
    photoFailed: 'Impossible de photographier le café pour l’instant. Réessayez dans un moment.',
    photoSaved: (name) => `Enregistrée sous ${name}, avec vos téléchargements.`,
    inWords: 'Le café en mots',
    inWordsTitle: 'Raconter le service en mots : les clients, l’équipe, les comptoirs, et ce qui se passe à mesure',
    camera: 'Vue de la caméra',
    fullCafe: 'Tout le café',
    areas: { query: 'Le comptoir de Query', prep: 'La cuisine de Brew', floor: 'La salle de Porter' },
    round: (round, rounds) => `Manche ${round} sur ${rounds}`,
    benching: 'Banc d’essai en cours',
    playing: 'En cours',
    seeReceipt: 'Voir l’addition',
    backToCode: 'Retour au code',
    startShift: 'Commencer le service',
    routine: (robot) => `Routine de ${robot}`,
    history: (direction, robot, done) =>
      done
        ? `Modification ${direction === 'undo' ? 'annulée' : 'rétablie'} dans la routine de ${robot}.`
        : `Rien à ${direction === 'undo' ? 'annuler' : 'rétablir'} dans la routine de ${robot}.`,
    tipsHidden: 'Conseils masqués. Le bouton Options les fait revenir.',
    restored: (robot, version) =>
      `La routine de ${robot} revient à la version « ${version} ». Annuler ramène la vôtre.`,
    photoBar: {
      framing: 'Cadrage',
      views: { cafe: 'Tout le café', query: 'Comptoir', prep: 'Cuisine', floor: 'Salle' },
      saving: 'Enregistrement…',
      save: 'Enregistrer la photo',
      done: 'Terminé',
      escape: 'Échap',
    },
    practice: {
      title: (round, bench) => (bench ? 'Le banc d’essai s’est bien passé' : `La manche ${round} s’est bien passée`),
      reason: (bench, eased) =>
        bench
          ? eased
            ? 'Le banc d’essai a tourné avec des règles assouplies, et ne rapporte pas d’étoiles : elles viennent des clients et des règles du service, toutes manches comprises.'
            : 'Le banc d’essai ne rapporte pas d’étoiles : elles viennent des clients du service, toutes manches comprises.'
          : 'L’entraînement ne rapporte pas d’étoiles : il faut que le service entier réussisse toutes ses manches.',
      runAll: 'Lancer tout le service',
    },
    tips: {
      heading: 'Première routine',
      step: (step, steps) => `Étape ${step} sur ${steps}`,
      hide: 'Masquer les conseils de la première routine',
      hideTitle: 'Masquer les conseils',
      steps: [
        {
          title: 'Construire',
          text: 'Ajoutez Take, Write, Move et Deposit sous Wait for Orders : touchez un bloc de la bibliothèque ou faites-le glisser à sa place, puis remplissez ses champs.',
        },
        { title: 'Lancer', text: 'Appuyez sur Lancer le service et regardez Query suivre la routine, de haut en bas.' },
        { title: 'Corriger', text: 'La carte ci-dessous dit où Query s’est arrêté. Changez ce bloc, puis relancez.' },
      ],
    },
    toolbar: {
      group: 'Commandes du service',
      run: (running, observation) =>
        running
          ? observation
            ? 'Arrêter'
            : 'Retour au code'
          : observation
            ? 'Regarder le service'
            : 'Lancer le service',
      resume: 'Reprendre',
      pause: 'Pause',
      resumeLabel: 'Reprendre la lecture',
      pauseLabel: 'Mettre en pause',
      step: (robot) => `Avancer ${robot}`,
      stepTitle: (robot) => `Avancer jusqu’à ce que ${robot} commence son prochain bloc, ou se mette à attendre`,
      nextEvent: 'Événement suivant',
      nextEventTitle: 'Avancer jusqu’à ce qu’un de vos robots commence un bloc, ou se mette à attendre',
      pauseToStep: 'Mettez en pause pour avancer pas à pas',
      bench: 'Banc d’essai',
      noStars: (eased) => (eased ? 'Assoupli, sans étoiles' : 'Sans étoiles'),
      practice: 'Entraînement',
      round: (round, rounds) => `Manche ${round} sur ${rounds}`,
      speed: 'Vitesse',
      times: (speed) => `${decimal(speed)}×`,
      perBlock: (seconds) => `1 bloc · ${decimal(seconds, 2)} s`,
      speedLabel: 'Vitesse de lecture',
      speedSaid: (speed) => `vitesse ${decimal(speed)}×`,
      paused: 'Service en pause.',
      playing: ({ bench, eased, practice, round, rounds, counted, observation }) =>
        `${
          bench
            ? `Banc d’essai en cours${eased ? ', règles assouplies' : ''}, sans étoiles`
            : practice
              ? `Entraînement, manche ${round} sur ${rounds}, sans étoiles`
              : `Service en cours${counted ? `, manche ${round} sur ${rounds}${round > 1 ? `, ${countFr(round - 1, 'réussie', 'réussies')}` : ''}` : ''}`
        }.${observation ? '' : ' Les routines restent verrouillées jusqu’à l’arrêt.'}`,
    },
    pauseAt: {
      button: 'Pause auto',
      label: (set) => `Pause auto${set ? `, ${countFr(set, 'réglage actif', 'réglages actifs')}` : ''}`,
      title: 'Où le service se met en pause de lui-même',
      heading: 'Mettre le service en pause de lui-même',
      marks: (marks, lines) =>
        marks
          ? `Sur ${lines ? countFr(marks, 'ligne marquée', 'lignes marquées') : countFr(marks, 'bloc marqué', 'blocs marqués')}`
          : 'Aucune marque pour l’instant',
      where: (lines) =>
        lines
          ? 'Cliquez sur un numéro de ligne, ou appuyez sur F9 sur une ligne, pour la marquer.'
          : 'Cliquez sur le numéro d’un bloc, ou appuyez sur F9 sur un bloc, pour le marquer.',
      clear: 'Effacer',
      clearMarks: 'Effacer les marques',
      handoffs: 'Chaque passage de relais',
      handoffsNote: 'Quand Brew prend un ticket, ou Porter une boisson',
      slips: 'Un faux pas',
      slipsNote: 'Regarder autour de soi à l’instant où ça déraille, avant que l’équipe réagisse',
    },
  },
);

/** A number with a decimal comma, to as many places as asked or as it needs: “1,25”. */
function decimal(n: number, places?: number) {
  return (places === undefined ? String(n) : n.toFixed(places)).replace('.', ',');
}
