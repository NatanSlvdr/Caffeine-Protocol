import { words } from '@/shared/language';

/**
 * The coding pane's words: the tools over the routine, and what the robots' tabs say. What a robot is busy with comes
 * from its blocks, which keep their names in either language.
 */
export const PANE_WORDS = words(
  {
    history: 'Edit history',
    undo: 'Undo',
    redo: 'Redo',
    help: 'Help',
    notebook: 'Notebook',
    notebookTitle: 'Routine notebook',
    bench: 'Test bench',
    options: 'Options',
    goal: 'Your goal',
    robots: 'Robot routines',
    /** When a robot not in the crew yet arrives. */
    joins: (shift: string) => `Joins the crew on Shift ${shift}`,
    activity: { working: 'working', waiting: 'waiting', stopped: 'stopped' },
  },
  {
    history: 'Historique des modifications',
    undo: 'Annuler',
    redo: 'Rétablir',
    help: 'Aide',
    notebook: 'Carnet',
    notebookTitle: 'Carnet de routines',
    bench: 'Banc d’essai',
    options: 'Options',
    goal: 'Objectif',
    robots: 'Routines des robots',
    joins: (shift) => `Rejoint l’équipe au service ${shift}`,
    activity: { working: 'au travail', waiting: 'en attente', stopped: 'à l’arrêt' },
  },
);
