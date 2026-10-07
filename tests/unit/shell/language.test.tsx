import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import App from '../../../src/App';
import { CAFE_WORDS } from '../../../src/app/cafeWords';
import { GUIDE_WORDS } from '../../../src/app/guideWords';
import { SETTINGS_WORDS } from '../../../src/app/settingsWords';
import { SAVE_NOTICE_WORDS } from '../../../src/app/saveNoticeWords';
import { SCREEN_WORDS } from '../../../src/app/screenWords';
import { HOME_WORDS } from '../../../src/shell/homeWords';
import { RAIL_WORDS } from '../../../src/shell/rail/railWords';
import { STORY_WORDS } from '../../../src/shell/storyWords';
import { DRILL_WORDS } from '../../../src/shell/drillWords';
import { STAGE_WORDS } from '../../../src/shared/ui/stageWords';
import { SceneBoundary } from '../../../src/shared/ui/SceneBoundary';
import { SceneCanvas } from '../../../src/components/three/SceneCanvas';
import { SPECIALS_WORDS } from '../../../src/shell/specialsWords';
import { REPAIR_WORDS } from '../../../src/shell/repairWords';
import { SHELF_WORDS } from '../../../src/shell/shelfWords';
import { KEPT_WORDS } from '../../../src/shell/keptWords';
import { acts } from '../../../src/shell/rail/acts';
import { memoryById } from '../../../src/data/memories';
import { predictions } from '../../../src/data/predictions';
import { kits } from '../../../src/data/kits';
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
import { HANDOVER_WORDS } from '../../../src/features/workspace/handoverWords';
import { HandoverCard } from '../../../src/features/workspace/HandoverCard';
import { handoverFor } from '../../../src/features/workspace/handover';
import { PREVIEW_WORDS } from '../../../src/features/workspace/previewWords';
import { BlockPreviewNote } from '../../../src/features/workspace/BlockPreviewNote';
import { dryRound, visitWords } from '../../../src/features/workspace/blockPreview';
import { PAUSE_WORDS } from '../../../src/features/workspace/pauseWords';
import { ROUTE_WORDS } from '../../../src/features/workspace/routeWords';
import { SUMMARY_WORDS } from '../../../src/features/workspace/summaryWords';
import { ServiceSummary } from '../../../src/features/workspace/ServiceSummary';
import { guestDoing, happenings, summarize } from '../../../src/features/workspace/serviceWords';
import { OrderRoute } from '../../../src/features/workspace/OrderRoute';
import { ReplayTimeline } from '../../../src/features/workspace/ReplayTimeline';
import { followable, legWords } from '../../../src/features/workspace/route';
import { momentWords } from '../../../src/features/workspace/timeline';
import { inspectRobot } from '../../../src/features/workspace/inspector';
import { crewActivity } from '../../../src/features/workspace/crew';
import { CARGO_WORDS } from '../../../src/components/cargoWords';
import { SCENE_WORDS } from '../../../src/components/sceneWords';
import { RobotHolding } from '../../../src/components/RobotHolding';
import { OrderQueueBubble } from '../../../src/components/OrderQueueBubble';
import { CustomerSpeech } from '../../../src/components/CustomerSpeech';
import { createRoot } from 'react-dom/client';
import { Editor } from '../../../src/components/Editor';
import { EDITOR_WORDS } from '../../../src/components/editor/editorWords';
import { DialogueBox } from '../../../src/components/dialogue/DialogueBox';
import { shiftIntro } from '../../../src/data/campaign/dialogue';
import { DIALOGUE_WORDS } from '../../../src/components/dialogue/dialogueWords';
import { BLOCK_HELP_WORDS } from '../../../src/components/editor/blockHelpWords';
import { blockHelp, spokenHelp } from '../../../src/components/editor/blockHelp';
import { dragAnnouncements, dragInstructions } from '../../../src/components/editor/dragAnnouncements';
import type { Active, Over } from '@dnd-kit/core';
import { FRESH_SECONDS, specialById } from '../../../src/data/specials';
import { referencePrograms } from '../../../src/data/extension';
import { lessons, levels, titleFor } from '../../../src/data';
import {
  STATIONS,
  UNLOCKS,
  blockVisits,
  compileProgram,
  createLiveRun,
  orderRoute,
  recordRun,
  runLevel,
  runMoments,
  sampleReplay,
} from '../../../src/domain';
import type { OrderTicket } from '../../../src/domain';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { LANGUAGE_KEY, LanguageProvider, LanguageRelay, useWords, words } from '../../../src/shared/language';
import { finishLiveRun, runCampaignLevel } from '../../helpers/run';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { Harness, currentSource, staticEditorProps } from '../../helpers/editorHarness';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const NBSP = ' ';
const NARROW = ' ';
/** Query's order sheet before anything is written on it. */
const blankPaper = { item: '', with_sugar: null, sugar_count: null } as OrderTicket;

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
      /French covers every screen and window, and each shift’s name, brief and scenes/,
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

  it('chalks up the shift in French, its name and story with it', () => {
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
    expect(board.getByRole('heading', { name: `Café ou thé${NARROW}?` }).hasAttribute('lang')).toBe(false);
    expect(document.querySelector('.board-story')!.textContent).toMatch(/^Le thé arrive à la carte/);
    expect(document.querySelector('.board-story')!.hasAttribute('lang')).toBe(false);
    expect(document.querySelector('.board-note')!.textContent).toBe('Le mot du chef Guettez le mot Tea.');
    expect(board.getByRole('button', { name: 'Commencer le service' })).toBeTruthy();
    expect(board.getByText('Le mot du chef')).toBeTruthy();
  });

  it('reads each line and each ticket out in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    served();
    render(<App />);
    expect(
      screen.getByRole('button', { name: `Service 2${NBSP}: Hello, World, un café, 3 étoiles sur 3` }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: `Service 4${NBSP}: Café ou thé${NARROW}?, à suivre` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Service 5${NBSP}: Avec ou sans sucre, verrouillé` })).toBeTruthy();
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

describe('the code editor in French', () => {
  const said = () => document.querySelector('.editor-body ~ [role="status"]')!.textContent;
  const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`)!;
  const french = (editor: React.ReactNode) => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(<LanguageProvider>{editor}</LanguageProvider>);
  };

  it('edits a routine in French, with the blocks’ own words kept as they are', () => {
    french(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nEND\nDEPOSIT RIGHT'} />);
    const library = within(screen.getByRole('region', { name: 'Blocs de code disponibles' }));
    const listen = library.getByRole('button', { name: 'Insérer wait for orders' });
    expect(listen.getAttribute('aria-description')).toMatch(/^Attend le client suivant et écoute sa commande\./);
    expect(screen.getByRole('group', { name: 'Zone de code' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Bloc 2, valeur' })).toBeTruthy();
    expect(block(1).getAttribute('aria-label')).toBe('Glisser le bloc 2 (if tea in orders) et son groupe');

    fireEvent.click(block(4));
    expect(said()).toBe(
      'Les nouveaux blocs vont après le bloc 4 (deposit right). Choisissez-le de nouveau, ou appuyez sur Échap, pour ajouter à la fin.',
    );
    const toolbar = within(screen.getByRole('group', { name: 'Bloc 4' }));
    fireEvent.click(toolbar.getByRole('button', { name: 'Copier' }));
    expect(said()).toBe('Bloc 4 (deposit right) copié. La copie est le bloc 5.');
    fireEvent.click(within(screen.getByRole('group', { name: 'Bloc 5' })).getByRole('button', { name: 'Descendre' }));
    expect(said()).toBe('Le bloc 5 est déjà en bas de la routine.');

    fireEvent.click(screen.getByRole('button', { name: 'Replier le bloc 2' }));
    expect(said()).toBe('Bloc 2 (if tea in orders) replié, avec 1 bloc à l’intérieur.');
    expect(block(1).getAttribute('aria-label')).toBe(
      'Glisser le bloc 2 (if tea in orders) et son groupe, replié avec 1 bloc à l’intérieur',
    );
    fireEvent.click(listen);
    expect(currentSource()).toMatch(/DEPOSIT RIGHT\nLISTEN$/);
    expect(said()).toBe('Bloc 6 (wait for orders) ajouté après le bloc 5 (deposit right).');
    // The check before Run points in French, at what the compiler says in English.
    expect(document.querySelector('.routine-check strong')!.textContent).toBe(`Bloc 6${NBSP}: `);
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(document.activeElement).toBe(block(6));
  });

  it('reads the routine as text in French', () => {
    french(<Editor role="query" {...staticEditorProps('TAKE UP', { textMode: true, level: 21 })} />);
    const text = screen.getByRole('textbox', { name: 'Texte de la routine' });
    expect(text.getAttribute('aria-description')).toBe(
      `La ligne 1 est à corriger avant de lancer${NBSP}: Start with Wait for Orders, or a jump destination. ` +
        'Tab indente, Maj+Tab désindente, Maj+Alt+F range la mise en page, Échap quitte l’éditeur.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ranger' }));
    expect(said()).toBe('La routine est déjà rangée.');
    cleanup();
    french(<Editor role="query" {...staticEditorProps('', { textMode: true })} />);
    expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe(
      'Un bloc par ligne, comme LISTEN ou MOVE RIGHT 1',
    );
  });

  it('says what each block does, and where a dragged block goes, in French', () => {
    const fr = BLOCK_HELP_WORDS.fr;
    expect(blockHelp('TAKE UP', 'prep', UNLOCKS.toGo, fr).text).toBe(
      `Prend au poste dans cette direction${NBSP}: des grains ou des feuilles à la réserve, de l’eau à l’évier, ` +
        'un morceau de sucre au sucrier, un couvercle à la pile de couvercles.',
    );
    expect(blockHelp('LISTEN', 'floor', UNLOCKS.closing, fr).text).toMatch(
      new RegExp(
        `^Wait for Orders prend la prochaine boisson prête${NARROW}; Wait for Dirty cups .* il entend Closed à la place\\.$`,
      ),
    );
    expect(spokenHelp(blockHelp('MOVE RIGHT 1', 'query', 2, fr), fr)).toMatch(
      new RegExp(`passage\\. Par exemple${NBSP}: Move right 1\\.$`),
    );

    const rows = [
      { line: 0, command: 'LISTEN', end: 0 },
      { line: 1, command: 'IF tea IN CUSTOMER SPEECH', end: 5 },
      { line: 2, command: 'TICKET', end: 2 },
      { line: 3, command: 'ELSE', end: 4 },
      { line: 4, command: 'TAKE UP', end: 4 },
    ];
    const active = (id: string) => ({ id }) as Active;
    const over = (id: string) => ({ id }) as Over;
    const say = dragAnnouncements(rows, () => false, EDITOR_WORDS.fr.drag);
    expect(say.onDragStart({ active: active('4') })).toBe('Vous tenez le bloc 5 (take up).');
    expect(say.onDragOver!({ active: active('0'), over: over('gap:2') })).toBe(
      `Le bloc 1 (wait for orders)${NBSP}: avant le bloc 3 (take), dans le bloc 2 (if tea in orders).`,
    );
    expect(say.onDragEnd({ active: active('library:LISTEN'), over: null })).toBe(
      'Un nouveau bloc wait for orders n’était au-dessus d’aucun emplacement. Rien n’a été ajouté.',
    );
    expect(say.onDragCancel!({ active: active('2'), over: null })).toBe('Annulé. Le bloc 3 (take) reste où il était.');
    expect(dragInstructions(EDITOR_WORDS.fr.drag).draggable).toMatch(/^Appuyez sur Espace pour soulever ce bloc/);
  });
});

describe('the dialogue box in French', () => {
  it('drives an English scene in French, with who speaks named in French and what they say kept as English', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const onDone = vi.fn();
    const choice = {
      id: 'greeting',
      options: [
        { id: 'warm', label: 'Welcome back!', lines: [] },
        { id: 'plain', label: 'Hello.', lines: [] },
      ],
    };
    render(
      <LanguageProvider>
        <DialogueBox
          lines={[
            { who: 'juno', text: 'Tea, no sugar.' },
            { who: 'niko', text: 'Coming up.', choice },
          ]}
          choices={{ greeting: 'plain' }}
          lang="en"
          onDone={onDone}
        />
      </LanguageProvider>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Dialogue' });
    expect(dialog.querySelector('.dialogue-name')!.textContent).toBe(`Client${NBSP}:Juno`);
    const spoken = dialog.querySelector('.dialogue-text .sr-only')!;
    expect(spoken.textContent).toBe(`Juno, client${NBSP}: Tea, no sugar.`);
    expect(spoken.querySelector('[lang="en"]')!.textContent).toBe('Tea, no sugar.');
    expect(dialog.querySelector('.dialogue-text > [aria-hidden]')!.getAttribute('lang')).toBe('en');
    expect(screen.getByText('Réplique 1 sur 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Passer' }).getAttribute('title')).toBe(`Passer la suite · Échap`);
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole('button', { name: 'Retour' }).getAttribute('title')).toBe('La réplique précédente · ←');
    // What Niko says stays the story's English; the mark on last time's answer is French.
    const asked = within(screen.getByRole('group', { name: 'Ce que dit Niko' }));
    expect(asked.getByRole('button', { name: 'Hello. (dit la dernière fois)' })).toBeTruthy();
    expect(asked.getByText('Welcome back!').getAttribute('lang')).toBe('en');
    fireEvent.click(asked.getByRole('button', { name: 'Welcome back!' }));
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('says a French scene unmarked, and marks only a line still in English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(
      <LanguageProvider>
        <DialogueBox
          lines={[
            { who: 'juno', text: 'Lovely tea.', lang: 'en' },
            { who: 'niko', text: 'Trois étoiles.' },
          ]}
          instant
          onDone={() => {}}
        />
      </LanguageProvider>,
    );
    const said = () => screen.getByRole('dialog').querySelector('.dialogue-text > [aria-hidden]')!;
    expect(said().getAttribute('lang')).toBe('en');
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(said().textContent).toBe('Trois étoiles.');
    expect(said().hasAttribute('lang')).toBe(false);
  });
});

describe('the drills in French', () => {
  const moment = predictions.find((each) => each.id === 'tea-or-coffee')!;
  const kit = kits.find((each) => each.id === 'two-ifs')!;
  const drills = (served: number) => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    const stars = Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 2]));
    seedLocalStorage(makeSave({ unlocked: served, selected: served, stars }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Exercices/ }));
    return screen.getByRole('dialog', { name: 'Exercices.' });
  };

  it('lists the drills in French, with their own names kept as English', () => {
    const list = within(drills(moment.shift));
    expect(list.getByRole('region', { name: 'Séries, par idée' })).toBeTruthy();
    expect(list.getByRole('region', { name: 'Acte I, Query' })).toBeTruthy();
    const pick = list.getByRole('button', { name: new RegExp(`^${moment.title}`) });
    expect(pick.querySelector('small')!.textContent).toMatch(
      new RegExp(`^Ce qui s’exécute ensuite · Service ${moment.shift} · `),
    );
    expect(pick.querySelector('strong [lang="en"]')!.textContent).toBe(moment.title);
    expect(document.querySelector('.drills-waiting')!.textContent).toMatch(/^0 fait sur \d+ exercices\./);
  });

  it('calls the next block in French, with the blocks and why kept as they are', () => {
    drills(moment.shift);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${moment.title}`) }));
    const view = within(screen.getByRole('dialog', { name: moment.title }));
    expect(document.activeElement!.textContent).toBe(`Quel bloc Query exécute-t-il ensuite${NARROW}?`);
    expect(document.querySelector('.prediction-moment dt')!.textContent).toBe('Le client dit');
    const blocks = within(view.getByRole('list', { name: 'Blocs' })).getAllByRole('button');
    expect(blocks.map((block) => block.getAttribute('aria-label'))).toEqual([
      `A${NBSP}: Write Tea`,
      `B${NBSP}: Write Coffee`,
      `C${NBSP}: Move right 1`,
    ]);
    fireEvent.click(blocks[1]);
    expect(view.getByRole('status').textContent).toBe(
      `Pas cette fois. Ensuite, Query a exécuté A, Write Tea. ${moment.why}`,
    );
    expect(document.querySelector('.block-line.next')!.textContent).toBe('Write Tea A · s’est exécuté ensuite');
    expect(view.getByRole('button', { name: 'Tous les exercices' })).toBeTruthy();
  });

  it('builds from a kit in French', () => {
    drills(kit.shift);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${kit.title}`) }));
    const view = within(screen.getByRole('dialog', { name: kit.title }));
    expect(document.querySelector('.kit-rule')!.textContent).toBe(
      `Le kit 6 blocs, chacun utilisé une fois · ${kit.rule}`,
    );
    expect(document.querySelector('.kit-rule em')!.getAttribute('lang')).toBe('en');
    fireEvent.click(within(view.getByRole('list', { name: 'Le kit' })).getAllByRole('button')[2]);
    expect(document.querySelector('.kit [aria-live]')!.textContent).toBe('If Tea in Orders posé, 1 sur 6.');
    expect(view.getByRole('button', { name: 'Reprendre le dernier bloc' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Lancer le service' })).toBeTruthy();
  });
});

describe('the save notice in French', () => {
  it('says why the café isn’t being saved in French, over the screen and in Settings', async () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    localStorage.setItem(SAVE_KEY, '{broken');
    render(<App />);
    const notice = within(screen.getByRole('alert'));
    expect(notice.getByText(/^La progression sauvegardée n’a pas pu être lue/).textContent).toMatch(
      new RegExp(`intactes${NBSP}: exportez une copie de secours depuis les Réglages\\.$`),
    );
    fireEvent.click(notice.getByRole('button', { name: 'Ouvrir les réglages' }));
    // Settings says it again under the save section, in the same words.
    await waitFor(() => expect(screen.getAllByText(/^La progression sauvegardée n’a pas pu être lue/)).toHaveLength(2));
    expect(SAVE_NOTICE_WORDS.fr.problems.blocked).toMatch(/^Ce navigateur ne laisse pas le café sauvegarder ici/);
  });
});

describe('the rail’s windows in French', () => {
  const campaign = (served: number) => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    const stars = Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 2]));
    seedLocalStorage(makeSave({ unlocked: served, selected: served, stars }));
    render(<App />);
  };

  it('puts up the shelf in French, naming a wrapped keepsake’s act as the rail does', () => {
    campaign(acts[1].to);
    fireEvent.click(screen.getByRole('button', { name: /^Étagère, 1 objet sur 7/ }));
    const shelf = within(screen.getByRole('dialog', { name: 'L’étagère.' }));
    expect(shelf.getByRole('heading', { name: 'Le carnet de commandes de Query' })).toBeTruthy();
    expect(shelf.getByText('Sur l’étagère')).toBeTruthy();
    // Act II is open, so its card says what earns it, as the look it brings does;
    // Act III's name tags, floor plan and stopwatch stay wrapped.
    expect(shelf.getAllByText('Assurer tous les services de l’acte II.')).toHaveLength(2);
    expect(shelf.getAllByText('Quelque chose pour l’acte III. Il sort une fois l’acte II servi.')).toHaveLength(3);
    expect(shelf.getByRole('group', { name: 'Les coussins' })).toBeTruthy();
    expect(shelf.getByRole('radio', { name: /^Le port/ })).toBeTruthy();
  });

  it('reads the guestbook in French, with the regulars’ notes kept as English', () => {
    campaign(6);
    fireEvent.click(screen.getByRole('button', { name: /^Livre d’or, 3 mots/ }));
    const book = within(screen.getByRole('dialog', { name: 'Laissé près de la caisse.' }));
    const notes = book.getAllByRole('listitem');
    expect(notes[0].querySelector('small')!.textContent).toBe(`Juno · Après le service 04, Café ou thé${NARROW}?`);
    expect(notes[0].querySelector('small [lang]')).toBeNull();
    expect(notes[0].querySelector('blockquote')!.getAttribute('lang')).toBe('en');
    expect(book.getByText('Le reste du livre est encore vierge.')).toBeTruthy();
  });

  it('opens the memories in French, with each memory’s own words kept as English', () => {
    campaign(UNLOCKS.help);
    fireEvent.click(screen.getByRole('button', { name: /^Souvenirs, 1 souvenir/ }));
    const board = within(screen.getByRole('dialog', { name: 'Avant l’époque de Niko.' }));
    const memory = memoryById('day-one')!;
    expect(board.getByRole('heading', { name: memory.title }).getAttribute('lang')).toBe('en');
    expect(document.querySelector('.specials-window small')!.textContent).toBe(
      `${memory.from} · Les outils du service 5`,
    );
    expect(board.getByRole('img', { name: 'Pas encore joué' })).toBeTruthy();
    expect(board.getByRole('button', { name: `Jouer ${memory.title}` }).textContent).toBe('Jouer');
  });

  it('puts the specials up in French, with what the regulars asked for kept as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    window.location.hash = '/campaign';
    const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 3]));
    seedLocalStorage(makeSave({ unlocked: 20, selected: 20, complete: true, stars }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Commandes spéciales, 6 commandes' }));
    const board = within(screen.getByRole('dialog', { name: 'Demandées par les habitués.' }));
    expect(board.getByRole('heading', { name: 'The Saturday Market' }).getAttribute('lang')).toBe('en');
    expect(board.getAllByText('Une demande de Mr. Albert').length).toBeGreaterThan(0);
    expect([...document.querySelectorAll('.specials-menus')].map((tally) => tally.textContent)).toEqual([
      `Menus servis${NBSP}: 0 sur 3`,
      '6 vagues',
    ]);
    expect(board.getAllByRole('img', { name: 'Pas encore servi' }).length).toBeGreaterThan(0);
    expect(board.getByRole('button', { name: 'Commencer la journée, The Long Day' })).toBeTruthy();
    fireEvent.click(board.getByRole('button', { name: 'Composer le menu, The Saturday Market' }));
    const tea = specialById('tea-table')!;
    const plan = within(screen.getByRole('dialog', { name: 'The Saturday Market' }));
    expect(plan.getByRole('button', { name: 'Toutes les commandes spéciales' })).toBeTruthy();
    expect(plan.getByText(tea.card!.constraint).getAttribute('lang')).toBe('en');
    expect(plan.getAllByText('La règle')).toHaveLength(3);
    expect(
      plan.getByText(`${tea.level.block_target} blocs ou moins · ${tea.level.instruction_target} pas ou moins`),
    ).toBeTruthy();
    expect(plan.getByRole('button', { name: 'Servir ce menu, The Tea Table' })).toBeTruthy();
  });

  it('opens the repair bay in French, with the robot’s own wiring kept as English', () => {
    campaign(UNLOCKS.sugar);
    fireEvent.click(screen.getByRole('button', { name: 'Atelier, 1 robot sur l’établi' }));
    const bay = within(screen.getByRole('dialog', { name: 'Après la fermeture.' }));
    expect(bay.getByText('Query · Sur l’établi')).toBeTruthy();
    expect(bay.getByText('2 autres robots arrivent sur l’établi au fil des services.')).toBeTruthy();
    fireEvent.click(bay.getByRole('button', { name: 'Ouvrir le panneau, Query’s ears' }));
    expect(bay.getByRole('heading', { name: 'Query’s ears' }).getAttribute('lang')).toBe('en');
    expect(bay.getByRole('group', { name: 'Le câblage de Query' })).toBeTruthy();
    const select = bay.getByRole('combobox', { name: 'Writes tea, quand' });
    expect(select.querySelector('option[value=""]')!.textContent).toBe('Rien');
    expect(select.querySelector('option[value="tea"]')!.getAttribute('lang')).toBe('en');
    expect(bay.getByRole('status').textContent).toBe('2 cas justes sur 6.');
    expect(bay.getAllByRole('img', { name: 'Pas encore' })).toHaveLength(4);
    expect(bay.getByRole('button', { name: 'Fermer le panneau' })).toBeTruthy();
  });

  it('names the tab and a memory’s screen in French, with the memory’s own name kept as English', async () => {
    campaign(UNLOCKS.help);
    expect(document.title).toBe('Choisir un service · Caffeine Protocol');
    fireEvent.click(screen.getByRole('button', { name: /^Souvenirs/ }));
    const memory = memoryById('day-one')!;
    fireEvent.click(screen.getByRole('button', { name: `Jouer ${memory.title}` }));
    await waitFor(() => expect(document.title).toBe(`Souvenir${NBSP}: ${memory.title} · Caffeine Protocol`));
    expect(screen.getByRole('dialog', { name: `Souvenir · ${memory.title}` })).toBeTruthy();
    // The kicker is French up to the memory's name, which is the story's.
    const kicker = document.querySelector('.dialogue-kicker')!;
    expect(kicker.getAttribute('lang')).toBeNull();
    expect(kicker.querySelector('[lang="en"]')!.textContent).toBe(memory.title);
    // A memory's own words are still the story's English, in the coding pane as in the kicker.
    expect(screen.getByRole('heading', { level: 2, name: memory.title }).getAttribute('lang')).toBe('en');
    expect(document.querySelector('.shift-objective')!.lastElementChild!.getAttribute('lang')).toBe('en');
  });
});

describe('the story pages in French', () => {
  it('prints the closing receipt in French, with the café’s own last words kept as English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, i === 4 ? 2 : 3]));
    seedLocalStorage(makeSave({ unlocked: 20, complete: true, stars }));
    window.location.hash = '#/ending';
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Fermeture' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect([...document.querySelectorAll('.story-milestone dt')].map((term) => term.textContent)).toEqual([
      'Acte I · Query a pris les commandes, étoiles',
      'Acte II · Brew a appris toutes les recettes, étoiles',
      'Acte III · Porter a appris la salle, étoiles',
      'Acte IV · Toute l’équipe a tenu la journée, étoiles',
    ]);
    // Shift 5 is Query's: Act I's line carries its missing star.
    expect(document.querySelector('.story-milestone dd .sr-only')!.textContent).toBe('20 sur 21');
    expect(screen.getByText('Services trois étoiles')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Closing time.' }).getAttribute('lang')).toBe('en');
    expect(screen.getByText(/^Lou’s card hangs/).getAttribute('lang')).toBe('en');
    expect(screen.getByRole('button', { name: 'Retourner chercher les étoiles manquantes' })).toBeTruthy();
    expect(screen.getByText('Merci d’avoir passé un moment dans notre café')).toBeTruthy();
  });
});

describe('the shift screen in French', () => {
  /** Shift 4, opened on its code with the scene skipped, in whichever language is set. */
  const open = () => {
    seedLocalStorage(makeSave({ unlocked: 3, selected: 3 }));
    window.location.hash = '/shift/4';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^(Skip|Passer)$/ }));
  };

  it('labels the bar, the toolbar and the coding pane in French, the shift’s own words with them', () => {
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
    expect(screen.getByRole('heading', { level: 2, name: `Café ou thé${NARROW}?` }).hasAttribute('lang')).toBe(false);
    const objective = document.querySelector('.shift-objective')!;
    expect(objective.firstElementChild!.textContent).toBe('Objectif');
    expect(objective.lastElementChild!.textContent).toMatch(/^Les clients commandent maintenant du café ou du thé/);
    expect(objective.lastElementChild!.hasAttribute('lang')).toBe(false);
    for (const name of ['Annuler', 'Rétablir', 'Aide', 'Carnet', 'Banc d’essai', 'Options'])
      expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Routines des robots' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Routine de Query' })).toBeTruthy();
  });

  it('opens the shift on its scene in French, with the blocks named in it kept as they are', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    seedLocalStorage(makeSave({ unlocked: 3, selected: 3 }));
    window.location.hash = '/shift/4';
    render(<App />);
    const scene = screen.getByRole('dialog', { name: `Service 04 · Café ou thé${NARROW}?` });
    expect(scene.querySelector('.dialogue-kicker [lang]')).toBeNull();
    const said = scene.querySelector('.dialogue-text > [aria-hidden]')!;
    expect(said.textContent).toBe(`Grande nouvelle${NBSP}: le thé arrive à la carte${NARROW}!`);
    expect(said.hasAttribute('lang')).toBe(false);
    const block = (text: string) => shiftIntro(3, 'fr').find((l) => l.text.includes(text))!.text;
    expect(block('Nouveau bloc')).toContain('[IF tea IN CUSTOMER SPEECH|If]');
    expect(block('Nouveau bloc')).toContain('[ELSE|Else]');
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

  it('steps a paused service in French, and inspects the robot with what the guest said kept as English', () => {
    vi.useFakeTimers();
    onTestFinished(() => void vi.useRealTimers());
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    seedLocalStorage(
      makeSave({ unlocked: 2, selected: 2, robotDrafts: { 2: { query: lessons[2].solution, prep: '', floor: '' } } }),
    );
    window.location.hash = '/shift/3';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    fireEvent.click(screen.getByRole('button', { name: /^Lancer le service/ }));
    const toolbar = within(screen.getByRole('group', { name: 'Commandes du service' }));
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.click(toolbar.getByRole('button', { name: 'Mettre en pause' }));
    fireEvent.click(toolbar.getByRole('button', { name: 'Avancer Query' }));
    expect(document.querySelector('.playback-toolbar [role="status"]')!.textContent).toBe(
      `Manche 1 · 0,0 s. Query${NBSP}: wait for orders, bloc 2.`,
    );
    const inspector = within(screen.getByRole('complementary', { name: 'Query, en pause' }));
    const row = (name: string) => inspector.getByText(name).nextElementSibling!;
    expect(row('En cours').textContent).toBe('Wait for ordersBloc 2');
    expect(row('Client').textContent).toBe('“coffee”');
    expect(row('Client').querySelector('[lang="en"]')!.textContent).toBe('“coffee”');
    expect(row('Porte').textContent).toBe('Rien');
    expect(row('Mémoire').textContent).toBe('Aucune Var dans cette routine');
    expect(row('Boucle').textContent).toBe('Hors de toute boucle');
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
    const skip = screen.queryByRole('button', { name: 'Passer' });
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
    const skip = screen.queryByRole('button', { name: 'Passer' });
    if (skip) fireEvent.click(skip);
    const tips = screen.getByRole('complementary', { name: /^Première routine ?· Étape 1 sur 3$/ });
    expect(tips.querySelector('.first-routine-text strong')!.textContent).toBe('Construire.');
    expect(within(tips).getByRole('button', { name: WORKSPACE_WORDS.fr.tips.hide })).toBeTruthy();
  });

  it('opens the field notes in French, the shift’s lesson and brief with them', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Aide' }));
    const notes = screen.getByRole('dialog', { name: `Café ou thé${NARROW}?` });
    expect(notes.querySelector('.modal-kicker')!.textContent).toBe('Service 04 · Notes de terrain');
    expect(notes.querySelector('h2')!.hasAttribute('lang')).toBe(false);
    const lesson = notes.querySelector('.lesson-note')!;
    expect(lesson.textContent).toBe(
      'Les conditions portent sur ce qu’a dit le client. Dans la boucle, testez-le avec If Tea IN Orders, puis Write Tea ou Write Coffee.',
    );
    expect(lesson.hasAttribute('lang')).toBe(false);
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
      const skip = screen.queryByRole('button', { name: 'Passer' });
      if (skip) fireEvent.click(skip);
      fireEvent.click(screen.getByRole('button', { name: /^Lancer le service/ }));
      for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      // A shift served before gets only Niko's verdict, in French.
      const verdict = screen.getByRole('dialog', { name: 'Dialogue' }).querySelector('.dialogue-text > [aria-hidden]')!;
      expect(verdict.textContent).toBe('Trois étoiles. C’est la routine la plus soignée que j’aie jamais vue.');
      expect(verdict.hasAttribute('lang')).toBe(false);
      fireEvent.keyDown(window, { key: 'Escape' });
      const receipt = screen.getByRole('dialog', { name: 'Service terminé' });
      expect(receipt.querySelector('.modal-kicker')!.textContent).toBe('Service 02 · Addition');
      const slip = within(receipt);
      expect(slip.getByRole('img', { name: '3 étoiles sur 3' })).toBeTruthy();
      for (const total of ['Clients servis', 'Blocs utilisés', 'Pas exécutés'])
        expect(slip.getByText(total)).toBeTruthy();
      expect(receipt.querySelector('.receipt-thanks')!.textContent).toBe(`Merci. À suivre${NBSP}: Un latte sans fin`);
      expect(receipt.querySelector('.receipt-thanks strong')!.hasAttribute('lang')).toBe(false);
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
  it('says the café is still open in French when it can’t be drawn', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    onTestFinished(() => void vi.restoreAllMocks());
    const Broken = () => {
      throw new Error('no context');
    };
    render(
      <LanguageProvider>
        <SceneCanvas pixelArt={false}>{null}</SceneCanvas>
        <SceneBoundary onRetry={() => {}}>
          <Broken />
        </SceneBoundary>
      </LanguageProvider>,
    );
    expect(screen.getAllByText('Le café est toujours ouvert.')).toHaveLength(2);
    expect(screen.getAllByText(/^Les graphismes 3D ne sont pas disponibles sur cet appareil\./)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Réessayer le café en 3D' })).toBeTruthy();
  });

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

  it('hands a helper’s job over in French, step by step', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(
      <LanguageProvider>
        <HandoverCard handover={handoverFor(UNLOCKS.prep)!} source={'LISTEN\nTAKE UP'} />
      </LanguageProvider>,
    );
    const card = within(
      screen.getByRole('complementary', { name: 'Prend le relais de Moka · 2 sur 7 dans la routine de Brew' }),
    );
    expect(card.getByRole('button', { name: 'Les étapes de Moka' }).title).toBe('Replier les étapes');
    expect(document.querySelector('.handover-lead')!.textContent).toBe(
      'Le travail de Moka revient désormais à Brew. Query remet les tickets, et Pip sert toujours la salle.',
    );
    expect(document.querySelectorAll('.handover-steps .sr-only')[2].textContent).toBe(
      `Les moudre dans la machine à café, avec Use up${NBSP}: pas encore dans la routine de Brew.`,
    );
    expect(document.querySelector('.handover-status')!.textContent).toBe(
      `Pas encore dans la routine de Brew${NBSP}: les moudre dans la machine à café, avec un bloc Use up.`,
    );
    // Every job has a French word for each of its steps.
    for (const role of ['prep', 'floor'] as const)
      expect(HANDOVER_WORDS.fr.jobs[role].steps).toHaveLength(HANDOVER_WORDS.en.jobs[role].steps.length);
  });

  it('says where a picked block goes in French, with why a run stopped kept as English', () => {
    const source = lessons[2].solution;
    const round = dryRound(levels[2], 3, { query: source, prep: '', floor: '' }).execution![0];
    const said = (command: string) =>
      blockVisits(
        round,
        'query',
        source.split('\n').findIndex((l) => l.trim() === command),
      ).map((v) => visitWords(v, command, 'query', 3, PREVIEW_WORDS.fr));
    expect(said('TAKE UP')).toEqual(['Query tend le bras en haut, vers le papier, et prend une feuille.']);
    expect(said('MOVE RIGHT 1')).toEqual([
      'Query avance de 1 case vers la droite, de la caisse au passe de la cuisine.',
    ]);
    expect(said('DEPOSIT RIGHT')).toEqual([
      'Query tend le bras à droite, vers le passe de la cuisine, et pose le ticket.',
    ]);
    expect(PREVIEW_WORDS.fr.place({ table: 3 }, 'to')).toBe('à la table 3');
    expect(PREVIEW_WORDS.fr.tiles([0, 0], [-2, 1])).toBe('2 cases vers la gauche et 1 case vers le bas');

    localStorage.setItem(LANGUAGE_KEY, 'fr');
    render(
      <LanguageProvider>
        <BlockPreviewNote
          textMode={false}
          note={{
            title: 'Bloc 5 · deposit down',
            scope: 'Dans la manche 1',
            ways: [
              { words: 'Query tend le bras en bas, mais il n’y a rien.', times: 2, stop: 'Nothing to put that on' },
            ],
            more: 2,
          }}
        />
      </LanguageProvider>,
    );
    const note = screen.getByRole('region', { name: 'Le bloc choisi, dans le café' });
    expect(note.querySelector('li')!.textContent).toBe(
      `Query tend le bras en bas, mais il n’y a rien. L’essai s’arrête ici${NBSP}: Nothing to put that on. · 2 fois`,
    );
    expect(within(note).getByText('Nothing to put that on').getAttribute('lang')).toBe('en');
    expect(within(note).getByText('Et 2 autres passages.')).toBeTruthy();
  });

  it('reads a paused robot’s carrying, keeping warm and waiting in French', () => {
    const shift21 = referencePrograms(UNLOCKS.together - 1);
    const { level } = specialById('fresh')!;
    const result = finishLiveRun(createLiveRun(level, shift21)).result;
    const seed = result.execution!.find((s) => s.seed_id === result.first_failure!.seed_id)!;
    const sampled = sampleReplay(result, seed.start + result.first_failure!.event_time!);
    const state = inspectRobot(
      result,
      sampled,
      'floor',
      shift21.floor,
      false,
      FRESH_SECONDS,
      PAUSE_WORDS.fr,
      CARGO_WORDS.fr,
    )!;
    expect(state.warm?.[0]).toMatch(/^(Café|Thé) · Table \d · Sur le plateau · 0 s restante$/);
    for (const held of state.holding)
      expect(held).toMatch(/^(Café|Thé) · (\d sucres?|Sans sucre) · (Table \d|À emporter)/);
    expect(state.doing).not.toMatch(/Waiting|Block/);
    const opening = crewActivity(sampleReplay(result, 0), PAUSE_WORDS.fr);
    const labels = Object.values(opening).map((tab) => tab.label);
    expect(labels.length).toBeGreaterThan(1);
    for (const label of labels) expect(label).toMatch(/^(Attend .+|En attente sur «.+»|Travaille sur «.+»)$/);
    const [x, z] = STATIONS.pickup.floor;
    expect([CARGO_WORDS.fr.place([x, z]), CARGO_WORDS.fr.place([99, 99])]).toEqual([
      'Comptoir de retrait',
      'Case (99, 99)',
    ]);
    expect(CARGO_WORDS.fr.paper({ ...blankPaper, item: 'tea', sugar_count: 2, to_go: true })).toBe(
      'Feuille de commande · Thé · 2 sucres · À emporter',
    );
    expect(PAUSE_WORDS.fr.reason({ reason: 'mark', robot: 'prep' })).toBe('À la marque de Brew');
    expect(PAUSE_WORDS.fr.reason({ reason: 'handoff', robot: 'floor' })).toBe('Porter prend une boisson');
    expect(PAUSE_WORDS.fr.when(3, 2, 42)).toBe('Manche 2 · 42,0 s');
    expect(PAUSE_WORDS.fr.when(1, 1, -2)).toBe('Avant l’ouverture');
  });

  it('follows an order through the café in French, with why it stopped kept as English', () => {
    const shift3 = { query: lessons[2].solution, prep: '', floor: '' };
    const { result } = createLiveRun(levels[2], shift3).advance(1e9);
    const guest = result.events[0];
    expect(orderRoute(result, guest).map((leg) => legWords(leg, guest, 3, ROUTE_WORDS.fr))).toEqual([
      'Entre',
      'Query prend la commande',
      'Query écrit le ticket',
      'Moka prend le ticket',
      'Moka prépare le café',
      'Moka le pose au comptoir de retrait',
      'Pip le récupère',
      'Pip le sert à la table 1',
      'Repart',
      'Pip débarrasse la tasse',
    ]);
    // Two cups of one order are each named, with their article.
    const two = createLiveRun(levels[20], referencePrograms(21)).advance(1e9).result;
    const pair = two.events.find((e) => e.tickets.length > 1)!;
    const legs = orderRoute(two, pair).filter((leg) => leg.cup);
    for (const words of legs.map((leg) => legWords(leg, pair, 21, ROUTE_WORDS.fr)))
      expect(words).toMatch(/ (le|la tasse du|le ticket du) ((premier|deuxième) )?(thé|café)( |$)/);

    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const slipped = createLiveRun(levels[2], { query: 'LISTEN\nITEM coffee', prep: '', floor: '' }).advance(1e9);
    const first = slipped.result.events[0];
    const route = orderRoute(slipped.result, first);
    render(
      <LanguageProvider>
        <OrderRoute
          name="Client 1"
          guest={first}
          route={route}
          done
          round={1}
          rounds={3}
          start={0}
          time={1e9}
          level={3}
          onStop={() => {}}
        />
      </LanguageProvider>,
    );
    const card = within(screen.getByRole('region', { name: 'Suivi de la commande de Client 1' }));
    expect(card.getByRole('heading').textContent).toBe(`Suivi${NBSP}: Client 1 · Manche 1`);
    expect(document.querySelector('.order-route-phrase')!.getAttribute('lang')).toBe('en');
    const slip = document.querySelector('.order-route li.slip .order-route-words')!;
    expect(slip.textContent).toBe(`Query s’est arrêté${NBSP}: Take the order paper before writing its item`);
    expect(slip.querySelector('[lang="en"]')!.textContent).toBe('Take the order paper before writing its item');
    expect(card.getByRole('button', { name: 'Arrêter le suivi' })).toBeTruthy();
  });

  it('looks back through a run in French', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const programs = referencePrograms(14);
    const { result } = createLiveRun(levels[13], programs).advance(1e9);
    const moments = runMoments(result, Infinity);
    const handoff = moments.find((m) => m.kind === 'handoff' && m.event.role === 'prep')!;
    expect(momentWords(handoff, programs, false, PAUSE_WORDS.fr, ROUTE_WORDS.fr)).toBe('Brew prend un ticket');
    render(
      <LanguageProvider>
        <ReplayTimeline
          head={60}
          time={0}
          viewing={false}
          moments={moments.filter((m) => m.at <= 60)}
          roundStarts={[]}
          rounds={3}
          when="Manche 1 · 0,0 s"
          crew={['query', 'prep', 'floor']}
          role="prep"
          programs={programs}
          textMode={false}
          onView={() => {}}
          followable={followable(levels[13], result, 60, ROUTE_WORDS.fr.guest)}
          onFollow={() => {}}
        />
      </LanguageProvider>,
    );
    const timeline = within(screen.getByRole('group', { name: 'Revenir sur l’essai' }));
    expect(timeline.getByRole('slider', { name: 'Temps du service' }).getAttribute('aria-valuetext')).toBe(
      'Manche 1 · 0,0 s, maintenant',
    );
    for (const name of ['Moments clés', 'Commandes', 'Passages de relais', 'Blocs de Brew'])
      expect(timeline.getByRole('button', { name })).toBeTruthy();
    expect(timeline.getByRole('combobox', { name: 'Suivre une commande' }).textContent).toMatch(
      /^Suivre une commande….*Client 2 · “tea, 1 sugar”/,
    );
    fireEvent.click(timeline.getByRole('button', { name: 'Moment clé suivant' }));
    expect(document.querySelector('.replay-timeline [aria-live]')!.textContent).toMatch(
      new RegExp(`^Manche 1 · \\d+,\\d s\\. (Query prend une commande${NBSP}: “.+”|Brew prend un ticket)`),
    );
  });

  it('tells the café in words in French, keeping what guests said and why a robot stopped in English', () => {
    const programs = referencePrograms(14);
    const run = runLevel(levels[13], compileProgram(programs.query, 14), programs);
    const fr = { summary: SUMMARY_WORDS.fr, pause: PAUSE_WORDS.fr, cargo: CARGO_WORDS.fr, route: ROUTE_WORDS.fr };
    const dot = run.events.find((e) => e.seed_id === 'L14_A' && e.customer.customer_id === 'C3')!;
    const { arrival, created, seating, seated, served, left } = dot.timing;
    expect(
      [arrival - 1, arrival, created, seating!, seated, served, left].map((t) =>
        guestDoing(dot, t, false, SUMMARY_WORDS.fr.visit),
      ),
    ).toEqual([
      'Arrive au café',
      'Fait la queue pour commander',
      'Attend une table',
      `Va à la table ${dot.table}`,
      `À la table ${dot.table}, attend son café`,
      `Boit son café à la table ${dot.table}`,
      'Repart, commande servie',
    ]);
    const summary = summarize(run, sampleReplay(run, 30), levels[13], 14, fr);
    expect(summary.guests.map(({ who, what }) => [who, what])).toEqual([
      ['Mr. Albert', 'À la table 1, attend son café'],
      ['Client 2', 'À la table 2, attend son thé'],
      ['Dot', 'Attend une table'],
      ['Juno', 'Commande à la caisse'],
    ]);
    expect(summary.crew[1].what).toMatch(new RegExp(`${NARROW}; porte .*Ticket pour un thé · Table 2$`));
    expect(summary.counters).toEqual([
      { who: 'Tickets pour Brew', what: 'thé, café' },
      { who: 'Prêt au comptoir de retrait', what: 'Rien' },
    ]);
    expect(summarize(run, sampleReplay(run, 90), levels[13], 14, fr).counters[0].what).toBe('2 thés');
    const albert = run.events.find((e) => e.seed_id === 'L14_A' && e.customer.customer_id === 'C1')!.timing;
    const second = run.execution![1].start;
    const say = (from: number, to: number) => happenings(run, levels[13], 14, from, to, fr);
    expect(say(-5, 0.5)).toBe('Mr. Albert entre.');
    expect(say(albert.served - 1, albert.served)).toBe('Mr. Albert reçoit son café à la table 1.');
    expect(say(albert.left - 1, albert.left)).toBe('Mr. Albert repart.');
    expect(say(second - 1, second + 0.5)).toBe('La manche 2 sur 3 commence. Client 1 entre.');
    expect(say(-5, 80)).toBe('Mr. Albert entre. Client 2 entre. Dot entre. Et 3 de plus.');

    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const slipped = runLevel(levels[2], compileProgram('LISTEN\nITEM coffee', 3), {
      query: 'LISTEN\nITEM coffee',
      prep: '',
      floor: '',
    });
    const slip = slipped.execution![0].events.find((e) => e.error)!;
    const stopped = summarize(slipped, sampleReplay(slipped, slip.start), levels[2], 3, fr);
    expect(stopped.stopped!.who).toBe('Query');
    render(
      <LanguageProvider>
        <ServiceSummary summary={stopped} when="En pause" />
      </LanguageProvider>,
    );
    const card = within(screen.getByRole('region', { name: 'Le café en mots' }));
    expect(card.getByRole('heading', { name: 'Clients · 0 servi sur 4' })).toBeTruthy();
    expect(card.getByRole('heading', { name: 'Équipe' })).toBeTruthy();
    expect(card.getByRole('heading', { name: 'Comptoirs' })).toBeTruthy();
    const why = document.querySelector('.service-summary-stopped')!;
    expect(why.textContent).toBe(`Query s’est arrêté${NBSP}: ${slip.error!.replace(/\.$/, '')}.`);
    expect(why.querySelector('[lang="en"]')!.textContent).toBe(slip.error!.replace(/\.$/, ''));
    const guest = document.querySelector('.service-summary li strong')!;
    expect(guest.textContent).toBe(`Mr. Albert · “${slipped.events[0].customer.phrase}”`);
    expect(guest.querySelector('[lang="en"]')!.textContent).toBe(slipped.events[0].customer.phrase);
  });

  it('draws the café’s bubbles in French, with block names and what guests say kept English', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    const [x, z] = STATIONS.pickup.floor;
    const paper = { ...blankPaper, item: 'coffee', sugar_count: 2, to_go: true } as OrderTicket;
    const { unmount } = render(
      <LanguageProvider>
        <RobotHolding
          name="Brew"
          inventory={[{ ticketId: 'one', table: 2, item: 'tea', stage: 'brewed', sugar: 1, lid: true }]}
          paper={paper}
          action={{ command: 'TAKE UP', start: 0, progress: 0.4, at: 'sugar' }}
          variables={{ var1: [x, z] }}
        />
      </LanguageProvider>,
    );
    expect(screen.getByLabelText('Ce que porte Brew')).toBeTruthy();
    const chip = screen.getByRole('group', { name: `Brew${NBSP}: Take, Sucre` });
    expect(chip.querySelector('.robot-action-label [lang="en"]')!.textContent).toBe('Take');
    expect(chip.querySelector('.robot-action-at')!.textContent).toBe(' · Sucre');
    const held = within(screen.getByRole('list', { name: 'Inventaire de Brew' }));
    expect(held.getByLabelText('Feuille de commande · Café · 2 sucres · À emporter')).toBeTruthy();
    const cup = held.getByLabelText('Thé · 1 sucre · Couvercle mis · Table 2');
    expect(cup.querySelector('.order-mark')!.textContent).toBe('Couvercle');
    expect(screen.getByRole('group', { name: 'Mémoire de Brew' }).textContent).toBe('Var A = Comptoir de retrait');
    unmount();
    render(
      <LanguageProvider>
        <RobotHolding name="Query" inventory={[]} action={{ command: 'IF ORDER IS COFFEE', start: 0, progress: 0.4 }} />
      </LanguageProvider>,
    );
    expect(screen.getByRole('group', { name: `Query${NBSP}: Réfléchit` }).querySelector('[lang]')).toBeNull();
    cleanup();

    render(
      <LanguageProvider>
        <OrderQueueBubble tickets={[{ ...paper, ticket_id: 't1' }]} />
        <CustomerSpeech customer={levels[13].seeds[0].customers[0]} counterLine="Query: *bip* Albert." />
      </LanguageProvider>,
    );
    const queue = within(screen.getByRole('group', { name: 'File des commandes de la cuisine' }));
    expect(queue.getByText('Commandes')).toBeTruthy();
    expect(
      within(queue.getByRole('list', { name: 'Commandes en attente' })).getByLabelText(
        'café ×1 + 2 sucres, à emporter',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Commandes entendues' })).toBeTruthy();
    expect(document.querySelector('blockquote')!.getAttribute('lang')).toBe('en');
    expect(document.querySelector('.customer-speech small')!.getAttribute('lang')).toBe('en');
    expect(SCENE_WORDS.fr.station({ table: 3 })).toBe('Table 3');
    expect(SCENE_WORDS.fr.order({ quantity: 2, rush: true })).toBe('Commande floue ×2, pressé');
  });

  it('carries the language into a root of its own, as the café’s overlays are', async () => {
    const Probe = () => <span>{useWords(SCENE_WORDS).thinking}</span>;
    const host = document.createElement('div');
    const root = createRoot(host);
    await act(async () => root.render(<LanguageRelay language={['fr', () => {}]}>{<Probe />}</LanguageRelay>));
    expect(host.textContent).toBe('Réfléchit');
    await act(async () => root.unmount());
  });

  it('leaves no French line in English', () => {
    // Names and words that read the same in both.
    const same = new Set([
      'Cafés',
      'Options',
      'Tables',
      'Service',
      'Photo',
      'Pause',
      'Table',
      'Destination',
      'Ticket',
      'Dialogue',
      'Passages',
    ]);
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
      HANDOVER_WORDS,
      PREVIEW_WORDS,
      PAUSE_WORDS,
      CARGO_WORDS,
      ROUTE_WORDS,
      SUMMARY_WORDS,
      SCENE_WORDS,
      EDITOR_WORDS,
      BLOCK_HELP_WORDS,
      DIALOGUE_WORDS,
      STORY_WORDS,
      SAVE_NOTICE_WORDS,
      DRILL_WORDS,
      SHELF_WORDS,
      KEPT_WORDS,
      SPECIALS_WORDS,
      REPAIR_WORDS,
      STAGE_WORDS,
      SCREEN_WORDS,
    ];
    for (const catalog of catalogs) {
      const english = new Map(lines(catalog.en));
      for (const [path, line] of lines(catalog.fr))
        if (!same.has(line)) expect({ path, line }).not.toEqual({ path, line: english.get(path) });
    }
  });
});
