import { Component } from 'react';
import type { ReactNode } from 'react';

export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
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
