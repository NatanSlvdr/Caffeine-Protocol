import type { ExecutionEvent } from '@/domain';
import type { Vec3 } from './primitives';

/** Brewing and steeping are the hot steps; grinding makes no steam. */
const HOT_STEPS = new Set(['BREW', 'STEEP']);

/** Whether the coffee machine is brewing or steeping at this moment of the replay. */
export function machineSteaming(events: readonly Pick<ExecutionEvent, 'action' | 'start' | 'end'>[], local: number) {
  return events.some(
    (event) => !!event.action && HOT_STEPS.has(event.action) && event.start <= local && local < event.end,
  );
}

const WISPS = 3;
/** Seconds of replay time for one wisp to rise and fade. */
const RISE = 1.6;

/** A few soft wisps rising and fading above something hot, driven by replay time so they pause with it. */
export function Steam({
  at,
  phase,
  reduced,
  height = 0.5,
}: {
  at: Vec3;
  phase: number;
  reduced: boolean;
  height?: number;
}) {
  if (reduced) return null;
  return (
    <group position={at}>
      {Array.from({ length: WISPS }, (_, i) => {
        const t = (((phase / RISE + i / WISPS) % 1) + 1) % 1;
        return (
          <mesh
            key={i}
            position={[Math.sin(t * 5 + i * 2) * 0.04, t * height, Math.cos(t * 4 + i) * 0.02]}
            scale={0.05 + t * 0.07}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45 * Math.sin(Math.PI * t)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
