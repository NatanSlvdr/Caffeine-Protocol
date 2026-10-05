import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  BlockPointerSensor,
  BlockTouchSensor,
  TOUCH_LIFT_MS,
  TOUCH_LIFT_TOLERANCE,
} from '../../../src/hooks/blockSensors';
import { Harness, currentSource as source } from '../../helpers/editorHarness';

const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`)!;
const lifting = () => [...document.querySelectorAll('.lifting')];
const touch = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('editing by touch', () => {
  it('leaves a finger and a Pencil to the touch sensor, and a block’s own fields to themselves', () => {
    const pointer = (pointerType: string, target: Element = document.body) =>
      BlockPointerSensor.activators[0].handler(
        { nativeEvent: { pointerType, isPrimary: true, button: 0 }, target } as never,
        { onActivation: () => {} },
      );
    expect(pointer('mouse')).toBe(true);
    expect(pointer('touch')).toBe(false);
    // jsdom has touch events, as a tablet's browser does: its pen comes in by touch too.
    expect('ontouchstart' in window).toBe(true);
    expect(pointer('pen')).toBe(false);
    const field = document.createElement('input');
    expect(pointer('mouse', field)).toBe(false);

    const finger = (target: Element, fingers = 1) =>
      BlockTouchSensor.activators[0].handler({ nativeEvent: { touches: { length: fingers } }, target } as never, {
        onActivation: () => {},
      });
    expect(finger(document.body)).toBe(true);
    expect(finger(document.body, 2)).toBe(false);
    expect(finger(field)).toBe(false);
  });

  it('lifts a block a finger rests on, and lets a swipe scroll past it', () => {
    vi.useFakeTimers();
    render(<Harness initial={'LISTEN\nTICKET\nHELP'} />);
    // A finger down shows the block is about to lift…
    fireEvent.touchStart(block(1), touch(60, 100));
    expect(lifting()).toEqual([block(1)]);
    // …and a swipe before it does is a scroll: the block stays where it is, and nothing is dragged.
    fireEvent.touchMove(block(1), touch(60, 100 + TOUCH_LIFT_TOLERANCE + 4));
    expect(lifting()).toEqual([]);
    act(() => void vi.advanceTimersByTime(TOUCH_LIFT_MS * 2));
    expect(document.querySelector('.drag-preview')).toBeNull();
    fireEvent.touchEnd(block(1));
    expect(source()).toBe('LISTEN\nTICKET\nHELP');

    // A rest the length of the hold lifts it.
    fireEvent.touchStart(block(2), touch(60, 140));
    act(() => void vi.advanceTimersByTime(TOUCH_LIFT_MS));
    expect(lifting()).toEqual([]);
    expect(document.querySelector('.drag-preview')).toBeTruthy();
    fireEvent.touchEnd(block(2));
  });

  it('shows a library block about to lift too', () => {
    render(<Harness initial="LISTEN" />);
    const library = screen.getAllByRole('button', { name: /^Insert / })[0];
    fireEvent.touchStart(library, touch(20, 20));
    expect(lifting()).toEqual([library.closest('.command-tile')]);
    fireEvent.touchEnd(library);
    expect(lifting()).toEqual([]);
  });

  it('settles a typed number on Done, and puts the keyboard away by stepping back out to the block', () => {
    render(<Harness role="floor" initial="MOVE RIGHT 1" />);
    const count = within(block(0)).getByRole('spinbutton');
    expect(count.getAttribute('enterkeyhint')).toBe('done');
    count.focus();
    fireEvent.change(count, { target: { value: '3' } });
    fireEvent.keyDown(count, { key: 'Enter' });
    expect(source()).toBe('MOVE RIGHT 3');
    expect(document.activeElement).toBe(block(0));
    // The Enter was the field's: it didn't go on to pick the block.
    expect(block(0).classList.contains('picked')).toBe(false);
  });

  it('lets a routine scroll under a finger on its blocks, while the café keeps its own gestures', () => {
    const css = ['themes/playful.css', 'base.css', 'workspace.css']
      .map((file) => readFileSync(join(process.cwd(), 'src/styles', file), 'utf8'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const touchAction = (selector: RegExp) =>
      [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, selectors]) => selector.test(selectors))
        .flatMap(([, , body]) => [...body.matchAll(/touch-action:\s*([\w-]+)/g)].map((m) => m[1]));
    for (const draggable of [/\.command-tile\s*$/, /\.code-row \.block\s*$/, /\.code-row \.jump-target\s*$/])
      expect(touchAction(draggable), String(draggable)).toEqual(['manipulation']);
    expect(css).not.toMatch(/\.editor-panel[^{}]*\{[^{}]*touch-action:\s*none/);
  });
});
