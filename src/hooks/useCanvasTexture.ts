import { useEffect, useMemo } from 'react';
import type { DependencyList } from 'react';
import type { CanvasTexture } from 'three';

/** Memoized canvas texture with disposal; shared by floor, labels, and thumbnails. */
export function useCanvasTexture(create: () => CanvasTexture, deps: DependencyList): CanvasTexture {
  const texture = useMemo(create, deps);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
