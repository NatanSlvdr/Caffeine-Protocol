import { useEffect } from 'react';
import { addAfterEffect, useThree } from '@react-three/fiber';

/** Takes the scene as next drawn, as a PNG: nothing if the picture can't be read back. */
export type TakeSnapshot = () => Promise<Blob | null>;

/** A frame comes many times a second; one that hasn't come by now won't (the tab is hidden, the picture went dark). */
const PATIENCE = 2000;

/**
 * Lends the canvas a way to photograph itself. The picture is read straight after a frame is drawn, pixel pass and
 * all, while the browser still holds it: read any later and a canvas that doesn't keep its frames comes back blank.
 */
export function Snapshot({ take }: { take: React.RefObject<TakeSnapshot | null> }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    take.current = () =>
      new Promise((resolve) => {
        const late = setTimeout(() => {
          stop();
          resolve(null);
        }, PATIENCE);
        const stop = addAfterEffect(() => {
          stop();
          clearTimeout(late);
          gl.domElement.toBlob(resolve, 'image/png');
        });
      });
    return () => {
      take.current = null;
    };
  }, [gl, take]);
  return null;
}
