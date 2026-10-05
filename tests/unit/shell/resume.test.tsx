import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { lessons, titleFor } from '../../../src/data';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { incomingRobotPrograms, openingRole } from '../../../src/features/campaign/save/progression';
import { resumePoint } from '../../../src/shell/resume';
import type { ProgressSave } from '../../../src/domain';
import { makeSave, scenesSeen, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

/** Shifts 1–4 served with the routines they opened with, and Shift 5 open. */
function servedThrough(overrides: Partial<ProgressSave> = {}): ProgressSave {
  let save = makeSave({ unlocked: 4, selected: 3 });
  for (let index = 0; index < 4; index++) {
    const programs = incomingRobotPrograms(save, index, lessons);
    save = {
      ...save,
      stars: { ...save.stars, [index]: 3 },
      solutions: { ...save.solutions, [index]: programs.query },
      robotSolutions: { ...save.robotSolutions, [index]: programs },
    };
  }
  return { ...save, ...overrides };
}

describe('where a returning player left off', () => {
  it('is nowhere for a café that hasn’t opened', () => {
    expect(resumePoint(newSave())).toBeNull();
  });

  it('moves on from a shift served and left as served, to the next one waiting', () => {
    expect(resumePoint(servedThrough())).toEqual({ index: 4, scene: undefined, stars: undefined, edited: false });
  });

  it('stays on a served shift whose routine changed since, to finish what was started', () => {
    const save = servedThrough();
    const programs = { ...save.robotSolutions[3], query: save.robotSolutions[3].query + '\nLISTEN' };
    expect(resumePoint({ ...save, robotDrafts: { 3: programs } })).toMatchObject({ index: 3, stars: 3, edited: true });
  });

  it('stays on a shift still to serve, and says whether its routine has been worked on', () => {
    const save = servedThrough({ unlocked: 5, selected: 4 });
    expect(resumePoint(save)).toMatchObject({ index: 4, edited: false });
    const programs = incomingRobotPrograms(save, 4, lessons);
    expect(
      resumePoint({ ...save, robotDrafts: { 4: { ...programs, query: programs.query + '\nLISTEN' } } }),
    ).toMatchObject({
      index: 4,
      edited: true,
    });
  });

  it('points at a scene that plays before the next shift', () => {
    const story = { ...scenesSeen };
    delete story[1];
    expect(resumePoint(makeSave({ unlocked: 1, selected: 0, stars: { 0: 0 }, story }))).toMatchObject({
      index: 1,
      scene: expect.objectContaining({ id: 'the-scrapyard' }),
    });
  });
});

describe('the front door for a returning player', () => {
  it('shows the shift, its goal and where it stands, and opens it', () => {
    seedLocalStorage(servedThrough());
    render(<App />);
    const docket = within(screen.getByRole('region', { name: `Shift 05 · ${titleFor(4)}` }));
    expect(docket.getByText(narrativeFor(4).objective)).toBeTruthy();
    expect(docket.getByText('Ready to start.')).toBeTruthy();
    // The welcome is for a new café; the shift list is still a click away.
    expect(screen.queryByText(/A little café, a secondhand robot/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose a shift' })).toBeTruthy();
    const resume = screen.getByRole('button', { name: 'Continue Shift 05' });
    expect(resume.getAttribute('aria-describedby')).toBe('front-resume-standing');
    fireEvent.click(resume);
    expect(window.location.hash).toBe('#/shift/5');
  });

  it('says how a served shift went and that its routine changed since', () => {
    const save = servedThrough();
    const programs = { ...save.robotSolutions[3], query: save.robotSolutions[3].query + '\nLISTEN' };
    seedLocalStorage({ ...save, robotDrafts: { 3: programs } });
    render(<App />);
    expect(screen.getByText('Served with 3 of 3 stars. You’ve changed the routine since.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue Shift 04' })).toBeTruthy();
  });

  it('plays a waiting scene first', () => {
    const story = { ...scenesSeen };
    delete story[1];
    seedLocalStorage(makeSave({ unlocked: 1, selected: 0, stars: { 0: 0 }, story }));
    render(<App />);
    expect(screen.getByText('A scene plays first: The Scrapyard.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the scene' }));
    expect(window.location.hash).toBe('#/scene/the-scrapyard');
  });

  it('keeps the welcome for a new café', () => {
    render(<App />);
    expect(screen.getByText(/A little café, a secondhand robot/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: /^Shift / })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Choose a shift' })).toHaveLength(1);
  });
});

describe('the robot a shift reopens on', () => {
  // Shift 10, where Brew leads: Query's routine came in from the shift before.
  const save = makeSave({ unlocked: 9, selected: 9 });
  const programs = incomingRobotPrograms(save, 9, lessons);
  const working = (changes: Partial<typeof programs>) => ({ ...save, robotDrafts: { 9: { ...programs, ...changes } } });

  it('is the lead robot, unless only another robot’s routine was being worked on', () => {
    expect(openingRole(save, 9, lessons)).toBe('prep');
    expect(openingRole(working({ query: programs.query + '\nLISTEN' }), 9, lessons)).toBe('query');
    expect(
      openingRole(working({ query: programs.query + '\nLISTEN', prep: programs.prep + '\nWAIT 1' }), 9, lessons),
    ).toBe('prep');
    // Porter isn't on the crew yet, so a routine kept for it doesn't count.
    expect(openingRole(working({ floor: 'WAIT 1' }), 9, lessons)).toBe('prep');
  });

  it('opens the workspace on that robot’s tab', () => {
    seedLocalStorage(working({ query: programs.query + '\nLISTEN' }));
    window.location.hash = '/shift/10';
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Query', selected: true })).toBeTruthy();
  });
});
