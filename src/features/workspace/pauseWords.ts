import { ROBOT_DISPLAY_NAMES, count } from '@/domain';
import type { WaitReason } from '@/domain';
import { countFr, words } from '@/shared/language';
import type { PausedBy } from './breakpoints';

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The words of a paused service: when it paused and why, what each robot was doing then, as its tab, the robot
 * inspector and a screen reader say it, and the rest of what the inspector reads from the run's records. Block names,
 * what a guest said and what Query heard are programming words, left as they are; so is why a robot stopped.
 */
export const PAUSE_WORDS = words(
  {
    /** When a moment of the run was: the round, if the shift has more than one, and the time into it. */
    when: (rounds: number, round: number, local: number) =>
      (rounds > 1 ? `Round ${round} · ` : '') + (local < 0 ? 'Before opening' : `${local.toFixed(1)} s`),
    /** Why the service paused itself, in a few words: "At Brew’s mark". */
    reason: ({ reason, robot }: PausedBy): string => {
      const name = ROBOT_DISPLAY_NAMES[robot];
      if (reason === 'mark') return `At ${name}’s mark`;
      if (reason === 'handoff') return `${name} takes a ${robot === 'prep' ? 'ticket' : 'drink'}`;
      return `${name}’s slip, before the crew reacts`;
    },
    /** What a robot waits for, said as the robot tab and the inspector say it. */
    waits: {
      guest: 'Waiting for a guest',
      ticket: 'Waiting for a ticket',
      drink: 'Waiting for a drink to be ready',
      'used-cup': 'Waiting for a used cup',
      'cup-to-wash': 'Waiting for a used cup to wash',
      seated: 'Waiting for the guest to sit down',
      dishwasher: 'Waiting for the dishwasher to finish its wash',
      'cups-washing': 'Waiting for the clean cups in the dishwasher',
    } as Record<WaitReason, string>,
    stopped: 'Stopped for the night',
    doors: 'Waiting for the doors to open',
    closingCall: 'The closing-time call',
    /** A robot's tab, on a Wait block or busy with one. */
    waitBlock: (block: string) => `Waiting ${block.replace(/^wait /, '')}`,
    working: (block: string) => `Working on “${block}”`,
    /** A block a robot is on, or the End that closes one's group. */
    doing: (block: string) => capital(block),
    endOf: (block: string) => `End of ${block}`,
    end: 'End',
    /** Where a block sits, as the code pane numbers it. */
    block: (n: number) => `Block ${n}`,
    line: (n: number) => `Line ${n}`,
    /** What a step stopped on, for a screen reader: "Brew: take up, block 8." */
    started: {
      none: 'Service paused.',
      stopped: (robot: string, why: string) => `${robot} stopped: ${why}`,
      step: (robot: string, what: string, where: string) => `${robot}: ${what}, ${where}.`,
    },
    inspector: {
      title: (robot: string, earlier: boolean) => `${robot}, ${earlier ? 'earlier' : 'paused'}`,
      doing: 'Doing',
      guest: 'Guest',
      ticket: 'Ticket',
      holding: 'Holding',
      warm: 'Keeping warm',
      socket: 'Socket',
      memory: 'Memory',
      loop: 'Loop',
      none: 'None',
      nothing: 'Nothing',
      nothingWaiting: 'Nothing waiting',
      notSet: 'not set',
      noVars: 'No Vars in this routine',
      notInLoop: 'Not in a loop',
      /** A For loop's place: "Item 2 of 3: coffee, sugar", or "Lap 2 of 3". */
      item: (pass: number, passes: number, heard: string) => `Item ${pass} of ${passes}: ${heard}`,
      lap: (pass: number, passes: number) => `Lap ${pass} of ${passes}`,
    },
    /** A ticket as Brew or Porter reads it, and a drink keeping warm as Porter's inspector lists it. */
    ticket: {
      toGo: 'To go',
      table: (n: number) => `Table ${n}`,
      /** A ticket's drink, as written on it. */
      drink: (item: string) => capital(item),
      sugars: (n: number) => count(n, 'sugar'),
      rush: 'Rush',
      together: 'Together',
      tray: 'On the tray',
      pickup: 'At pickup',
      left: (seconds: number) => `${seconds} s left`,
    },
    /** Who has the power the coffee machine and the dishwasher share, as Brew's inspector says it. */
    socket: {
      washing: (cups: number) => `Dishwasher · ${count(cups, 'cup')}`,
      machine: 'Coffee machine',
      free: 'Free',
    },
  },
  {
    when: (rounds, round, local) =>
      (rounds > 1 ? `Manche ${round} · ` : '') +
      (local < 0 ? 'Avant l’ouverture' : `${local.toFixed(1).replace('.', ',')} s`),
    reason: ({ reason, robot }) => {
      const name = ROBOT_DISPLAY_NAMES[robot];
      if (reason === 'mark') return `À la marque de ${name}`;
      if (reason === 'handoff') return `${name} prend ${robot === 'prep' ? 'un ticket' : 'une boisson'}`;
      return `Faux pas de ${name}, avant que l’équipe ne réagisse`;
    },
    waits: {
      guest: 'Attend un client',
      ticket: 'Attend un ticket',
      drink: 'Attend qu’une boisson soit prête',
      'used-cup': 'Attend une tasse utilisée',
      'cup-to-wash': 'Attend une tasse à laver',
      seated: 'Attend que le client s’assoie',
      dishwasher: 'Attend que le lave-vaisselle finisse son lavage',
      'cups-washing': 'Attend les tasses propres du lave-vaisselle',
    },
    stopped: 'À l’arrêt pour la nuit',
    doors: 'Attend l’ouverture des portes',
    closingCall: 'L’annonce de la fermeture',
    waitBlock: (block) => `En attente sur « ${block} »`,
    working: (block) => `Travaille sur « ${block} »`,
    doing: (block) => capital(block),
    endOf: (block) => `Fin de ${block}`,
    end: 'Fin',
    block: (n) => `Bloc ${n}`,
    line: (n) => `Ligne ${n}`,
    started: {
      none: 'Service en pause.',
      stopped: (robot, why) => `${robot} s’est arrêté : ${why}`,
      step: (robot, what, where) => `${robot} : ${what}, ${where}.`,
    },
    inspector: {
      title: (robot, earlier) => `${robot}, ${earlier ? 'plus tôt' : 'en pause'}`,
      doing: 'En cours',
      guest: 'Client',
      ticket: 'Ticket',
      holding: 'Porte',
      warm: 'Au chaud',
      socket: 'Prise',
      memory: 'Mémoire',
      loop: 'Boucle',
      none: 'Aucun',
      nothing: 'Rien',
      nothingWaiting: 'Rien en attente',
      notSet: 'vide',
      noVars: 'Aucune Var dans cette routine',
      notInLoop: 'Hors de toute boucle',
      item: (pass, passes, heard) => `Élément ${pass} sur ${passes} : ${heard}`,
      lap: (pass, passes) => `Tour ${pass} sur ${passes}`,
    },
    ticket: {
      toGo: 'À emporter',
      table: (n) => `Table ${n}`,
      drink: (item) => ({ coffee: 'Café', tea: 'Thé' })[item] ?? capital(item),
      sugars: (n) => countFr(n, 'sucre'),
      rush: 'Pressé',
      together: 'Ensemble',
      tray: 'Sur le plateau',
      pickup: 'Au comptoir de retrait',
      left: (seconds) => `${seconds} s ${seconds < 2 ? 'restante' : 'restantes'}`,
    },
    socket: {
      washing: (cups) => `Lave-vaisselle · ${countFr(cups, 'tasse')}`,
      machine: 'Machine à café',
      free: 'Libre',
    },
  },
);

export type PauseWords = (typeof PAUSE_WORDS)['en'];
