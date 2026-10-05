import { Component } from 'react';
import type { ReactNode } from 'react';

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
    return this.state.failed ? (
      <div className="webgl-fallback">
        <strong>The café is still open.</strong>
        <p>
          3D graphics are unavailable on this device. You can still program Query, run service, and follow each
          customer’s order.
        </p>
        {this.props.onRetry && (
          <button className="webgl-retry" onClick={this.props.onRetry}>
            Try the 3D café again
          </button>
        )}
      </div>
    ) : (
      this.props.children
    );
  }
}
