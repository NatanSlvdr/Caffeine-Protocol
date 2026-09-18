import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DIRECTIONS, directionLabel, normalizeDirection, type Direction } from '@/domain';
import { ModelThumbnail } from '../thumbnails/ModelThumbnail';
import { useFloatingMenu } from './useFloatingMenu';

const directionGrid: (Direction | null)[] = ['UP_LEFT', 'UP', 'UP_RIGHT', 'LEFT', null, 'RIGHT', 'DOWN_LEFT', 'DOWN', 'DOWN_RIGHT'];

/** Expand the same grid around its own center, without changing the tile's layout. */
export function DirectionSelect({
  value,
  label,
  disabled,
  onChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  onChange: (value: Direction) => void;
}) {
  const selected = normalizeDirection(value);
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [focused, setFocused] = useState(Math.max(0, DIRECTIONS.indexOf(selected ?? 'RIGHT')));
  const open = phase === 'open',
    expanded = phase !== 'closed';
  const trigger = useRef<HTMLButtonElement>(null),
    id = useId();
  const close = () => setPhase((current) => (current === 'open' ? 'closing' : current));
  const { root, menu, menuStyle, setMenuStyle } = useFloatingMenu({ active: open, onOutside: close });
  useLayoutEffect(() => {
    if (!expanded || !trigger.current) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect(),
        theme = getComputedStyle(button);
      setMenuStyle({
        position: 'fixed',
        left: Math.max(8, Math.min(rect.left - rect.width * 2, window.innerWidth - rect.width * 5 - 8)),
        top: Math.max(8, Math.min(rect.top - rect.height * 2, window.innerHeight - rect.height * 5 - 8)),
        width: rect.width * 5,
        height: rect.height * 5,
        '--tile': theme.getPropertyValue('--tile'),
        '--edge': theme.getPropertyValue('--edge'),
        '--tile-ink': theme.getPropertyValue('--tile-ink'),
      } as CSSProperties);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [expanded, menu, setMenuStyle]);
  useEffect(() => {
    if (phase !== 'closing') return;
    // Also finish closing when reduced motion disables CSS animations.
    const timer = window.setTimeout(() => setPhase('closed'), 180);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (disabled) setPhase('closed');
  }, [disabled]);
  const choose = (next: Direction) => {
    onChange(next);
    close();
    trigger.current?.focus();
  };
  const cells = (interactive: boolean) =>
    directionGrid.map((direction, i) =>
      direction ? (
        interactive ? (
          <button
            type="button"
            tabIndex={-1}
            id={`${id}-${direction}`}
            key={direction}
            role="option"
            aria-label={directionLabel(direction)}
            aria-selected={direction === selected}
            className={(direction === selected ? 'chosen ' : '') + (DIRECTIONS[focused] === direction ? 'focused' : '')}
            onPointerEnter={() => setFocused(DIRECTIONS.indexOf(direction))}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => choose(direction)}
          />
        ) : (
          <span key={direction} className={direction === selected ? 'chosen' : ''} />
        )
      ) : (
        <span className="direction-player" key={`center-${i}`}>
          <ModelThumbnail model="robot" />
        </span>
      ),
    );
  return (
    <div
      className={'direction-select block-select' + (expanded ? ' is-expanded' : '')}
      ref={root}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="direction-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="listbox"
        title={selected ? directionLabel(selected) : 'Choose direction'}
        disabled={disabled}
        onClick={() => {
          setFocused(Math.max(0, DIRECTIONS.indexOf(selected ?? 'RIGHT')));
          if (open) close();
          else setPhase('open');
        }}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
            e.preventDefault();
            setPhase('open');
            setFocused((i) => (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + DIRECTIONS.length) % DIRECTIONS.length);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else if (open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            choose(DIRECTIONS[focused]);
          }
        }}
        aria-activedescendant={open ? `${id}-${DIRECTIONS[focused]}` : undefined}
      >
        <span className="direction-mini-grid" aria-hidden="true">
          {cells(false)}
        </span>
        <span className="sr-only">{selected ? directionLabel(selected) : 'Choose direction'}</span>
      </button>
      {expanded &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="listbox"
            aria-label={label}
            aria-hidden={!open}
            className={'direction-menu direction-' + phase}
            style={menuStyle}
            onAnimationEnd={() => {
              if (phase === 'closing') setPhase('closed');
            }}
          >
            <div className="direction-mini-grid">{cells(true)}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
