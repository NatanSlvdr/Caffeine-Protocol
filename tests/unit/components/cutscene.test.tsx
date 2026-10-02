import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
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
import { CAST_IDS } from '../../../src/domain/dialogue';
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
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
  });
});
