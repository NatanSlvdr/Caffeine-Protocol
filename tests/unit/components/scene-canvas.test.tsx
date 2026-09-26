import { useEffect, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneCanvas } from '../../../src/components/three/SceneCanvas';

const renderer = vi.hoisted(() => vi.fn());

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated }: { onCreated: (state: { gl: { domElement: HTMLCanvasElement } }) => void }) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      if (canvas.current) onCreated({ gl: { domElement: canvas.current } });
    }, [onCreated]);
    renderer();
    return <canvas ref={canvas} data-testid="scene" />;
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  renderer.mockReset();
});

describe('scene fallback', () => {
  it('retains the default notice and supports an intentionally empty fallback', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { rerender, container } = render(<SceneCanvas pixelArt={false}>{null}</SceneCanvas>);
    expect(screen.getByText('The café is still open.')).toBeTruthy();
    rerender(
      <SceneCanvas pixelArt={false} fallback={null}>
        {null}
      </SceneCanvas>,
    );
    expect(container.childElementCount).toBe(0);
    expect(renderer).not.toHaveBeenCalled();
  });

  it('does not try to create a renderer on WebGL 1-only devices', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    getContext.mockImplementation((kind) => (kind === 'webgl2' ? null : ({} as WebGLRenderingContext)));
    // A WebGL 2 failure must be enough to choose the fallback, without probing other contexts.
    render(
      <SceneCanvas pixelArt={false} fallback={<p>Shift notes</p>}>
        {null}
      </SceneCanvas>,
    );
    expect(screen.getByText('Shift notes')).toBeTruthy();
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(renderer).not.toHaveBeenCalled();
  });

  it('uses the custom fallback when the graphics context is lost', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
    render(
      <SceneCanvas pixelArt={false} fallback={<p>Shift notes</p>}>
        {null}
      </SceneCanvas>,
    );
    fireEvent(screen.getByTestId('scene'), new Event('webglcontextlost'));
    expect(screen.queryByTestId('scene')).toBeNull();
    expect(screen.getByText('Shift notes')).toBeTruthy();
  });

  it('uses the custom fallback for scene errors', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderer.mockImplementation(() => {
      throw new Error('Scene failed');
    });
    render(
      <SceneCanvas pixelArt={false} fallback={<p>Shift notes</p>}>
        {null}
      </SceneCanvas>,
    );
    expect(screen.getByText('Shift notes')).toBeTruthy();
    expect(screen.queryByText('The café is still open.')).toBeNull();
  });
});
