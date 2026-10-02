import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Settings2, Star } from 'lucide-react';
import { openSettings } from '@/shared/lib/navigation';
import { useProgress } from '@/state/GameStore';

/** The front-of-house top bar: a way back, the star tally, and settings. Extra actions sit before the tally. */
export function ShellBar({
  label,
  back,
  onBack,
  children,
}: {
  label: string;
  back: string;
  onBack: () => void;
  children?: ReactNode;
}) {
  const progress = useProgress();
  // Esc goes back a screen, as it leaves a shift. Open windows, menus and story scenes claim their own Escape first.
  const goBack = useRef(onBack);
  goBack.current = onBack;
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || e.defaultPrevented || document.querySelector('dialog[open]')) return;
      goBack.current();
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, []);
  return (
    <nav className="shell-bar" aria-label={label}>
      <button className="shell-back" aria-keyshortcuts="Escape" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> {back}
      </button>
      <div className="shell-bar-actions">
        {children}
        <span className="shell-stars" role="img" aria-label={`${progress.stars} of ${progress.max} stars`}>
          <Star size={14} fill="currentColor" aria-hidden="true" /> {progress.stars}
          <small> / {progress.max}</small>
        </span>
        <button
          className="shell-icon"
          aria-label="Settings"
          aria-haspopup="dialog"
          title="Settings"
          onClick={openSettings}
        >
          <Settings2 size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
