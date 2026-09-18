import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

/** Ease a group's Y rotation toward a target angle every frame. */
export function useDampedRotation(ref: RefObject<Group | null>, target: number, rate = 0.16): void {
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += (target - ref.current.rotation.y) * rate;
  });
}
