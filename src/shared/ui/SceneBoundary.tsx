import { Component } from 'react';
import type { ReactNode } from 'react';
import { useWords } from '@/shared/language';
import { STAGE_WORDS } from './stageWords';

/** The notice in place of a café that can't be drawn here, with a way to try again where there is one. */
export function NoGraphics({ onRetry }: { onRetry?: () => void }) {
  const say = useWords(STAGE_WORDS);
  return (
    <div className="webgl-fallback">
      <strong>{say.open}</strong>
      <p>{say.unavailable}</p>
      {onRetry && (
        <button className="webgl-retry" onClick={onRetry}>
          {say.retry}
        </button>
      )}
    </div>
  );
}

/**
 * Keep scene failures local, with an optional replacement for decorative scenes. Given `onRetry`, the notice offers
 * to try the scene again; the caller remounts the boundary (a new key) to clear the failure.
 */
export class SceneBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onRetry?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed && this.props.fallback !== undefined) return this.props.fallback;
    return this.state.failed ? <NoGraphics onRetry={this.props.onRetry} /> : this.props.children;
  }
}
