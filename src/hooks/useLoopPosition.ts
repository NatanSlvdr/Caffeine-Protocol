import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';

/** Loop clock shared by street traffic; frozen while paused or reduced motion is on. */
export function useLoopPosition(paused: boolean, reduced: boolean): RefObject<number> {
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!paused && !reduced) elapsed.current += delta;
  });
  return elapsed;
}
