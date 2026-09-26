import { Component } from 'react';
import type { ReactNode } from 'react';

/** Keep scene failures local, with an optional replacement for decorative scenes. */
export class SceneBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
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
      </div>
    ) : (
      this.props.children
    );
  }
}
