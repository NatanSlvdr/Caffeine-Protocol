import { count } from '@/domain';
import { SAVE_PROBLEMS, type MigrationChange, type SaveProblem } from '@/features/campaign/save/persistence';
import { countFr, words } from '@/shared/language';

/** What carried over when the campaign got shorter, in English: “1 of your other 2 served shifts carried over…”. */
function carriedOver({ served, kept, other }: Extract<MigrationChange, { kind: 'shorter' }>): string {
  const yours = `your ${other ? 'other ' : ''}${count(served, 'served shift')}`;
  const carried = kept === served ? (served === 1 ? yours : `all ${yours}`) : `${kept || 'none'} of ${yours}`;
  return `${carried} carried over${kept ? ` with ${kept === 1 ? 'its' : 'their'} stars and routines` : ''}`;
}

/** The same in French, which agrees the verb and the possessive with what carried over. */
function reprisFr({ served, kept, other }: Extract<MigrationChange, { kind: 'shorter' }>): string {
  const autres = other ? 'autres ' : '';
  if (served === 1)
    return kept
      ? `votre ${other ? 'autre ' : ''}service servi a été repris, avec ses étoiles et ses routines`
      : `votre ${other ? 'autre ' : ''}service servi n’a pas été repris`;
  if (!kept) return `aucun de vos ${served} ${autres}services servis n’a été repris`;
  if (kept === served)
    return `vos ${served} ${autres}services servis ont tous été repris, avec leurs étoiles et leurs routines`;
  return kept === 1
    ? `1 de vos ${served} ${autres}services servis a été repris, avec ses étoiles et ses routines`
    : `${kept} de vos ${served} ${autres}services servis ont été repris, avec leurs étoiles et leurs routines`;
}

/**
 * The notice pinned over every screen when the café isn't being saved, or once after an older café was brought up to
 * date, with what the update changed: the save checks say what, and the reader's language says it.
 */
export const SAVE_NOTICE_WORDS = words(
  {
    /** Why the café isn't being saved, said here and in Settings. */
    problems: SAVE_PROBLEMS as Record<SaveProblem, string>,
    elsewhere:
      'This café was just saved from another tab or window. This one has stopped saving, so neither overwrites the other.',
    loadNewer: 'Load the newer progress',
    keepThis: 'Keep this tab’s progress',
    updated: 'Your café was brought up to date.',
    /** One thing the update changed, as a sentence; Settings lists them beside the copy from before. */
    change: (change: MigrationChange): string =>
      change.kind === 'puzzles'
        ? 'Query reads orders as token puzzles now, so its old routines couldn’t come along: the Prologue and Act I shifts you’d reached stay open, but start again from Query’s opening routines, with their stars and scenes to earn again.'
        : change.kind === 'shorter'
          ? `The campaign is ${count(change.shifts, 'shift')} long now, not 32: ${carriedOver(change)}.`
          : `Shifts ${change.first}–${change.last} are new${change.finished ? ', so the café isn’t finished until they’re served too' : ''}.`,
    openSettings: 'Open settings',
    dismiss: 'Dismiss',
  },
  {
    problems: {
      unreadable:
        'La progression sauvegardée n’a pas pu être lue, donc la nouvelle n’est pas sauvegardée. Les données d’origine sont intactes : exportez une copie de secours depuis les Réglages.',
      unsaved: 'La progression n’a pas pu être sauvegardée. Exportez votre café depuis les Réglages pour la garder.',
      blocked:
        'Ce navigateur ne laisse pas le café sauvegarder ici, donc la progression faite maintenant ne sera pas gardée. Exportez votre café depuis les Réglages pour la garder.',
    },
    elsewhere:
      'Ce café vient d’être sauvegardé depuis un autre onglet ou une autre fenêtre. Celui-ci a cessé de sauvegarder, pour que l’un n’écrase pas l’autre.',
    loadNewer: 'Charger la progression la plus récente',
    keepThis: 'Garder la progression de cet onglet',
    updated: 'Votre café a été mis à jour.',
    change: (change) =>
      change.kind === 'puzzles'
        ? 'Query lit désormais les commandes comme des puzzles de mots, donc ses anciennes routines n’ont pas pu suivre : les services du prologue et de l’acte I que vous aviez atteints restent ouverts, mais repartent des routines de départ de Query, avec leurs étoiles et leurs scènes à regagner.'
        : change.kind === 'shorter'
          ? `La campagne compte désormais ${countFr(change.shifts, 'service')}, et non plus 32 : ${reprisFr(change)}.`
          : `Les services ${change.first} à ${change.last} sont nouveaux${change.finished ? ', donc le café ne sera terminé qu’une fois ceux-là servis aussi' : ''}.`,
    openSettings: 'Ouvrir les réglages',
    dismiss: 'Ignorer',
  },
);
