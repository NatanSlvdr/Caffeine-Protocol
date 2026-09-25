import { useEffect, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChefHat,
  ConciergeBell,
  Coffee,
  LockKeyhole,
  Play,
  ReceiptText,
  Settings2,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { levels, titleFor } from '@/data';
import { narrativeFor, stories } from '@/data/campaign/narrative';
import { Button } from '@/shared/ui/Button';
import { go } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';

type ActState = 'locked' | 'active' | 'done';

interface Act {
  kicker: string;
  title: string;
  tagline: string;
  crew: string;
  icon: LucideIcon;
  tone: string;
  from: number;
  to: number;
}

/** The campaign reads as a staffing story: each act brings a new robot onto the roster. */
const acts: Act[] = [
  {
    kicker: 'Prologue',
    title: 'First days',
    tagline: 'Niko shows you how the café runs.',
    crew: 'Niko',
    icon: Coffee,
    tone: '#c3acf0',
    from: 0,
    to: 2,
  },
  {
    kicker: 'Act I',
    title: 'The front counter',
    tagline: 'Query learns to take orders.',
    crew: 'Query',
    icon: ReceiptText,
    tone: '#9bcef2',
    from: 2,
    to: 14,
  },
  {
    kicker: 'Act II',
    title: 'Behind the counter',
    tagline: 'Brew learns the recipes.',
    crew: 'Brew',
    icon: ChefHat,
    tone: '#f49b83',
    from: 14,
    to: 22,
  },
  {
    kicker: 'Act III',
    title: 'The café floor',
    tagline: 'Porter learns the room.',
    crew: 'Porter',
    icon: ConciergeBell,
    tone: '#91d5b6',
    from: 22,
    to: 30,
  },
  {
    kicker: 'Finale',
    title: 'Together at last',
    tagline: 'The whole crew runs the café.',
    crew: 'The whole crew',
    icon: Store,
    tone: '#f4c95d',
    from: 30,
    to: levels.length,
  },
];

const crewActs = acts.slice(1, 4);
const crewStatus: Record<ActState, string> = {
  locked: 'In the scrapyard',
  active: 'In training',
  done: 'Certified',
};
const actStatus: Record<ActState, string> = { locked: 'Locked', active: 'In progress', done: 'Complete' };

const actFor = (index: number) => acts.find((act) => index >= act.from && index < act.to) ?? acts[0];
const tone = (act: Act) => ({ '--act': act.tone }) as CSSProperties;

/** Shift roster: pick a shift by act, read its ticket, and clock in. */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();
  const reducedMotion = save.settings.reduced_motion;

  const isComplete = (index: number) => save.stars[index] !== undefined;
  const stateOf = (act: Act): ActState => {
    if (act.from > save.unlocked) return 'locked';
    for (let index = act.from; index < act.to; index++) if (!isComplete(index)) return 'active';
    return 'done';
  };

  useEffect(() => {
    document.querySelector('.shift-card.selected')?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  }, []);

  const selected = save.selected;
  const selectedAct = actFor(selected);
  const shift = narrativeFor(selected);
  const SelectedIcon = selectedAct.icon;
  const observation = selected < 2;

  return (
    <main className={`campaign-page ${reducedMotion ? 'still' : ''}`}>
      <nav className="roster-bar" aria-label="Campaign">
        <button className="roster-home" onClick={() => go('/')}>
          <ArrowLeft size={16} /> Caffeine Protocol
        </button>
        <div className="roster-bar-actions">
          {save.complete && (
            <Button className="roster-ending" variant="text-link" onClick={() => go('/ending')}>
              <BookOpen size={15} /> Revisit closing time
            </Button>
          )}
          <span className="roster-stars" aria-label={`${progress.stars} of ${progress.max} stars`}>
            ★ {progress.stars}
            <small> / {progress.max}</small>
          </span>
          <button className="roster-icon" aria-label="Settings" title="Settings" onClick={() => go('/settings')}>
            <Settings2 size={18} />
          </button>
        </div>
      </nav>

      <header className="roster-hero">
        <div className="roster-title">
          <span className="roster-kicker">The shift roster</span>
          <h1>Choose a shift</h1>
          <p>
            Every shift teaches the crew one new routine. Pick up where you left off, or replay a day to chase three
            stars.
          </p>
          <div className="roster-progress" aria-label={`${progress.done} of ${progress.total} shifts complete`}>
            <div className="roster-progress-track">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <span>
              <strong>{progress.done}</strong> / {progress.total} shifts worked
            </span>
          </div>
        </div>
        <ul className="crew-strip" aria-label="Crew">
          {crewActs.map((act) => {
            const state = stateOf(act);
            const Icon = act.icon;
            return (
              <li key={act.crew} className={`crew-badge ${state}`} style={tone(act)}>
                <span className="crew-avatar">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className="crew-copy">
                  <strong>{act.crew}</strong>
                  <span>
                    <i className="status-light" aria-hidden="true" />
                    {crewStatus[state]}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </header>

      <div className="roster-layout">
        <div className="roster-acts">
          {acts.map((act, actIndex) => {
            const state = stateOf(act);
            const Icon = act.icon;
            const total = act.to - act.from;
            let done = 0;
            for (let index = act.from; index < act.to; index++) if (isComplete(index)) done++;
            return (
              <section
                key={act.kicker}
                className={`roster-act ${state}`}
                style={tone(act)}
                aria-labelledby={`act-${actIndex}`}
              >
                <header className="act-head">
                  <span className="act-avatar" aria-hidden="true">
                    <Icon size={22} strokeWidth={2.1} />
                  </span>
                  <div className="act-copy">
                    <span className="act-kicker">
                      {act.kicker} · Shifts {pad2(act.from + 1)}–{pad2(act.to)}
                    </span>
                    <h2 id={`act-${actIndex}`}>{act.title}</h2>
                    <p>{act.tagline}</p>
                  </div>
                  <div className="act-meter">
                    <span className={`act-chip ${state}`}>
                      {state === 'locked' && <LockKeyhole size={11} />}
                      {state === 'done' && <Check size={12} strokeWidth={3} />}
                      {actStatus[state]}
                    </span>
                    <span className="act-count">
                      {done} / {total}
                    </span>
                    <span className="act-bar">
                      <span style={{ width: `${(done / total) * 100}%` }} />
                    </span>
                  </div>
                </header>

                <div className="shift-grid">
                  {levels.slice(act.from, act.to).map((level, offset) => {
                    const index = act.from + offset;
                    const locked = index > save.unlocked;
                    const complete = isComplete(index);
                    const next = !locked && !complete && index === save.unlocked;
                    const stars = save.stars[index] ?? 0;
                    const classes = [
                      'shift-card',
                      locked && 'locked',
                      complete && 'complete',
                      next && 'next',
                      selected === index && 'selected',
                    ];
                    return (
                      <button
                        key={level.id}
                        disabled={locked}
                        className={classes.filter(Boolean).join(' ')}
                        onClick={() => select(index)}
                        onDoubleClick={() => launch(index)}
                        aria-label={`Shift ${index + 1}: ${titleFor(index)}${locked ? ', locked' : ''}`}
                        aria-pressed={!locked && selected === index}
                      >
                        <span className="shift-top">
                          <span className="shift-number">{pad2(index + 1)}</span>
                          {stories[index] && !locked && (
                            <BookOpen className="shift-story" size={13} aria-hidden="true" />
                          )}
                          <span className="shift-mark" aria-hidden="true">
                            {locked ? (
                              <LockKeyhole size={13} />
                            ) : complete ? (
                              <Check size={13} strokeWidth={3} />
                            ) : (
                              <i className="status-light" />
                            )}
                          </span>
                        </span>
                        <strong className="shift-title">{titleFor(index)}</strong>
                        <span className="shift-foot" aria-hidden="true">
                          {locked ? (
                            'Locked'
                          ) : index < 2 ? (
                            complete ? (
                              'Observed'
                            ) : (
                              'Watch'
                            )
                          ) : complete ? (
                            <span className="shift-stars">{starRow(stars)}</span>
                          ) : next ? (
                            'Up next'
                          ) : (
                            'Ready'
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="shift-ticket" style={tone(selectedAct)} aria-label="Selected shift">
          <div className="ticket-band">
            <span>
              Shift <strong>{pad2(selected + 1)}</strong> / {levels.length}
            </span>
            <span className={`ticket-state ${isComplete(selected) ? 'done' : 'open'}`}>
              <i className="status-light" aria-hidden="true" />
              {isComplete(selected) ? 'Worked' : selected === save.unlocked ? 'Up next' : 'Open'}
            </span>
          </div>
          <div className="ticket-body">
            <span className="ticket-act">
              <span className="ticket-act-icon" aria-hidden="true">
                <SelectedIcon size={14} strokeWidth={2.4} />
              </span>
              {selectedAct.kicker} · {selectedAct.title}
            </span>
            <h2>{titleFor(selected)}</h2>
            <p className="ticket-story">{shift.story}</p>
            <div className="ticket-rule" aria-hidden="true" />
            <span className="ticket-label">Today&apos;s goal</span>
            <p className="ticket-goal">{shift.objective}</p>
            <div className="ticket-tags">
              <span className="ticket-tag">
                <SelectedIcon size={13} /> {observation ? 'Niko on duty' : `${selectedAct.crew} on duty`}
              </span>
              {stories[selected] && (
                <span className="ticket-tag">
                  <BookOpen size={13} /> Story scene
                </span>
              )}
            </div>
            <div className="ticket-score">
              {observation ? (
                <span className="ticket-observe">Observation shift · no stars</span>
              ) : (
                <>
                  <span className="ticket-label">Best</span>
                  <span className="ticket-stars" aria-label={`${save.stars[selected] ?? 0} of 3 stars`}>
                    {starRow(save.stars[selected] ?? 0)}
                  </span>
                </>
              )}
            </div>
            <Button className="ticket-start" variant="primary" onClick={() => launch(selected)}>
              <Play size={15} fill="currentColor" /> Start shift
              <ArrowRight size={17} />
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
