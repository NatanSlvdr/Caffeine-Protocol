import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { CAFE_WORDS } from '../../../src/app/cafeWords';
import { GUIDE_WORDS } from '../../../src/app/guideWords';
import { SETTINGS_WORDS } from '../../../src/app/settingsWords';
import { HOME_WORDS } from '../../../src/shell/homeWords';
import { RAIL_WORDS } from '../../../src/shell/rail/railWords';
import { titleFor } from '../../../src/data';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { UNLOCKS } from '../../../src/domain';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { LANGUAGE_KEY, words } from '../../../src/shared/language';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
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
      /French covers the front door, the order rail, these settings and the handbook/,
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

  it('leaves no French line in English', () => {
    // Names and words that read the same in both.
    const same = new Set(['Cafés', 'Options', 'Tables', 'Service']);
    for (const catalog of [HOME_WORDS, SETTINGS_WORDS, CAFE_WORDS, GUIDE_WORDS, RAIL_WORDS]) {
      const english = new Map(lines(catalog.en));
      for (const [path, line] of lines(catalog.fr))
        if (!same.has(line)) expect({ path, line }).not.toEqual({ path, line: english.get(path) });
    }
  });
});
