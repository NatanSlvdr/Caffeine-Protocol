import { ArrowRight, Check, CheckCheck, LockKeyhole } from 'lucide-react';
import { levels, titleFor } from '@/data';
import { Cafe } from '@/components';
import { Button } from '@/shared/ui/Button';
import { go } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';

/** Shift grid plus the selected-shift preview. */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();
  return (
    <main className="campaign-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE SERVICE MANUAL / THREE ROBOTS</div>
          <h1>One shift at a time.</h1>
          <p>A new routine. A familiar face. A little more possibility.</p>
        </div>
        <span className="progress-pill">
          <CheckCheck size={18} />
          {progress.done} / {progress.total} complete
        </span>
      </div>
      <div className="campaign-layout">
        <div className="shift-grid">
          {levels.map((l, i) => (
            <button
              key={l.id}
              disabled={i > save.unlocked}
              className={`shift-card ${save.selected === i ? 'selected' : ''} ${save.stars[i] !== undefined ? 'complete' : ''}`}
              onClick={() => select(i)}
              aria-label={`Shift ${i + 1}: ${titleFor(i)}${i > save.unlocked ? ', locked' : ''}`}
            >
              <span className="card-number">
                {pad2(i + 1)}{' '}
                {i > save.unlocked ? (
                  <LockKeyhole size={13} />
                ) : save.stars[i] !== undefined ? (
                  <Check size={14} />
                ) : (
                  <span className="tiny-dot" />
                )}
              </span>
              <strong>{titleFor(i)}</strong>
              <span className="card-bottom">
                {i < 2
                  ? 'OBSERVATION'
                  : i < 14
                    ? 'QUERY / INTAKE'
                    : i < 22
                      ? 'BREW / KITCHEN'
                      : i < 30
                        ? 'PORTER / FLOOR'
                        : 'ALL THREE ROBOTS'}
                <span>{i < 2 ? (save.stars[i] !== undefined ? '✓' : '—') : starRow(save.stars[i] ?? 0)}</span>
              </span>
            </button>
          ))}
        </div>
        <aside className="campaign-preview">
          <div className="preview-world">
            <Cafe
              level={save.selected + 1}
              evening={save.selected > 10}
              reduced={save.settings.reduced_motion}
              pixelArt={save.settings.pixel_art}
            />
          </div>
          <div className="preview-copy">
            <span className="eyebrow">SHIFT {pad2(save.selected + 1)}</span>
            <h2>{titleFor(save.selected)}</h2>
            <p>{levels[save.selected].summary}</p>
            <div className="preview-metrics">
              <span>{levels[save.selected].active_tables} tables</span>
              <span>{levels[save.selected].seeds.length} test shifts</span>
            </div>
            <Button variant="primary" onClick={() => launch(save.selected)}>
              Start shift <ArrowRight size={17} />
            </Button>
            {save.complete && (
              <Button variant="text-link" onClick={() => go('/ending')}>
                Revisit closing time
              </Button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
