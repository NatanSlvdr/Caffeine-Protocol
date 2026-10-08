import { words } from '@/shared/language';

/**
 * The words that name a screen: the tab's title, so history and screen readers can tell the pages apart, and what a
 * shift past the campaign is called in its bar. The name inside is the shift's, scene's, memory's or special's in the
 * reader's language; a wave's is still English.
 */
export const SCREEN_WORDS = words(
  {
    tab: {
      campaign: 'Choose a shift',
      shift: (n: string, title: string) => `Shift ${n}: ${title}`,
      special: (title: string) => `Special: ${title}`,
      memory: (title: string) => `Memory: ${title}`,
      wave: (day: string, wave: number) => `${day}: wave ${wave}`,
      ending: 'Closing time',
    },
    special: 'Special',
    menuCard: 'Menu card',
    memory: 'Memory',
    wave: (wave: number, waves: number) => `Wave ${wave} of ${waves}`,
    nextWave: 'Next wave',
    stop: 'Stop for now',
  },
  {
    tab: {
      campaign: 'Choisir un service',
      shift: (n, title) => `Service ${n} : ${title}`,
      special: (title) => `Commande spéciale : ${title}`,
      memory: (title) => `Souvenir : ${title}`,
      wave: (day, wave) => `${day} : vague ${wave}`,
      ending: 'Fermeture',
    },
    special: 'Commande spéciale',
    menuCard: 'Carte du menu',
    memory: 'Souvenir',
    wave: (wave, waves) => `Vague ${wave} sur ${waves}`,
    nextWave: 'Vague suivante',
    stop: 'S’arrêter là',
  },
);
