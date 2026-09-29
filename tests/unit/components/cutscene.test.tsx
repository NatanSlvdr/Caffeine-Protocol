import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('cutscene scripts', () => {
  it('plays in campaign order, one per shift, ending after the last shift', () => {
    const before = cutscenes.map((scene) => scene.before);
    expect(before).toEqual([...before].sort((a, b) => a - b));
    expect(new Set(before).size).toBe(before.length);
    expect(before[0]).toBe(0);
    expect(before.at(-1)).toBe(CAMPAIGN_LENGTH);
    expect(new Set(cutscenes.map((scene) => scene.id)).size).toBe(cutscenes.length);
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
  const scrapyard = sceneBefore(2)!;
  const closing = cutscenes.at(-1)!;

  it('holds only the next unplayed shift behind an unseen scene', () => {
    const fresh = makeSave({ story: {} });
    expect(waitingScene(fresh, 0)).toBe(keys);
    expect(waitingScene(fresh, 1)).toBeUndefined();
    expect(waitingScene({ ...fresh, story: { 0: true } }, 0)).toBeUndefined();
    // An older save that already played past a scene keeps its shifts.
    const older = makeSave({ story: {}, unlocked: 3, stars: { 0: 0, 1: 0, 2: 3 } });
    expect(waitingScene(older, 2)).toBeUndefined();
    expect(waitingScene({ ...older, unlocked: 2, stars: { 0: 0, 1: 0 } }, 2)).toBe(scrapyard);
  });

  it('opens scenes with the shift they lead to, and the last one with the ending', () => {
    const save = makeSave({ story: {}, unlocked: 2 });
    expect(sceneOpen(save, scrapyard)).toBe(true);
    expect(sceneOpen(save, sceneBefore(14)!)).toBe(false);
    expect(sceneOpen(save, closing)).toBe(false);
    expect(sceneSeen(save, scrapyard)).toBe(false);
    const done = makeSave({ story: {}, unlocked: CAMPAIGN_LENGTH - 1, complete: true });
    expect(sceneOpen(done, closing)).toBe(true);
    expect(sceneSeen(done, closing)).toBe(true);
  });
});

describe('Cutscene', () => {
  it('changes still as the dialogue moves into the next panel, then finishes', () => {
    const scene = cutscenes[0];
    const onDone = vi.fn();
    const { container } = render(<Cutscene scene={scene} onDone={onDone} reduced />);
    const shown = () =>
      [...container.querySelectorAll('.cutscene-still')].findIndex((still) => still.matches('.shown'));
    expect(container.querySelectorAll('.cutscene-still').length).toBe(scene.panels.length);
    expect(shown()).toBe(0);
    // Without art, a still shows its description on a placeholder card.
    expect(screen.getByText(scene.panels[0].art)).toBeTruthy();
    for (let i = 0; i < scene.panels[0].lines.length; i++) fireEvent.keyDown(window, { key: 'Enter' });
    expect(shown()).toBe(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
  });
});
