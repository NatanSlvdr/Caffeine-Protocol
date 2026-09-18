import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { Mesh, Plane, Vector3 } from 'three';
import { STREET_BOUNDS } from '@/domain';

const streetPlanes = [new Plane(new Vector3(0, 0, 1), -STREET_BOUNDS.minZ), new Plane(new Vector3(0, 0, -1), STREET_BOUNDS.maxZ)];

/** Clip geometry and shadows at the ends of the street, without scaling the models. */
export function StreetClip({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material.clippingPlanes === streetPlanes) continue;
        material.clippingPlanes = streetPlanes;
        material.clipShadows = true;
        material.needsUpdate = true;
      }
    });
  }, [children]);
  return <group ref={ref}>{children}</group>;
}

