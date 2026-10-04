import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Harness } from '../../helpers/editorHarness';
import { blockHelp } from '../../../src/components/editor/blockHelp';
import { blockPrototypes, robotCommands, UNLOCKS, type RobotRole } from '../../../src/domain';

const help = () => document.querySelector('.library-help')?.textContent;

describe('the block reference in the library', () => {
  it('explains every block any robot is offered on any shift', () => {
    for (const role of ['query', 'prep', 'floor'] as RobotRole[])
      for (let level = 1; level <= 21; level++)
        for (const command of blockPrototypes(robotCommands(role, level)))
          expect(blockHelp(command, role, level).text, `${role} ${command} on shift ${level}`).not.toBe('');
  });

  it('says what a block does for the robot it belongs to', () => {
    expect(blockHelp('TAKE UP', 'query', 9).text).toBe(
      'Takes a fresh sheet of paper from the stack in that direction.',
    );
    expect(blockHelp('TAKE UP', 'prep', 9).text).toMatch(/^Takes from the station in that direction: beans/);
    expect(blockHelp('TAKE DOWN', 'floor', 14).text).toBe(
      'Picks up from the tile in that direction: a ready drink at pickup.',
    );
    expect(blockHelp('FOR item IN heard orders', 'query', 6).text).toMatch(/once for each item in the order/);
    expect(blockHelp('FOR var1 TIMES', 'prep', 11).text).toMatch(/a number of times/);
  });

  it('only mentions what the shift has unlocked', () => {
    expect(blockHelp('TAKE UP', 'prep', UNLOCKS.prepSugar - 1).text).not.toMatch(/sugar|lid/);
    expect(blockHelp('TAKE UP', 'prep', UNLOCKS.prepSugar).text).toMatch(/a cube at the sugar\.$/);
    expect(blockHelp('TAKE UP', 'prep', UNLOCKS.toGo).text).toMatch(/a cube at the sugar, a lid at the lids\.$/);
    expect(blockHelp('LISTEN', 'floor', UNLOCKS.clearing - 1).text).not.toMatch(/Dirty cups/);
    expect(blockHelp('LISTEN', 'floor', UNLOCKS.clearing).text).toMatch(/Wait for Dirty cups picks a used cup/);
    expect(blockHelp('LISTEN', 'query', UNLOCKS.closing - 1).text).not.toMatch(/Closed/);
    expect(blockHelp('LISTEN', 'query', UNLOCKS.closing).text).toMatch(/hears Closed instead\.$/);
    expect(blockHelp('ITEM coffee', 'query', UNLOCKS.sugar - 1).text).toBe(
      'Writes on the paper Query holds: how many of which drink.',
    );
  });

  it('gives an example only for blocks with something to fill in', () => {
    expect(blockHelp('MOVE RIGHT 1', 'query', 2)).toEqual({
      name: 'Move',
      text: 'Walks that many tiles in a screen direction. A blocked move stops early; customers never block the way.',
      example: 'Move right 1',
    });
    expect(blockHelp('JUMP listen', 'query', 3).example).toBe('');
    expect(blockHelp('STORE var1 FROM number', 'query', 7).name).toBe('Store');
  });

  it('reads the help with each library button', () => {
    render(<Harness level={3} />);
    expect(screen.getByRole('button', { name: 'Insert move right 1' }).getAttribute('aria-description')).toBe(
      'Walks that many tiles in a screen direction. A blocked move stops early; customers never block the way. For example: Move right 1.',
    );
    expect(screen.getByRole('button', { name: 'Insert jump listen' }).getAttribute('aria-description')).toBe(
      'Carries on from a Jump destination instead of the next block. A Jump back to Wait for Orders serves the next one.',
    );
  });

  it('shows the help of the block pointed at or focused, and hides it after', () => {
    render(<Harness level={3} />);
    expect(help()).toBeUndefined();
    const move = screen.getByRole('button', { name: 'Insert move right 1' });
    fireEvent.pointerEnter(move.closest('.command-tile')!);
    expect(help()).toBe(
      'Move Walks that many tiles in a screen direction. A blocked move stops early; customers never block the way.For example: Move right 1',
    );
    fireEvent.pointerLeave(move.closest('.command-tile')!);
    expect(help()).toBeUndefined();
    fireEvent.focus(screen.getByRole('button', { name: 'Insert take up' }));
    expect(help()).toMatch(/^Take Takes a fresh sheet of paper/);
    fireEvent.blur(screen.getByRole('button', { name: 'Insert take up' }));
    expect(help()).toBeUndefined();
  });
});
