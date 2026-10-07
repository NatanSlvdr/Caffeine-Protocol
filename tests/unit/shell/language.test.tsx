import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { CAFE_WORDS } from '../../../src/app/cafeWords';
import { GUIDE_WORDS } from '../../../src/app/guideWords';
import { SETTINGS_WORDS } from '../../../src/app/settingsWords';
import { HOME_WORDS } from '../../../src/shell/homeWords';
import { RAIL_WORDS } from '../../../src/shell/rail/railWords';
import { PANE_WORDS } from '../../../src/components/paneWords';
import { WORKSPACE_WORDS } from '../../../src/features/workspace/workspaceWords';
import { OPTIONS_WORDS } from '../../../src/features/workspace/modals/optionsWords';
import { HELP_WORDS } from '../../../src/features/workspace/modals/helpWords';
import { RECEIPT_WORDS } from '../../../src/features/workspace/modals/receiptWords';
import { NOTEBOOK_WORDS } from '../../../src/features/workspace/modals/notebookWords';
import { lessonText, NotebookRefusal, parseNotebook } from '../../../src/features/workspace/notebook';
import { CHALLENGE_WORDS } from '../../../src/features/workspace/challenges';
import { BENCH_WORDS } from '../../../src/features/workspace/modals/benchWords';
import { COMPARE_WORDS } from '../../../src/features/workspace/modals/compareWords';
import { CompareModal } from '../../../src/features/workspace/modals/CompareModal';
import { easeChoice, easedWords } from '../../../src/features/workspace/bench';
import { compareRuns, runName } from '../../../src/features/workspace/compare';
import { FAILURE_WORDS } from '../../../src/features/workspace/failureWords';
import { FailureCard } from '../../../src/features/workspace/FailureCard';
import { evidenceOf } from '../../../src/features/workspace/evidence';
import { failureHint } from '../../../src/features/workspace/reactions';
import { lessons, levels, titleFor } from '../../../src/data';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { UNLOCKS, createLiveRun, recordRun } from '../../../src/domain';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { LANGUAGE_KEY, LanguageProvider, words } from '../../../src/shared/language';
import { runCampaignLevel } from '../../helpers/run';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const NBSP = ' ';
const NARROW = ' ';

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  document.documentElement.lang = 'en';
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

/** Every line of a catalog that is written out, rather than built from a count or a name. */
const lines = (value: unknown, path = ''): [string, string][] =>
  typeof value === 'string'
    ? [[path, value]]
    : value && typeof value === 'object' && !('$$typeof' in value)
      ? Object.entries(value).flatMap(([key, entry]) => lines(entry, `${path}.${key}`))
      : [];

describe('reading the café in French', () => {
  it('starts in English, and offers each language named in itself', () => {
    render(<App />);
    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const choice = screen.getByRole('radiogroup', { name: 'Language' });
    expect(within(choice).getByRole<HTMLInputElement>('radio', { name: 'English' }).checked).toBe(true);
    expect(within(choice).getByText('Français').closest('label')!.lang).toBe('fr');
    expect(document.getElementById(choice.getAttribute('aria-describedby')!)!.textContent).toMatch(
      /French covers the front door, the order rail, a shift’s controls, windows and failure card, these settings and the handbook/,
    );
  });

  it('switches the slip at once, the page’s language with it, and the front door once it closes', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Français' }));
    expect(document.documentElement.lang).toBe('fr');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('fr');
    const slip = screen.getByRole('dialog', { name: 'Les petits détails.' });
    expect(within(slip).getByRole('radiogroup', { name: 'Langue' })).toBeTruthy();
    expect(within(slip).getByRole('checkbox', { name: 'Mouvement réduit' })).toBeTruthy();
    expect(within(slip).getByRole('heading', { name: 'Les cafés de ce navigateur' })).toBeTruthy();
    fireEvent.click(within(slip).getByRole('button', { name: 'Fermer la fenêtre' }));
    expect(screen.getByRole('button', { name: /Choisir un service/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comment jouer' })).toBeTruthy();
    expect(screen.getByText(/Une douce aventure de programmation/)).toBeTruthy();
  });

  it('keeps the language for the browser, not in the café', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    seedLocalStorage(makeSave({ unlocked: 3, selected: 3, stars: { 0: 3, 1: 3, 2: 2 } }));
    render(<App />);
    expect(document.documentElement.lang).toBe('fr');
    expect(screen.getByText('Là où vous en étiez')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reprendre le service 04/ })).toBeTruthy();
    expect(localStorage.getItem(SAVE_KEY)).not.toMatch(/"fr"|language/);
  });

  it('follows another tab that changes it', () => {
    render(<App />);
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_KEY }));
    });
    expect(screen.getByRole('button', { name: 'Réglages' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('fr');
  });

  it('turns away a file that isn’t a café in French, and keeps the café', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }));
    const text = 'shopping list';
    fireEvent.change(screen.getByLabelText('Importer un fichier de sauvegarde'), {
      target: { files: [Object.assign(new File([text], 'notes.json'), { text: async () => text })] },
    });
    expect((await screen.findByRole('alert')).textContent).toBe(
      'notes.json n’a pas été importé. Ce n’est pas un café exporté de Caffeine Protocol. Votre café actuel est conservé.',
    );
  });

  it('meets the crew in the handbook when the story does, in French too', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    seedLocalStorage(makeSave({ unlocked: UNLOCKS.prep - 1, selected: 0 }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Comment jouer' }));
    const guide = screen.getByRole('dialog', { name: 'Comment tourne le café.' }).textContent;
    expect(guide).toContain(
      `jusqu’à ce que le café tourne tout seul${NBSP}: Query prend les commandes dès le service 02 et Brew tient la cuisine dès le service 09.`,
    );
    expect(guide).not.toMatch(/Porter|trois robots/);
    expect(guide).toContain(
      'Query note ce que le client a demandé, Brew prépare exactement ce que dit le ticket et Pip l’apporte à la table indiquée.',
    );
    // Programming words are the game's, in either language.
    expect(guide).toContain('Move compte des cases entières');
  });
});

describe('the order rail in French', () => {
  const served = () => seedLocalStorage(makeSave({ unlocked: 3, selected: 3, stars: { 0: 0, 1: 3, 2: 2 } }));

  it('chalks up the shift in French, and keeps its English name and story said as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    served();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Choisir un service' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Campagne' })).toBeTruthy();
    expect(document.querySelector('.pass-progress')!.textContent).toMatch(/^3 services servis sur \d+$/);
    const board = within(screen.getByRole('complementary', { name: 'Service choisi' }));
    expect(document.querySelector('.board-no')!.textContent).toBe(`N°${NBSP}04`);
    expect(board.getByText('À suivre')).toBeTruthy();
    expect(board.getByRole('heading', { name: titleFor(3) }).lang).toBe('en');
    expect(board.getByText(narrativeFor(3).story).lang).toBe('en');
    expect(board.getByRole('button', { name: 'Commencer le service' })).toBeTruthy();
    expect(board.getByText('Le mot du chef')).toBeTruthy();
  });

  it('reads each line and each ticket out in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    served();
    render(<App />);
    expect(screen.getByRole('button', { name: `Service 2${NBSP}: ${titleFor(1)}, 3 étoiles sur 3` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Service 4${NBSP}: ${titleFor(3)}, à suivre` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Service 5${NBSP}: ${titleFor(4)}, verrouillé` })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acte II, verrouillé tant que l’acte I n’est pas servi' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Acte I · Query, 2 sur \d+ servis, 5 étoiles sur \d+$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comment jouer' })).toBeTruthy();
  });

  it('leaves an English page’s names unmarked', () => {
    window.location.hash = '/campaign';
    served();
    render(<App />);
    const board = within(screen.getByRole('complementary', { name: 'Selected shift' }));
    expect(board.getByRole('heading', { name: titleFor(3) }).hasAttribute('lang')).toBe(false);
  });
});

describe('the shift screen in French', () => {
  /** Shift 4, opened on its code with the scene skipped; the dialogue box's buttons are still in English. */
  const open = () => {
    seedLocalStorage(makeSave({ unlocked: 3, selected: 3 }));
    window.location.hash = '/shift/4';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  };

  it('labels the bar, the toolbar and the coding pane in French, and keeps the shift’s own words said as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    expect(screen.getByRole('button', { name: 'Campagne Service 04' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Le café en mots' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Vue de la caméra' }).textContent).toMatch(/Tout le café/);
    const toolbar = within(screen.getByRole('group', { name: 'Commandes du service' }));
    expect(toolbar.getByRole('button', { name: /^Lancer le service/ })).toBeTruthy();
    expect(toolbar.getByRole('button', { name: 'Mettre en pause' })).toBeTruthy();
    expect(toolbar.getByRole('slider', { name: 'Vitesse de lecture' })).toBeTruthy();
    expect(document.querySelector('.playback-speed small')!.textContent).toMatch(/^1 bloc · \d+,\d\d s$/);
    expect(screen.getByRole('heading', { level: 2, name: titleFor(3) }).lang).toBe('en');
    expect(document.querySelector('.shift-objective')!.firstElementChild!.textContent).toBe('Objectif');
    expect(document.querySelector('.shift-objective')!.lastElementChild!.getAttribute('lang')).toBe('en');
    for (const name of ['Annuler', 'Rétablir', 'Aide', 'Carnet', 'Banc d’essai', 'Options'])
      expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Routines des robots' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Routine de Query' })).toBeTruthy();
  });

  it('says where the service pauses by itself, in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Pause auto' }));
    const menu = within(screen.getByRole('group', { name: 'Mettre le service en pause de lui-même' }));
    expect(menu.getByText('Aucune marque pour l’instant')).toBeTruthy();
    fireEvent.click(menu.getByRole('checkbox', { name: /^Un faux pas/ }));
    expect(screen.getByRole('button', { name: 'Pause auto, 1 réglage actif' })).toBeTruthy();
  });

  it('runs the service in French, and says so', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: /^Lancer le service/ }));
    expect(screen.getByRole('button', { name: /^Retour au code/ })).toBeTruthy();
    expect(document.querySelector('.playback-toolbar [role="status"]')!.textContent).toMatch(
      /^Service en cours(, manche 1 sur \d+)?\. Les routines restent verrouillées jusqu’à l’arrêt\.$/,
    );
  });

  it('opens the options in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const options = within(screen.getByRole('dialog', { name: 'Options' }));
    for (const name of ['Éditeur de texte', 'Reprises plus courtes'])
      expect(options.getByRole('checkbox', { name })).toBeTruthy();
    expect(options.getByRole('button', { name: /^Comparer des essais/ })).toBeTruthy();
    expect(options.getByRole('button', { name: 'Voir un rapport de problème' })).toBeTruthy();
  });

  it('names the versions to go back to in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const programs = (query: string) => ({ query, prep: '', floor: '' });
    const served = lessons[2].solution;
    seedLocalStorage(
      makeSave({
        unlocked: 3,
        selected: 2,
        stars: { 0: 3, 1: 3, 2: 2 },
        robotSolutions: { 1: programs(`# mine\n${lessons[1].solution}`), 2: programs(served) },
        robotDrafts: { 2: programs(served.replace('DEPOSIT RIGHT', 'DEPOSIT UP')) },
      }),
    );
    window.location.hash = '/shift/3';
    render(<App />);
    const skip = screen.queryByRole('button', { name: 'Skip' });
    if (skip) fireEvent.click(skip);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /^Restaurer la routine de Query/ }));
    const slip = within(screen.getByRole('dialog', { name: 'Restaurer la routine de Query' }));
    expect(slip.getAllByRole('radio').map((r) => r.closest('label')!.querySelector('strong')!.textContent)).toEqual([
      'Dernière servie',
      'Du service 02',
      'Routine de départ',
    ]);
    const compare = slip.getByRole('region', { name: /^Par rapport à la routine actuelle de Query/ });
    expect(compare.textContent).toContain('1 ligne revient · 1 ligne retirée');
    fireEvent.click(slip.getByRole('button', { name: 'Restaurer cette version' }));
    expect(
      screen.getByText(
        `La routine de Query revient à la version «${NBSP}Dernière servie${NBSP}». Annuler ramène la vôtre.`,
        { normalizer: (text) => text },
      ),
    ).toBeTruthy();
  });

  it('frames a photo in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE_WORDS.fr.photoMode }));
    const framing = within(screen.getByRole('group', { name: 'Cadrage' }));
    for (const name of ['Tout le café', 'Comptoir', 'Cuisine', 'Salle'])
      expect(framing.getByRole('button', { name })).toBeTruthy();
  });

  it('walks the first routine in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    seedLocalStorage(makeSave({ unlocked: 1, selected: 1 }));
    window.location.hash = '/shift/2';
    render(<App />);
    const skip = screen.queryByRole('button', { name: 'Skip' });
    if (skip) fireEvent.click(skip);
    const tips = screen.getByRole('complementary', { name: /^Première routine ?· Étape 1 sur 3$/ });
    expect(tips.querySelector('.first-routine-text strong')!.textContent).toBe('Construire.');
    expect(within(tips).getByRole('button', { name: WORKSPACE_WORDS.fr.tips.hide })).toBeTruthy();
  });

  it('opens the field notes in French, with the shift’s own words said as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Aide' }));
    const notes = screen.getByRole('dialog', { name: titleFor(3) });
    expect(notes.querySelector('.modal-kicker')!.textContent).toBe('Service 04 · Notes de terrain');
    expect(notes.querySelector('h2')!.lang).toBe('en');
    expect(notes.querySelector('.lesson-note')!.getAttribute('lang')).toBe('en');
    const help = within(notes);
    expect(help.getByRole('button', { name: /Revoir l’introduction/ })).toBeTruthy();
    expect(help.getByText('Deux étoiles')).toBeTruthy();
    expect(help.getByText('Les indices viennent un par un')).toBeTruthy();
    fireEvent.click(help.getByRole('button', { name: 'Rappeler l’idée' }));
    fireEvent.click(help.getByRole('button', { name: 'Donner un indice' }));
    const hints = help.getByRole('list', { name: 'Indices' });
    expect([...hints.querySelectorAll('.help-hint-label')].map((label) => label.textContent)).toEqual([
      'Rappel',
      'Indice',
    ]);
    expect(hints.querySelector('li:last-child p')!.textContent).toMatch(/^(L’exemple corrigé|La routine de Query)/);
    expect(help.getByText('2 indices sur 3')).toBeTruthy();
    fireEvent.click(help.getByRole('button', { name: 'Révéler l’exemple corrigé' }));
    expect(help.getByRole('button', { name: /^Utiliser cet exemple/ })).toBeTruthy();
  });

  it('hands over the receipt in French', () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem(LANGUAGE_KEY, 'fr');
      const save = makeSave({ unlocked: 2, selected: 1, stars: { 1: 3 } });
      seedLocalStorage({
        ...save,
        settings: { ...save.settings, short_repeats: true },
        robotDrafts: { 1: { query: lessons[1].solution, prep: '', floor: '' } },
      });
      window.location.hash = '/shift/2';
      render(<App />);
      const skip = screen.queryByRole('button', { name: 'Skip' });
      if (skip) fireEvent.click(skip);
      fireEvent.click(screen.getByRole('button', { name: /^Lancer le service/ }));
      for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      fireEvent.keyDown(window, { key: 'Escape' });
      const receipt = screen.getByRole('dialog', { name: 'Service terminé' });
      expect(receipt.querySelector('.modal-kicker')!.textContent).toBe('Service 02 · Addition');
      const slip = within(receipt);
      expect(slip.getByRole('img', { name: '3 étoiles sur 3' })).toBeTruthy();
      for (const total of ['Clients servis', 'Blocs utilisés', 'Pas exécutés'])
        expect(slip.getByText(total)).toBeTruthy();
      expect(receipt.querySelector('.receipt-thanks')!.textContent).toBe(`Merci. À suivre${NBSP}: ${titleFor(2)}`);
      expect(receipt.querySelector('.receipt-thanks strong')!.getAttribute('lang')).toBe('en');
      expect(slip.getByRole('button', { name: 'Rester sur ce service' })).toBeTruthy();
      expect(slip.getByRole('button', { name: /^Service suivant/ })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps and brings back a notebook page in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Carnet' }));
    const notebook = within(screen.getByRole('dialog', { name: 'Carnet de routines' }));
    expect(notebook.getByText(/^Pas encore de page\./)).toBeTruthy();
    const name = notebook.getByRole('textbox', { name: 'Garder la routine de Query sous le nom' }) as HTMLInputElement;
    expect(name.value).toBe('Query, service 04');
    fireEvent.click(notebook.getByRole('button', { name: /^Garder la page/ }));
    const status = () => document.querySelector('.notebook-status [role="status"]')!.textContent;
    expect(status()).toBe(`Routine de Query gardée sous le nom «${NBSP}Query, service 04${NBSP}».`);
    const kept = notebook.getByRole('radio', { name: /^Query, service 04/ }).closest('label')!;
    expect(kept.querySelector('small')!.textContent).toMatch(/^Query · Service 04 · \d+ blocs?$/);
    expect(notebook.getByRole('button', { name: 'Identique à celle de Query' })).toBeTruthy();
    fireEvent.click(notebook.getByRole('button', { name: /^Écrire une leçon/ }));
    expect(notebook.getByRole('heading', { name: 'Leçon · Query, service 04' })).toBeTruthy();
    expect(notebook.getByRole('textbox', { name: 'Ce qu’elle montre' })).toBeTruthy();
    expect(notebook.getByRole('button', { name: /^Exporter la leçon/ })).toBeTruthy();
    fireEvent.click(notebook.getByRole('button', { name: /^Retour au carnet/ }));
    fireEvent.click(notebook.getByRole('button', { name: 'Retirer la page' }));
    expect(status()).toBe(`«${NBSP}Query, service 04${NBSP}» retirée.`);
    expect(notebook.getByRole('button', { name: 'La remettre' })).toBeTruthy();
  });

  it('writes a bench in French, with what each guest says kept as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Banc d’essai' }));
    const dialog = screen.getByRole('dialog', { name: 'Banc d’essai' });
    const bench = within(dialog);
    expect(dialog.querySelector('.modal-kicker')!.textContent).toBe('Sans étoiles');
    expect(bench.getByRole('group', { name: 'Partir d’une manche du service' })).toBeTruthy();
    const guests = within(bench.getByRole('list', { name: 'Clients du banc' }));
    expect(guests.getByText('Arrive à l’ouverture du café')).toBeTruthy();
    const says = dialog.querySelector('.bench-says')!;
    expect(says.textContent).toMatch(new RegExp(`^Dit «${NBSP}[^«»]+${NBSP}» · Doit recevoir (café|thé)`));
    expect(says.querySelector('span')!.getAttribute('lang')).toBe('en');
    expect(bench.getByRole('button', { name: /^Lancer le banc · \d+ clients?$/ })).toBeTruthy();
    fireEvent.click(guests.getAllByRole('button', { name: 'Retirer le client 1' })[0]);
    expect(dialog.querySelector('.bench-status')!.textContent).toMatch(/^Client 1 retiré\./);
    fireEvent.click(bench.getByRole('button', { name: /^La manche 1|^Les clients du service/ }));
    expect(dialog.querySelector('.bench-status')!.textContent).toMatch(
      new RegExp(`^Manche 1 copiée${NBSP}: \\d+ clients?\\.$`),
    );
  });

  it('leaves an English shift as it was', () => {
    open();
    expect(screen.getByRole('button', { name: /^Run service/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: titleFor(3) }).hasAttribute('lang')).toBe(false);
  });
});

describe('the words themselves', () => {
  it('sets French with its own typography, and leaves English alone', () => {
    const said = words(
      { ask: 'Ready?', name: (cafe: string) => `“${cafe}”: open` },
      { ask: 'Prêt ?', name: (cafe) => `« ${cafe} » : ouvert` },
    );
    expect(said.en.ask).toBe('Ready?');
    expect(said.fr.ask).toBe(`Prêt${NARROW}?`);
    expect(said.fr.name('Chez Lou')).toBe(`«${NBSP}Chez Lou${NBSP}»${NBSP}: ouvert`);
    expect(said.fr.name('Lou’s 14:05')).toContain('14:05');
    expect(words({ n: 'No. 4' }, { n: 'N° 4' }).fr.n).toBe(`N°${NBSP}4`);
  });

  it('counts in French, and says what a café holds', () => {
    const fr = CAFE_WORDS.fr;
    // The prologue is served without stars.
    expect(fr.holds(makeSave({ stars: { 0: 0, 1: 1 } }))).toBe('2 services servis et 1 étoile');
    expect(fr.holds(makeSave({ stars: { 0: 0 } }))).toBe('1 service servi et 0 étoile');
    expect(fr.holds(makeSave({ stars: { 1: 3, 2: 2 } }))).toBe('2 services servis et 5 étoiles');
    expect(fr.holdsOrFresh('')).toBe('est un café tout neuf, sans aucun service servi');
  });

  it('writes a lesson’s file in French, and says why a notebook file is refused', () => {
    const lesson = lessonText(
      {
        name: 'Le café',
        role: 'query',
        shift: 3,
        source: 'LISTEN\nTAKE UP',
        notes: [{ block: 1, text: 'Prendre le bon.' }],
      },
      NOTEBOOK_WORDS.fr.file,
    );
    expect(lesson).toContain('Une leçon du carnet de routines de Caffeine Protocol');
    expect(lesson).toContain(`La routine, avec sa note marquée${NBSP}:`);
    expect(lesson).toContain('Pas à pas\n\n1. TAKE UP (ligne 2)\n   Prendre le bon.');
    let refusal: unknown;
    try {
      parseNotebook('{"version": 4, "stars": {}}');
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(NotebookRefusal);
    expect(NOTEBOOK_WORDS.fr.refused[(refusal as NotebookRefusal).why]).toBe(
      `C’est un export de café${NBSP}: importez-le depuis les Réglages.`,
    );
  });

  it('compares two runs in French, and eases a bench’s rules in French', () => {
    const level = levels[2];
    const runOf = (id: number, query: string) => {
      const programs = { query, prep: '', floor: '' };
      const { result } = createLiveRun(level, programs, {}).advance(1e9);
      return recordRun(
        id,
        level,
        programs,
        result,
        level.seeds.map((_, i) => i),
      );
    };
    const stopped = runOf(1, 'LISTEN\nITEM coffee'),
      served = runOf(2, lessons[2].solution);
    const say = COMPARE_WORDS.fr;
    expect(runName(level, stopped, say)).toBe('Essai 1 · Service · Arrêté');
    const rows = compareRuns(level, stopped, served, say);
    const row = (label: string) => rows.find((r) => r.label === label)!;
    expect(row('Issue')).toMatchObject({
      before: 'Query s’est arrêté · Manche 1 · Mr. Albert',
      after: 'Servi',
      delta: 'Servi désormais',
    });
    expect(row('Clients servis').before).toMatch(/^\d+ sur \d+$/);
    expect(row('Durée du service').after).toMatch(/^\d+,\d s$/);
    expect(row('Humeur des clients').after).toMatch(new RegExp(`^\\d+${NBSP}%$`));
    expect(row('Humeur des clients').note).toBe(say.rows.unjudged);

    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(
      <LanguageProvider>
        <CompareModal level={level} records={[stopped, served]} crew={['query']} onClose={() => {}} />
      </LanguageProvider>,
    );
    const slip = within(screen.getByRole('dialog', { name: 'Comparer des essais' }));
    expect(slip.getByRole('table', { name: 'Essai 1 face à l’essai 2' })).toBeTruthy();
    expect(slip.getByRole('columnheader', { name: 'Écart' })).toBeTruthy();
    expect(slip.getByRole('heading', { name: 'Ce qui a changé dans les routines' })).toBeTruthy();
    expect(document.querySelector('.restore-compare-title span')!.textContent).toMatch(
      /^\d+ lignes? ajoutées?( · \d+ lignes? retirées?)?$/,
    );
    expect(slip.getByRole('list', { name: 'Routine de Query, de l’essai 1 à l’essai 2' })).toBeTruthy();

    expect(easeChoice(levels[17], 'cups', BENCH_WORDS.fr.eases)).toEqual({
      label: 'Deux fois plus de tasses',
      detail: '8 tasses au lieu de 4.',
    });
    const eased = easedWords(['cups', 'closing'], BENCH_WORDS.fr);
    expect(eased).toBe('avec deux fois plus de tasses et sans heure de fermeture');
    expect(WORKSPACE_WORDS.fr.practice.reason(true, eased)).toMatch(
      /^Le banc d’essai a tourné avec deux fois plus de tasses et sans heure de fermeture, et ne rapporte pas d’étoiles/,
    );
  });

  it('reads a failure card in French, with why it stopped and what Query heard kept as English', () => {
    // Shift 5's routine, with its sugar check needing coffee too: Mr. Albert's tea with sugar goes out without it.
    const query = lessons[4].solution.replace(
      'IF sugar IN CUSTOMER SPEECH',
      'IF sugar IN CUSTOMER SPEECH AND coffee IN CUSTOMER SPEECH',
    );
    const level = levels[4];
    const evidence = evidenceOf(
      level,
      recordRun(
        1,
        level,
        { query, prep: '', floor: '' },
        runCampaignLevel(4, query),
        level.seeds.map((_, i) => i),
      ),
    )!;
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(
      <LanguageProvider>
        <FailureCard
          evidence={evidence}
          stale
          rounds={level.seeds.length}
          onShowLine={() => {}}
          onPractise={() => {}}
        />
      </LanguageProvider>,
    );
    const card = within(screen.getByRole('region', { name: /^Query s’est arrêté ?· Manche 1 · Client 3$/ }));
    expect(document.querySelector('.failure-card-stale')!.textContent).toBe(
      `De votre dernier essai. La routine a changé depuis${NBSP}: entraînez-vous sur cette manche pour vérifier, ou lancez tout le service.`,
    );
    expect(card.getByText('“tea with sugar”').getAttribute('lang')).toBe('en');
    expect(document.querySelector('.failure-card-reason')!.getAttribute('lang')).toBe('en');
    expect(card.getByRole('table', { name: 'Ce qui était demandé, face à ce qui s’est passé' })).toBeTruthy();
    expect(card.getByRole('row', { name: 'Sucre Avec sucre Sans sucre' })).toBeTruthy();
    const decided = within(card.getByRole('region', { name: 'Ce que Query a décidé' }));
    expect(decided.getByText('if sugar in orders and coffee in orders').getAttribute('lang')).toBe('en');
    expect(document.querySelectorAll('.failure-decision-if')[1].textContent).toBe(
      `if sugar in orders and coffee in orders${NARROW}? Non`,
    );
    expect(document.querySelectorAll('.failure-decision-parts')[0].textContent).toBe(
      `sugar in orders${NBSP}: oui · coffee in orders${NBSP}: non`,
    );
    expect(document.querySelectorAll('.failure-decision-heard')[0].textContent).toBe('Entendu dans orders: tea, sugar');
    expect(document.querySelector('.failure-card-next')!.textContent).toBe(
      `À essayer ${failureHint('ticket-sugar', FAILURE_WORDS.fr.hints)}`,
    );
    expect(card.getByRole('button', { name: 'S’entraîner sur la manche 1' })).toBeTruthy();
    expect(FAILURE_WORDS.fr.hints.compile).toBe('Corrigez le bloc surligné, et le service pourra tourner.');
    expect(FAILURE_WORDS.fr.title('Brew', true)).toBe('La routine de Brew ne peut pas tourner');
    expect(FAILURE_WORDS.fr.eased(easedWords(['closing'], BENCH_WORDS.fr))).toBe(
      'Le banc d’essai a tourné sans heure de fermeture.',
    );
  });

  it('leaves no French line in English', () => {
    // Names and words that read the same in both.
    const same = new Set(['Cafés', 'Options', 'Tables', 'Service', 'Photo', 'Pause', 'Table', 'Destination']);
    const catalogs = [
      HOME_WORDS,
      SETTINGS_WORDS,
      CAFE_WORDS,
      GUIDE_WORDS,
      RAIL_WORDS,
      WORKSPACE_WORDS,
      PANE_WORDS,
      OPTIONS_WORDS,
      HELP_WORDS,
      RECEIPT_WORDS,
      CHALLENGE_WORDS,
      NOTEBOOK_WORDS,
      BENCH_WORDS,
      COMPARE_WORDS,
      FAILURE_WORDS,
    ];
    for (const catalog of catalogs) {
      const english = new Map(lines(catalog.en));
      for (const [path, line] of lines(catalog.fr))
        if (!same.has(line)) expect({ path, line }).not.toEqual({ path, line: english.get(path) });
    }
  });
});
