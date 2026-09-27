import type { ReactNode } from 'react';
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
  return (
    <nav className="shell-bar" aria-label={label}>
      <button className="shell-back" onClick={onBack}>
        <ArrowLeft size={16} /> {back}
      </button>
      <div className="shell-bar-actions">
        {children}
        <span className="shell-stars" role="img" aria-label={`${progress.stars} of ${progress.max} stars`}>
          <Star size={14} fill="currentColor" aria-hidden="true" /> {progress.stars}
          <small> / {progress.max}</small>
        </span>
        <button className="shell-icon" aria-label="Settings" title="Settings" onClick={openSettings}>
          <Settings2 size={18} />
        </button>
      </div>
    </nav>
  );
}
