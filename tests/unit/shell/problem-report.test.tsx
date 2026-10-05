import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { lessons, levels } from '../../../src/data';
import { recordRun, runVersion } from '../../../src/domain';
import type { RobotPrograms } from '../../../src/domain';
import { problemReport } from '../../../src/features/workspace/report';
import { version } from '../../../package.json';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { runCampaignLevel } from '../../helpers/run';

const NOW = new Date(Date.UTC(2026, 9, 5, 9, 30));
const level = levels[3];
const programs: RobotPrograms = { query: lessons[3].solution.replace('ITEM tea', 'ITEM coffee'), prep: '', floor: '' };
const record = recordRun(
  1,
  level,
  programs,
  runCampaignLevel(3, programs.query),
  level.seeds.map((_, i) => i),
);
const report = (input: Partial<Parameters<typeof problemReport>[0]> = {}) =>
  JSON.parse(problemReport({ index: 3, level, programs, record, now: NOW, browser: 'Test browser', ...input }));

describe('a problem report', () => {
  it('holds the game and shift content, the routines, and the last run’s rounds and failure', () => {
    expect(report()).toEqual({
      report: 'Caffeine Protocol problem report',
      game_version: version,
      content_version: runVersion(level),
      created: '2026-10-05T09:30:00.000Z',
      browser: 'Test browser',
      shift: { number: 4, id: level.id, title: level.title },
      routines: programs,
      last_run: {
        mode: 'service',
        rounds: level.seeds.map((seed) => seed.id),
        content_version: runVersion(level),
        passed: false,
        stars: 0,
        routines: 'as above',
        failure: {
          robot: 'Query',
          code: 'ticket-item',
          reason: record.result.first_failure!.reason,
          block: record.result.first_failure!.error_line + 1,
          round: record.result.first_failure!.seed_id,
          guest: record.result.first_failure!.customer_id,
          heard: 'tea',
          context: { ticket: 1, expected: 'tea', actual: 'coffee' },
        },
      },
    });
  });

  it('keeps the routines the last run ran on once they’ve changed, and says when there was no run', () => {
    const edited = { ...programs, query: lessons[3].solution };
    expect(report({ programs: edited }).last_run.routines).toEqual(programs);
    expect(report({ record: undefined }).last_run).toBeNull();
  });
});

describe('saving a problem report from the workspace', () => {
  it('shows the whole report first, then saves exactly that, or doesn’t', async () => {
    let saved: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob;
      return 'blob:report';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      window.location.hash = '/shift/2';
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
      };
      seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Options' }));
      fireEvent.click(screen.getByRole('button', { name: 'Review a problem report' }));
      const preview = screen.getByLabelText('Problem report, as it will be saved');
      const shown = JSON.parse(preview.textContent!);
      expect(shown.shift).toEqual({ number: 2, id: levels[1].id, title: levels[1].title });
      expect(shown.last_run).toBeNull();
      // Not now saves nothing and puts the button back.
      fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
      expect(click).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Review a problem report' }));
      const text = screen.getByLabelText('Problem report, as it will be saved').textContent;
      fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
      expect(click).toHaveBeenCalledOnce();
      const reader = new FileReader();
      reader.readAsText(saved!);
      await new Promise((done) => reader.addEventListener('load', done));
      expect(reader.result).toBe(text);
      expect(screen.getByText(/^Report saved as caffeine-protocol-report-\d{4}-\d\d-\d\d\.json\./)).toBeTruthy();
    } finally {
      click.mockRestore();
      localStorage.clear();
    }
  });
});
