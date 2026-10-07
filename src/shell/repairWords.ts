import { count } from '@/domain';
import { words } from '@/shared/language';

/**
 * The repair bay's words: its frame, a bench's card, and the bench itself. A part's name and fault, its sensors and
 * actions, the cases it meets and the mend it gets are the story's, and stay English.
 */
export const REPAIR_WORDS = words(
  {
    kicker: 'Lou’s · Repair bay',
    title: 'After closing.',
    intro:
      'The scrapyard put the crew’s wires back any old way, and the café has run on Niko’s patches since. Open a panel and wire each sensor to what it should set off, until every case on the bench comes out right. None of it counts toward stars.',
    fresh: 'New · ',
    mended: 'Mended',
    onBench: 'On the bench',
    again: 'Rewire again',
    open: 'Open the panel',
    waiting: (n: number) => `${count(n, 'more robot')} ${n === 1 ? 'comes' : 'come'} to the bench as the shifts go on.`,
    bench: {
      back: 'All benches',
      how: (robot: string) =>
        `Wire each of ${robot}’s actions to up to two sensors. An action goes off when every sensor wired to it reads as set; one wired to nothing never does.`,
      wiring: (robot: string) => `${robot}’s wiring`,
      /** Before each of an action's two sensors, and what a screen reader hears for its select. */
      when: ['when it', 'and it'],
      whenLabel: ['when', 'and when'],
      nothing: 'Nothing',
      cases: 'The cases on the bench',
      meets: 'It meets',
      should: 'It should',
      does: 'It does',
      right: 'Right?',
      holds: 'Right',
      notYet: 'Not yet',
      mends: (cases: number, robot: string) => `All ${cases} cases right. ${robot} is ready to close up.`,
      tally: (right: number, cases: number) => `${right} of ${count(cases, 'case')} right.`,
      over: 'Start over',
      close: 'Close the panel',
    },
  },
  {
    kicker: 'Chez Lou · Atelier',
    title: 'Après la fermeture.',
    intro:
      'La casse a rebranché les fils de l’équipe n’importe comment, et le café tourne depuis sur les rafistolages de Niko. Ouvrez un panneau et reliez chaque capteur à ce qu’il doit déclencher, jusqu’à ce que chaque cas de l’établi tombe juste. Rien de tout cela ne compte pour les étoiles.',
    fresh: 'Nouveau · ',
    mended: 'Réparé',
    onBench: 'Sur l’établi',
    again: 'Recâbler',
    open: 'Ouvrir le panneau',
    waiting: (n) =>
      n === 1
        ? 'Un autre robot arrive sur l’établi au fil des services.'
        : `${n} autres robots arrivent sur l’établi au fil des services.`,
    bench: {
      back: 'Tous les établis',
      how: (robot) =>
        `Reliez chaque action de ${robot} à deux capteurs au plus. Une action se déclenche quand chaque capteur qui y est relié est actif ; une action reliée à rien ne se déclenche jamais.`,
      wiring: (robot) => `Le câblage de ${robot}`,
      when: ['quand', 'et'],
      whenLabel: ['quand', 'et quand'],
      nothing: 'Rien',
      cases: 'Les cas sur l’établi',
      meets: 'Il rencontre',
      should: 'Il devrait',
      does: 'Il fait',
      right: 'Juste ?',
      holds: 'Juste',
      notYet: 'Pas encore',
      mends: (cases, robot) => `Les ${cases} cas sont justes. ${robot} est prêt à être refermé.`,
      tally: (right, cases) => `${right} cas juste${right > 1 ? 's' : ''} sur ${cases}.`,
      over: 'Recommencer',
      close: 'Fermer le panneau',
    },
  },
);
