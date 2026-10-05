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

describe('getting the café back', () => {
  const cafe = () =>
    render(
      <>
        <h1 data-screen-title tabIndex={-1}>
          Shift 04
        </h1>
        <SceneCanvas pixelArt={false}>{null}</SceneCanvas>
      </>,
    );

  it('draws the café again in place after the browser takes back its graphics', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
    cafe();
    const first = screen.getByTestId('scene');
    fireEvent(first, new Event('webglcontextlost'));
    expect(screen.queryByTestId('scene')).toBeNull();
    expect(screen.getByText('The café’s picture went dark.')).toBeTruthy();
    expect(screen.getByText(/Your routines and this service are safe\./)).toBeTruthy();
    expect(screen.queryByText(/Reload/)).toBeNull();
    const retry = screen.getByRole('button', { name: 'Draw the café again' });
    retry.focus();
    fireEvent.click(retry);
    // A new renderer, on a new canvas, and focus back with the screen rather than lost with the button.
    expect(screen.getByTestId('scene')).not.toBe(first);
    expect(document.activeElement?.textContent).toBe('Shift 04');
    // It can go dark and come back more than once.
    fireEvent(screen.getByTestId('scene'), new Event('webglcontextlost'));
    fireEvent.click(screen.getByRole('button', { name: 'Draw the café again' }));
    expect(screen.getByTestId('scene')).toBeTruthy();
  });

  it('offers another try after the scene fails, and keeps the notice if it fails again', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderer.mockImplementation(() => {
      throw new Error('Scene failed');
    });
    cafe();
    expect(screen.getByText('The café is still open.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try the 3D café again' }));
    expect(screen.getByText('The café is still open.')).toBeTruthy();
    renderer.mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Try the 3D café again' }));
    expect(screen.getByTestId('scene')).toBeTruthy();
    expect(screen.queryByText('The café is still open.')).toBeNull();
  });

  it('leaves decorative scenes to their quiet stand-ins, with nothing to press', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as WebGL2RenderingContext);
    render(
      <SceneCanvas pixelArt={false} fallback={<p>Shift notes</p>}>
        {null}
      </SceneCanvas>,
    );
    fireEvent(screen.getByTestId('scene'), new Event('webglcontextlost'));
    expect(screen.getByText('Shift notes')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has nothing to retry on a device without WebGL 2', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    cafe();
    expect(screen.getByText('The café is still open.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
