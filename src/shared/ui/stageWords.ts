import { words } from '@/shared/language';

/** What stands in for the 3D café when it can't be drawn, or isn't drawn yet. */
export const STAGE_WORDS = words(
  {
    open: 'The café is still open.',
    unavailable:
      '3D graphics are unavailable on this device. You can still program Query, run service, and follow each customer’s order.',
    retry: 'Try the 3D café again',
    dark: 'The café’s picture went dark.',
    darkWhy:
      'The browser took back the graphics for a moment, as it can when a device is busy or wakes from sleep. Your routines and this service are safe.',
    redraw: 'Draw the café again',
    warming: 'Warming up the café…',
  },
  {
    open: 'Le café est toujours ouvert.',
    unavailable:
      'Les graphismes 3D ne sont pas disponibles sur cet appareil. Vous pouvez toujours programmer Query, lancer le service et suivre la commande de chaque client.',
    retry: 'Réessayer le café en 3D',
    dark: 'L’image du café s’est éteinte.',
    darkWhy:
      'Le navigateur a repris les graphismes un instant, comme il peut le faire quand un appareil est occupé ou sort de veille. Vos routines et ce service sont intacts.',
    redraw: 'Redessiner le café',
    warming: 'Le café se prépare…',
  },
);
