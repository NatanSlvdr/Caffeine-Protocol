import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { CAMPAIGN_LENGTH, levels, titleFor } from '../data';
import { landmarkPoint, trailLandmarks, trailPoint, TRAIL_HEIGHT, TRAIL_WIDTH, TRAIL_STOP_HEIGHT, TRAIL_UNITS } from '../domain/campaignTrail';
import { TrailScene } from './TrailScene';
import { shiftBriefs } from '../data/shiftBriefs';
import type { ProgressSave } from '../domain/types';
import { ModelThumbnail } from './ModelThumbnail';

export function CampaignTrail({ save, onSelect, onLaunch, onEnding }: {
  save: ProgressSave; onSelect: (index: number) => void; onLaunch: (index: number) => void; onEnding: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSelection = useRef(save.selected);
  const [view, setView] = useState({ width: TRAIL_WIDTH, height: 600, scrollTop: 0 });
  const [graphics, setGraphics] = useState(() => typeof WebGLRenderingContext !== 'undefined');
  const unavailable = useCallback(() => setGraphics(false), []);
  const scale = view.width / TRAIL_WIDTH;
  // Size the map to its panel; resizing preserves the point under the center of the viewport.
  useLayoutEffect(() => {
    const region = scrollRef.current;
    if (!region) return;
    let previousWidth = 0, previousHeight = 0;
    const resize = () => {
      const width = region.clientWidth || TRAIL_WIDTH, height = region.clientHeight || 600;
      const center = previousWidth ? (region.scrollTop + previousHeight / 2) / (previousWidth / TRAIL_WIDTH) : trailPoint(initialSelection.current).y;
      const nextScale = width / TRAIL_WIDTH;
      const scrollTop = Math.max(0, Math.min(TRAIL_HEIGHT * nextScale - height, center * nextScale - height / 2));
      // Update the scroll extent before assigning scrollTop so the browser cannot clamp to the old size.
      const map = region.firstElementChild;
      if (map instanceof HTMLElement) map.style.height = `${TRAIL_HEIGHT * nextScale}px`;
      region.scrollTop = scrollTop;
      previousWidth = width; previousHeight = height;
      setView({ width, height, scrollTop });
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);
  const robot = save.selected >= 22 ? 'porter' : save.selected >= 14 ? 'brew' : 'robot';
  return <main className="campaign-page journey-page">
    <div className="page-heading"><h1>Your café journey.</h1><span className="journey-progress">{Object.keys(save.stars).length}<span> / {CAMPAIGN_LENGTH} shifts</span></span></div>
    <div className="journey-layout">
      <section className={`trail-panel ${graphics ? 'has-3d' : 'flat-trail'}`} aria-label="Shift trail">
        {graphics && <TrailScene view={view} save={save} onUnavailable={unavailable}/>}
        <div className="trail-scroll" ref={scrollRef} onScroll={event => { const scrollTop = event.currentTarget.scrollTop; setView(previous => ({ ...previous, scrollTop })); }} tabIndex={0} role="region" aria-label="Scrollable café trail"><div className="trail-map" style={{ height: TRAIL_HEIGHT * scale }}>
          {!graphics && <svg className="trail-road" viewBox={`0 0 ${TRAIL_WIDTH} ${TRAIL_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={levels.map((_, i) => { const p = trailPoint(i); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#d8c39c" strokeWidth="25" strokeLinejoin="round"/></svg>}
          <span className="trail-start">A FRESH START</span><span className="trail-finish">A PLACE OF YOUR OWN</span>
          {trailLandmarks.map(landmark => {
            const unlocked = save.unlocked >= landmark.level - 1, point = landmarkPoint(landmark);
            return <div key={landmark.level} className={`trail-landmark ${unlocked ? 'is-open' : 'is-locked'}`} style={{ left: `${point.x / TRAIL_WIDTH * 100}%`, top: (point.y + 54) * scale }} aria-label={`${landmark.name}, ${unlocked ? 'unlocked' : `unlocks at shift ${landmark.level}`}`}>
              <strong>{landmark.name}</strong><small>{unlocked ? <><Check size={10}/> Unlocked</> : <><LockKeyhole size={9}/> Shift {landmark.level}</>}</small>
            </div>;
          })}
          {levels.map((level, index) => {
            const point = trailPoint(index), locked = index > save.unlocked, complete = save.stars[index] !== undefined;
            return <button key={level.id} disabled={locked} aria-pressed={save.selected === index} aria-label={`Shift ${index + 1}: ${titleFor(index)}${locked ? ', locked' : complete ? ', complete' : ', available'}`} title={titleFor(index)} onClick={() => onSelect(index)} className={`trail-stop ${complete ? 'is-complete' : ''} ${save.selected === index ? 'is-selected' : ''}`} style={{ left: `${point.x / TRAIL_WIDTH * 100}%`, top: (point.y - TRAIL_STOP_HEIGHT * TRAIL_UNITS * .6) * scale }}>
              <span className="trail-dot">{complete ? <Check size={15}/> : index + 1}</span>{complete && level.programming_enabled && <span className="trail-stars" aria-label={`${save.stars[index]} stars`}>{'★'.repeat(save.stars[index])}</span>}
            </button>;
          })}
        </div></div>
        <div className="trail-legend" aria-label="Trail key"><span><i className="done"/> Complete</span><span><i className="available"/> Open</span><span><i/> Locked</span></div>
      </section>
      <aside className="journey-preview" aria-label="Selected shift">
        <div className="preview-robot"><ModelThumbnail model={robot}/></div>
        <div className="preview-copy"><span className="eyebrow">SHIFT {String(save.selected + 1).padStart(2, '0')}</span><h2>{titleFor(save.selected)}</h2><p>{shiftBriefs[save.selected].story}</p><button className="primary" onClick={() => onLaunch(save.selected)}>{save.stars[save.selected] !== undefined ? 'Replay shift' : 'Start shift'} <ArrowRight size={17}/></button>{save.complete && <button className="text-link" onClick={onEnding}>Revisit closing time</button>}</div>
      </aside>
    </div>
  </main>;
}
