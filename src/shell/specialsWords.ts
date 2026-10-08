import { count } from '@/domain';
import { countFr, words } from '@/shared/language';

/**
 * The specials board's words: its frame, a special's and a menu's card, a menu laid out card by card, and the Long
 * Day. What the regulars ask for, a card's rule and a special's or the day's story are their own, told in the
 * reader's language.
 */
export const SPECIALS_WORDS = words(
  {
    kicker: (cafe: string) => `${cafe} · Specials`,
    title: 'Asked for by the regulars.',
    intro:
      'Shifts past the campaign, each with something new to it. They open on the routines the last shift was served with, and keep their stars apart from the campaign’s.',
    fresh: 'New · ',
    askedBy: (name: string) => `Asked for by ${name}`,
    serve: 'Serve',
    again: 'Serve again',
    stars: (n: number) => `${n} of 3 stars`,
    unserved: 'Not served yet',
    menus: (served: number, of: number) => `${served} of ${count(of, 'menu')} served`,
    plan: 'Plan the menu',
    menu: {
      back: 'All specials',
      each: 'Each card is a shift of its own, with its own guests and its own stars: pick one, serve it, and come back for the others whenever you like.',
      serve: 'Serve this menu',
      board: 'On the board',
      who: 'Who comes',
      rule: 'The rule',
      targets: 'Targets',
      target: (blocks: number, steps: number) => `${blocks} blocks or fewer · ${steps} steps or fewer`,
    },
    day: {
      changed: 'The waves have changed since your last day. It starts again from the first, with your routines.',
      all: (waves: number) => `All ${waves} waves served`,
      best: (best: number, waves: number) => `Best: wave ${best} of ${waves}`,
      waves: (waves: number) => count(waves, 'wave'),
      start: 'Start the day',
      carryOn: (wave: number) => `Carry on: wave ${wave}`,
      over: 'Start over',
    },
  },
  {
    kicker: (cafe) => `${cafe} · Commandes spéciales`,
    title: 'Demandées par les habitués.',
    intro:
      'Des services au-delà de la campagne, chacun avec sa nouveauté. Ils s’ouvrent sur les routines du dernier service assuré, et gardent leurs étoiles à part de celles de la campagne.',
    fresh: 'Nouvelle · ',
    askedBy: (name) => `Une demande de ${name}`,
    serve: 'Servir',
    again: 'Servir à nouveau',
    stars: (n) => `${n} étoile${n > 1 ? 's' : ''} sur 3`,
    unserved: 'Pas encore servi',
    menus: (served, of) => `Menus servis : ${served} sur ${of}`,
    plan: 'Composer le menu',
    menu: {
      back: 'Toutes les commandes spéciales',
      each: 'Chaque carte est un service à part entière, avec ses propres clients et ses propres étoiles : choisissez-en une, servez-la, et revenez pour les autres quand vous voulez.',
      serve: 'Servir ce menu',
      board: 'Au tableau',
      who: 'Qui vient',
      rule: 'La règle',
      targets: 'Objectifs',
      target: (blocks, steps) => `${blocks} blocs ou moins · ${steps} pas ou moins`,
    },
    day: {
      changed:
        'Les vagues ont changé depuis votre dernière journée. Elle reprend depuis la première, avec vos routines.',
      all: (waves) => `Les ${waves} vagues servies`,
      best: (best, waves) => `Record : vague ${best} sur ${waves}`,
      waves: (waves) => countFr(waves, 'vague'),
      start: 'Commencer la journée',
      carryOn: (wave) => `Reprendre : vague ${wave}`,
      over: 'Recommencer',
    },
  },
);
