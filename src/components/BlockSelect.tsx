import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ModelThumbnail } from './ModelThumbnail';
import { DIRECTIONS, directionLabel, normalizeDirection, type Direction } from '../domain/directions';

export interface BlockOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** A keyboard-accessible operand menu, styled as an inset piece of its parent block. */
export function BlockSelect({ value, options, label, disabled, onChange }: {
  value: string; options: BlockOption[]; label: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(0);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect(), theme = getComputedStyle(button);
      const below = window.innerHeight - rect.bottom - 16, above = rect.top - 16;
      const height = Math.min(240, Math.max(0, Math.max(below, above)));
      const actualHeight = Math.min(menu.current?.scrollHeight ?? 240, height);
      const width = Math.min(Math.max(rect.width, menu.current?.offsetWidth ?? 0), window.innerWidth - 16);
      setMenuStyle({
        position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: below >= actualHeight || below >= above ? rect.bottom + 7 : Math.max(8, rect.top - actualHeight - 7),
        minWidth: Math.min(rect.width, window.innerWidth - 16), maxWidth: window.innerWidth - 16, maxHeight: height,
        '--tile': theme.getPropertyValue('--tile'), '--edge': theme.getPropertyValue('--edge'), '--tile-ink': theme.getPropertyValue('--tile-ink'),
      } as CSSProperties);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const choose = (next: string) => { onChange(next); setOpen(false); trigger.current?.focus(); };
  const selected = options.find(o => o.value === value);
  return <div className="block-select" ref={root} onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" disabled={disabled}
      onClick={() => { setFocused(Math.max(0, options.findIndex(o => o.value === value))); setOpen(!open); }}
      onKeyDown={e => {
        if (!options.length) return;
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); setOpen(true);
          setFocused(i => e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(options[focused].value); }
      }} aria-activedescendant={open ? `${id}-${focused}` : undefined}>
      {selected?.icon}{selected?.label ?? value}<ChevronDown size={12}/>
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="operand-menu operand-menu-floating" style={menuStyle}>{options.map((o, i) => <button type="button" tabIndex={-1} id={`${id}-${i}`} key={o.value} role="option" aria-selected={o.value === value} className={i === focused ? 'focused' : ''} onPointerEnter={() => setFocused(i)} onPointerDown={e => e.preventDefault()} onClick={() => choose(o.value)}>{o.icon}{o.label}</button>)}</div>, document.body)}
  </div>;
}

const directionGrid: (Direction | null)[] = ['UP_LEFT', 'UP', 'UP_RIGHT', 'LEFT', null, 'RIGHT', 'DOWN_LEFT', 'DOWN', 'DOWN_RIGHT'];

/** Expand the same grid around its own center, without changing the tile's layout. */
export function DirectionSelect({ value, label, disabled, onChange }: {
  value: string; label: string; disabled: boolean; onChange: (value: Direction) => void;
}) {
  const selected = normalizeDirection(value) ?? 'RIGHT';
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [focused, setFocused] = useState(Math.max(0, DIRECTIONS.indexOf(selected)));
  const open = phase === 'open', expanded = phase !== 'closed';
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const close = () => setPhase(current => current === 'open' ? 'closing' : current);
  useLayoutEffect(() => {
    if (!expanded || !trigger.current) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect(), theme = getComputedStyle(button);
      setMenuStyle({
        position: 'fixed', left: Math.max(8, Math.min(rect.left - rect.width * 2, window.innerWidth - rect.width * 5 - 8)), top: Math.max(8, Math.min(rect.top - rect.height * 2, window.innerHeight - rect.height * 5 - 8)), width: rect.width * 5, height: rect.height * 5,
        '--tile': theme.getPropertyValue('--tile'), '--edge': theme.getPropertyValue('--edge'), '--tile-ink': theme.getPropertyValue('--tile-ink'),
      } as CSSProperties);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [expanded]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (phase !== 'closing') return;
    // Also finish closing when reduced motion disables CSS animations.
    const timer = window.setTimeout(() => setPhase('closed'), 180);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => { if (disabled) setPhase('closed'); }, [disabled]);
  const choose = (next: Direction) => { onChange(next); close(); trigger.current?.focus(); };
  const cells = (interactive: boolean) => directionGrid.map((direction, i) => direction
    ? interactive ? <button type="button" tabIndex={-1} id={`${id}-${direction}`} key={direction} role="option" aria-label={directionLabel(direction)} aria-selected={direction === selected}
        className={(direction === selected ? 'chosen ' : '') + (DIRECTIONS[focused] === direction ? 'focused' : '')}
        onPointerEnter={() => setFocused(DIRECTIONS.indexOf(direction))} onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={() => choose(direction)}/>
      : <span key={direction} className={direction === selected ? 'chosen' : ''}/>
    : <span className="direction-player" key={`center-${i}`}><ModelThumbnail model="robot"/></span>);
  return <div className={'direction-select block-select' + (expanded ? ' is-expanded' : '')} ref={root} onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) close(); }}>
    <button ref={trigger} type="button" className="direction-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" title={directionLabel(selected)} disabled={disabled}
      onClick={() => { setFocused(Math.max(0, DIRECTIONS.indexOf(selected))); if (open) close(); else setPhase('open'); }}
      onKeyDown={e => {
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault(); setPhase('open');
          setFocused(i => (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + DIRECTIONS.length) % DIRECTIONS.length);
        } else if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(DIRECTIONS[focused]); }
      }} aria-activedescendant={open ? `${id}-${DIRECTIONS[focused]}` : undefined}>
      <span className="direction-mini-grid" aria-hidden="true">{cells(false)}</span>
      <span className="sr-only">{directionLabel(selected)}</span>
    </button>
    {expanded && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} aria-hidden={!open} className={'direction-menu direction-' + phase} style={menuStyle}
      onAnimationEnd={() => { if (phase === 'closing') setPhase('closed'); }}>
      <div className="direction-mini-grid">{cells(true)}</div>
    </div>, document.body)}
  </div>;
}
