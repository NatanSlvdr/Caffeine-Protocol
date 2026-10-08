import { count } from '@/domain';
import { countFr, words } from '@/shared/language';

/**
 * An act's line on the ticket, in the order of `acts`, with its name and crew where they differ from the English there.
 * The robots' names are names in either language.
 */
type ActWords = { kicker?: string; crew?: string; tagline: string };

/** What a shift's line on the ticket says after its name, for a screen reader. */
type LineState = 'locked' | 'next' | 'served' | undefined;

/**
 * The order rail's words: the bar over it, the tickets and the specials board. Shift names, their stories and the
 * scenes' come from the data, in the reader's language.
 */
export const RAIL_WORDS = words(
  {
    bar: 'Campaign',
    howToPlay: 'How to play',
    /** A window's button on the bar: its name, how much is in it, and how much of that is new. */
    guestbook: {
      title: 'Guestbook',
      label: (n: number, fresh: number) => `Guestbook, ${count(n, 'note')}${news(fresh)}`,
    },
    shelf: {
      title: 'Shelf',
      label: (n: number, of: number, fresh: number) => `Shelf, ${n} of ${of} keepsakes${news(fresh)}`,
    },
    specials: {
      title: 'Specials',
      label: (n: number, fresh: number) => `Specials, ${count(n, 'special')}${news(fresh)}`,
    },
    memories: {
      title: 'Memories',
      label: (n: number, fresh: number) => `Memories, ${n === 1 ? '1 memory' : `${n} memories`}${news(fresh)}`,
    },
    repairs: {
      title: 'Repair bay',
      label: (n: number, fresh: number) => `Repair bay, ${count(n, 'robot')} on the bench${news(fresh)}`,
    },
    drills: { title: 'Drills', label: (n: number, fresh: number) => `Drills, ${count(n, 'drill')}${news(fresh)}` },
    backToRail: 'Back to the rail',
    kicker: (cafe: string) => `${cafe} · Order rail`,
    title: 'Choose a shift',
    /** What follows the count of shifts served, set in bold before it: “3 of 21 shifts served”. */
    progress: (total: number, _done: number) => ` of ${total} shifts served`,
    shifts: 'Shifts',
    acts: [
      { tagline: 'Watch a service run by hand.' },
      { tagline: 'Teach the counter robot to take orders.' },
      { tagline: 'Teach the kitchen robot every recipe.' },
      { tagline: 'Teach the floor robot the room.' },
      { tagline: 'Nobody covers for them now: three robots, and some very odd days.' },
    ] as ActWords[],
    sealedHead: (act: string, before: string) => `${act}, locked until ${before} is served`,
    head: (act: string, crew: string, served: number, shifts: number, earned: number, stars: number) =>
      `${act} · ${crew}, ${served} of ${shifts} served${stars > 0 ? `, ${earned} of ${stars} stars` : ''}`,
    order: (n: string) => `Order #${n}`,
    opensSoon: 'Opens soon',
    line: (shift: number, title: string, state: LineState, stars?: number) =>
      `Shift ${shift}: ${title}${
        state === 'locked' ? ', locked' : state === 'next' ? ', next up' : state === 'served' ? ', served' : ''
      }${stars ? `, ${stars} of 3 stars` : ''}`,
    opensAfter: (shift: number, title: string, scene: string) => `Shift ${shift}: ${title}, opens after ${scene}`,
    sceneLine: (title: string, state: 'locked' | 'next' | 'seen' | undefined) =>
      `Scene: ${title}${state === 'locked' ? ', locked' : state === 'next' ? ', next up' : state === 'seen' ? ', seen' : ''}`,
    next: 'NEXT',
    seenMark: 'SEEN',
    served: 'Served',
    stars: 'Stars',
    onHold: 'Order on hold',
    thanks: 'Thank you, come again',
    inProgress: 'Order in progress',
    selectedShift: 'Selected shift',
    special: 'Today’s special',
    number: (n: string) => `No. ${n}`,
    servedTag: 'Served',
    upNext: 'Up next',
    tables: 'Tables',
    service: 'Service',
    watchOnly: 'Watch only',
    twoStars: 'Two stars',
    threeStars: 'Three stars',
    blocks: (n: number) => `≤ ${n} blocks`,
    blocksSaid: (n: number) => `${n} blocks or fewer`,
    steps: (n: number) => `≤ ${n} steps`,
    stepsSaid: (n: number) => `${n} steps or fewer`,
    chefsNote: 'Chef’s note',
    watched: 'Watched',
    sitBack: 'Sit back and watch',
    starsOf: (n: number) => `${n} of 3 stars`,
    noStars: 'No stars yet',
    ordering: 'Order up…',
    watchAgain: 'Watch again',
    serveAgain: 'Serve again',
    start: 'Start shift',
    browse: 'browse',
    toStart: 'or double-click to start',
    orderUp: 'Order up!',
    selectedScene: 'Selected scene',
    cutscene: 'Cutscene',
    seen: 'Seen',
    fresh: 'New',
    shots: 'Shots',
    before: 'Before',
    after: 'After',
    lastShift: 'The last shift',
    beforeShift: (n: string) => `Shift ${n}`,
    sceneNote: 'Back, or ←, goes over a line again; Skip, or Esc, ends the scene early.',
    watchScene: 'Watch scene',
    toWatch: 'or double-click to watch',
  },
  {
    bar: 'Campagne',
    howToPlay: 'Comment jouer',
    guestbook: {
      title: 'Livre d’or',
      label: (n, fresh) =>
        `Livre d’or, ${countFr(n, 'mot')}${fresh ? `, dont ${countFr(fresh, 'nouveau', 'nouveaux')}` : ''}`,
    },
    shelf: {
      title: 'Étagère',
      label: (n, of, fresh) =>
        `Étagère, ${n} objet${n > 1 ? 's' : ''} sur ${of}${fresh ? `, dont ${countFr(fresh, 'nouveau', 'nouveaux')}` : ''}`,
    },
    specials: {
      title: 'Commandes spéciales',
      label: (n, fresh) =>
        `Commandes spéciales, ${countFr(n, 'commande')}${fresh ? `, dont ${countFr(fresh, 'nouvelle', 'nouvelles')}` : ''}`,
    },
    memories: {
      title: 'Souvenirs',
      label: (n, fresh) =>
        `Souvenirs, ${countFr(n, 'souvenir')}${fresh ? `, dont ${countFr(fresh, 'nouveau', 'nouveaux')}` : ''}`,
    },
    repairs: {
      title: 'Atelier',
      label: (n, fresh) =>
        `Atelier, ${countFr(n, 'robot')} sur l’établi${fresh ? `, dont ${countFr(fresh, 'nouveau', 'nouveaux')}` : ''}`,
    },
    drills: {
      title: 'Exercices',
      label: (n, fresh) =>
        `Exercices, ${countFr(n, 'exercice')}${fresh ? `, dont ${countFr(fresh, 'nouveau', 'nouveaux')}` : ''}`,
    },
    backToRail: 'Retour à la barre',
    kicker: (cafe) => `${cafe} · Barre à bons`,
    title: 'Choisir un service',
    progress: (total, done) => (done > 1 ? ` services servis sur ${total}` : ` service servi sur ${total}`),
    shifts: 'Services',
    acts: [
      { tagline: 'Regarder un service fait à la main.' },
      { kicker: 'Acte I', tagline: 'Apprendre au robot du comptoir à prendre les commandes.' },
      { kicker: 'Acte II', tagline: 'Apprendre au robot de cuisine toutes les recettes.' },
      { kicker: 'Acte III', tagline: 'Apprendre au robot de salle à s’y retrouver.' },
      {
        kicker: 'Acte IV',
        crew: 'Toute l’équipe',
        tagline: 'Plus personne pour les couvrir : trois robots, et des journées bien étranges.',
      },
    ],
    sealedHead: (act, before) => `${act}, verrouillé tant que ${lower(before)} n’est pas servi`,
    head: (act, crew, served, shifts, earned, stars) =>
      `${act} · ${crew}, ${served} sur ${shifts} servi${served > 1 ? 's' : ''}${stars > 0 ? `, ${earned} étoile${earned > 1 ? 's' : ''} sur ${stars}` : ''}`,
    order: (n) => `Bon n° ${n}`,
    opensSoon: 'Bientôt',
    line: (shift, title, state, stars) =>
      `Service ${shift} : ${title}${
        state === 'locked' ? ', verrouillé' : state === 'next' ? ', à suivre' : state === 'served' ? ', servi' : ''
      }${stars ? `, ${stars} étoile${stars > 1 ? 's' : ''} sur 3` : ''}`,
    opensAfter: (shift, title, scene) => `Service ${shift} : ${title}, ouvre après ${scene}`,
    sceneLine: (title, state) =>
      `Scène : ${title}${state === 'locked' ? ', verrouillée' : state === 'next' ? ', à suivre' : state === 'seen' ? ', vue' : ''}`,
    next: 'SUITE',
    seenMark: 'VU',
    served: 'Servis',
    stars: 'Étoiles',
    onHold: 'Bon en attente',
    thanks: 'Merci, à bientôt',
    inProgress: 'Bon en cours',
    selectedShift: 'Service choisi',
    special: 'Suggestion du jour',
    number: (n) => `N° ${n}`,
    servedTag: 'Servi',
    upNext: 'À suivre',
    tables: 'Tables',
    service: 'Service',
    watchOnly: 'À regarder',
    twoStars: 'Deux étoiles',
    threeStars: 'Trois étoiles',
    blocks: (n) => `≤ ${n} blocs`,
    blocksSaid: (n) => `${n} blocs au plus`,
    steps: (n) => `≤ ${n} pas`,
    stepsSaid: (n) => `${n} pas au plus`,
    chefsNote: 'Le mot du chef',
    watched: 'Regardé',
    sitBack: 'Installez-vous et regardez',
    starsOf: (n) => `${n} étoile${n > 1 ? 's' : ''} sur 3`,
    noStars: 'Pas encore d’étoile',
    ordering: 'Ça part…',
    watchAgain: 'Revoir',
    serveAgain: 'Servir à nouveau',
    start: 'Commencer le service',
    browse: 'parcourir',
    toStart: 'ou double-clic pour commencer',
    orderUp: 'Envoyez !',
    selectedScene: 'Scène choisie',
    cutscene: 'Cinématique',
    seen: 'Vue',
    fresh: 'Nouvelle',
    shots: 'Plans',
    before: 'Avant',
    after: 'Après',
    lastShift: 'Le dernier service',
    beforeShift: (n) => `Service ${n}`,
    // The note names the dialogue box's buttons as they read there.
    sceneNote: 'Retour, ou ←, revient sur une réplique ; Passer, ou Échap, termine la scène plus tôt.',
    watchScene: 'Voir la scène',
    toWatch: 'ou double-clic pour regarder',
  },
);

/** ", 2 new", or nothing when nothing is. */
function news(fresh: number) {
  return fresh ? `, ${fresh} new` : '';
}

/** An act's name inside a sentence: “le prologue”, “l’acte I”. */
export function lower(act: string) {
  return act.startsWith('Acte') ? `l’acte${act.slice(4)}` : `le ${act.toLowerCase()}`;
}
