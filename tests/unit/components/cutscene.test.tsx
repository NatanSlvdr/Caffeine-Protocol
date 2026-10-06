import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Cutscene } from '../../../src/components/dialogue/Cutscene';
import { CAMPAIGN_LENGTH } from '../../../src/data';
import {
  cutscenes,
  sceneBefore,
  sceneLines,
  sceneOpen,
  sceneSeen,
  waitingScene,
} from '../../../src/data/campaign/cutscenes';
import { CAST_IDS, type DialogueLine } from '../../../src/domain/dialogue';
import { makeSave } from '../../helpers/saves';
import { UNLOCKS } from '../../../src/domain/unlocks';

describe('cutscene scripts', () => {
  it('plays in campaign order, one per shift, ending after the last shift', () => {
    const before = cutscenes.map((scene) => scene.before);
    expect(before).toEqual([...before].sort((a, b) => a - b));
    expect(new Set(before).size).toBe(before.length);
    expect(before[0]).toBe(0);
    expect(before.at(-1)).toBe(CAMPAIGN_LENGTH);
    expect(new Set(cutscenes.map((scene) => scene.id)).size).toBe(cutscenes.length);
  });

  it('introduces each robot, and the whole crew, on the shift where they arrive', () => {
    expect(sceneBefore(UNLOCKS.query - 1)?.id).toBe('the-scrapyard');
    expect(sceneBefore(UNLOCKS.prep - 1)?.id).toBe('a-second-pair-of-hands');
    expect(sceneBefore(UNLOCKS.floor - 1)?.id).toBe('the-floor-robot');
    expect(sceneBefore(UNLOCKS.toGo - 1)?.id).toBe('back-to-school');
  });

  it('gives every still art notes and lines spoken only by known cast', () => {
    for (const scene of cutscenes) {
      expect(scene.id).toMatch(/^[a-z0-9-]+$/);
      expect(scene.logline).toBeTruthy();
      for (const panel of scene.panels) {
        expect(panel.art).toBeTruthy();
        expect(panel.lines.length).toBeGreaterThan(0);
        for (const line of panel.lines) {
          expect(line.text).toBeTruthy();
          if (line.who) expect(CAST_IDS).toContain(line.who);
        }
      }
    }
  });

  it('flattens a scene into its lines, each tagged with the still it plays over', () => {
    const scene = cutscenes[0];
    const { lines, panels } = sceneLines(scene);
    expect(lines.length).toBe(panels.length);
    expect(panels[0]).toBe(0);
    expect(panels.at(-1)).toBe(scene.panels.length - 1);
  });
});

describe('cutscene progress', () => {
  const keys = sceneBefore(0)!;
  const scrapyard = sceneBefore(UNLOCKS.query - 1)!;
  const closing = cutscenes.at(-1)!;

  it('holds only the next unplayed shift behind an unseen scene', () => {
    const fresh = makeSave({ story: {} });
    expect(waitingScene(fresh, 0)).toBe(keys);
    expect(waitingScene(fresh, 1)).toBeUndefined();
    expect(waitingScene({ ...fresh, story: { 0: true } }, 0)).toBeUndefined();
    // An older save that already played past a scene keeps its shifts.
    const older = makeSave({ story: {}, unlocked: 2, stars: { 0: 0, 1: 3 } });
    expect(waitingScene(older, 1)).toBeUndefined();
    expect(waitingScene({ ...older, unlocked: 1, stars: { 0: 0 } }, 1)).toBe(scrapyard);
  });

  it('opens scenes with the shift they lead to, and the last one with the ending', () => {
    const save = makeSave({ story: {}, unlocked: 2 });
    expect(sceneOpen(save, scrapyard)).toBe(true);
    expect(sceneOpen(save, sceneBefore(UNLOCKS.prep - 1)!)).toBe(false);
    expect(sceneOpen(save, closing)).toBe(false);
    expect(sceneSeen(save, scrapyard)).toBe(false);
    const done = makeSave({ story: {}, unlocked: CAMPAIGN_LENGTH - 1, complete: true });
    expect(sceneOpen(done, closing)).toBe(true);
    expect(sceneSeen(done, closing)).toBe(true);
  });
});

describe('Cutscene', () => {
  it('reads the first still’s art notes out as it lands', () => {
    const scene = cutscenes[0];
    // A live region keeps quiet about what it opens with, so on first paint it must still be empty.
    const first = renderToStaticMarkup(<Cutscene scene={scene} onDone={() => {}} reduced />);
    const doc = new DOMParser().parseFromString(first, 'text/html');
    expect(doc.querySelector('.cutscene > p.sr-only[aria-live]')?.textContent).toBe('');
    const { container } = render(<Cutscene scene={scene} onDone={() => {}} reduced />);
    expect(container.querySelector('.cutscene > p.sr-only[aria-live]')?.textContent).toBe(scene.panels[0].art);
  });

  it('changes still as the dialogue moves into the next panel, then finishes', () => {
    const scene = cutscenes[0];
    const onDone = vi.fn();
    const { container } = render(<Cutscene scene={scene} onDone={onDone} reduced />);
    const shown = () =>
      [...container.querySelectorAll('.cutscene-still')].findIndex((still) => still.matches('.shown'));
    expect(container.querySelectorAll('.cutscene-still').length).toBe(scene.panels.length);
    // The pictures are hidden from screen readers, so the shown still's art notes are read out instead.
    const described = () => container.querySelector('.cutscene > p.sr-only[aria-live]')?.textContent;
    expect(shown()).toBe(0);
    expect(described()).toBe(scene.panels[0].art);
    expect(container.querySelector('.cutscene-still.under')).toBeNull();
    for (let i = 0; i < scene.panels[0].lines.length; i++) fireEvent.keyDown(window, { key: 'Enter' });
    expect(shown()).toBe(1);
    expect(described()).toBe(scene.panels[1].art);
    // The first photo stays on the pile under the new one.
    expect(container.querySelector('.cutscene-still')!.matches('.under')).toBe(true);
    // Going back a line goes back to the photo it was said over.
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(shown()).toBe(0);
    expect(described()).toBe(scene.panels[0].art);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(shown()).toBe(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('choices in the story', () => {
  /** Every line a scene can say: each panel's, and the lines of every answer to its choices. */
  const every = (lines: DialogueLine[]): DialogueLine[] =>
    lines.flatMap((each) => [each, ...every(each.choice?.options.flatMap((option) => option.lines) ?? [])]);
  const asked = cutscenes.flatMap((scene) =>
    scene.panels
      .flatMap((panel) => every(panel.lines))
      .flatMap((each) => (each.choice ? [{ scene, ...each.choice }] : [])),
  );
  const recalled = cutscenes.flatMap((scene) =>
    scene.panels
      .flatMap((panel) => every(panel.lines))
      .flatMap((each) => (each.recalls ? [{ scene, ...each.recalls }] : [])),
  );
  const scrapyard = sceneBefore(UNLOCKS.query - 1)!;
  const closing = cutscenes.at(-1)!;

  it('asks a few, each with two or more answers that Niko says first', () => {
    expect(asked.map((choice) => choice.id)).toEqual(['hello-query', 'hot-chocolate']);
    for (const choice of asked) {
      expect(choice.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(choice.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(choice.options.map((option) => option.id)).size).toBe(choice.options.length);
      for (const option of choice.options) {
        expect(option.id).toMatch(/^[a-z][a-z0-9-]*$/);
        expect(option.label).toBeTruthy();
        expect(option.lines[0].who).toBe('niko');
        // The immediate reaction: someone answers Niko before the scene moves on.
        expect(option.lines.at(-1)?.who).not.toBe('niko');
        for (const said of option.lines) if (said.who) expect(CAST_IDS).toContain(said.who);
      }
    }
  });

  it('calls back to every answer in a later scene, and to nothing never asked', () => {
    for (const recall of recalled) {
      const choice = asked.find((each) => each.id === recall.choice);
      expect(choice, recall.choice).toBeTruthy();
      expect(choice!.options.map((option) => option.id)).toContain(recall.option);
      expect(choice!.scene.before).toBeLessThan(recall.scene.before);
    }
    for (const choice of asked)
      for (const option of choice.options)
        expect(recalled.some((recall) => recall.choice === choice.id && recall.option === option.id)).toBe(true);
  });

  it('says a recalled line only for the answer given, and plays as written when none was', () => {
    const texts = (choices = {}) => sceneLines(closing, choices).lines.map((each) => each.text);
    const plain = texts();
    expect(plain.some((text) => text.includes('Saved'))).toBe(false);
    const minding = texts({ 'hello-query': 'minding' });
    expect(minding.length).toBe(plain.length + 1);
    expect(minding).toContain('*bip* Update. Niko not minding. Café: Niko’s. Saved.');
    expect(texts({ 'hello-query': 'mine', 'hot-chocolate': 'lous' })).toEqual(
      expect.arrayContaining([
        '*bip* Café: Niko’s. Saved since the workbench.',
        'And Saturday’s hot chocolate tasted just like Lou’s. Pencil and all.',
      ]),
    );
    // Each recalled line still plays over its own panel's still.
    const { lines, panels } = sceneLines(closing, { 'hello-query': 'mine' });
    const at = lines.findIndex((each) => each.recalls);
    expect(closing.panels[panels[at]].lines).toContain(lines[at]);
  });

  /** The line being said, as a screen reader hears it. */
  const said = () => document.querySelector('.dialogue-text .sr-only')?.textContent;

  /** Play the scrapyard up to its choice, a line at a time. */
  function toTheChoice(onChoose = vi.fn(), choices = {}) {
    const view = render(<Cutscene scene={scrapyard} onDone={() => {}} reduced choices={choices} onChoose={onChoose} />);
    const before = sceneLines(scrapyard).lines.findIndex((each) => each.choice);
    for (let i = 0; i < before; i++) fireEvent.keyDown(window, { key: 'Enter' });
    return view;
  }

  it('waits at a choice for an answer, then plays it and keeps it', () => {
    const onChoose = vi.fn();
    toTheChoice(onChoose);
    expect(said()).toBe('Query: bip New operator. Identify.');
    const answers = screen.getByRole('group', { name: 'What Niko says' });
    const buttons = [...answers.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent)).toEqual(['1It’s my café now.', '2I’m minding Lou’s café.']);
    expect(document.activeElement).toBe(buttons[0]);
    // Nothing moves the scene past a choice but an answer, or skipping it.
    expect(screen.queryByRole('button', { name: /^Next/ })).toBeNull();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('group', { name: 'What Niko says' })).toBeTruthy();
    fireEvent.keyDown(window, { key: '2' });
    expect(onChoose).toHaveBeenCalledWith('hello-query', 'minding');
    expect(said()).toBe('Niko: Hello, Query. I’m Niko. I’m minding Lou’s café.');
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(said()).toBe('Query: bip Operator: Niko. Minding. Saved.');
  });

  it('can be answered again on the way back, and the new answer plays instead', () => {
    const onChoose = vi.fn();
    toTheChoice(onChoose);
    fireEvent.click(screen.getByRole('button', { name: /minding/ }));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: 'I’m minding Lou’s café. (said this time)' })).toBeTruthy();
    // Moving on with the same answer, or picking the other one.
    expect(screen.getByRole('button', { name: /^Next/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: '1' });
    expect(onChoose).toHaveBeenLastCalledWith('hello-query', 'mine');
    expect(said()).toBe('Niko: Hello, Query. I’m Niko. It’s my café now.');
  });

  it('marks the answer given the last time the scene played', () => {
    toTheChoice(vi.fn(), { 'hello-query': 'mine' });
    expect(screen.getByRole('button', { name: 'It’s my café now. (said last time)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /minding/ }).textContent).not.toContain('Said');
  });

  it('can be skipped like any line, leaving no answer behind', () => {
    const onChoose = vi.fn(),
      onDone = vi.fn();
    render(<Cutscene scene={scrapyard} onDone={onDone} reduced onChoose={onChoose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
