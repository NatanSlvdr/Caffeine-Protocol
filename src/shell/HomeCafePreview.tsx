import { useEffect, useState } from 'react';
import { Cafe } from '@/components';
import { STREET_APPROACH_SECONDS, decorOf } from '@/domain';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useGame } from '@/state/GameStore';
import { HOME_PREVIEW_LEVEL, homePreviewResult, restoredShift } from './homePreview';

/** Loop a completed service in the landing preview, respecting reduced motion, in the café as far as it's restored. */
export function HomeCafePreview({ reduced, pixelArt }: { reduced: boolean; pixelArt: boolean }) {
  const { save } = useGame();
  const [result] = useState(homePreviewResult);
  const [time, setTime] = useState(-STREET_APPROACH_SECONDS);
  const reduceMotion = useReducedMotion(reduced);
  const duration = result.execution?.[0]?.duration ?? 60;
  const stillTime = result.execution?.[0]?.events.find(
    (event) => event.actor === 'prep' && (event.action === 'BREW' || event.action === 'STEEP'),
  );

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 33) {
        const elapsed = Math.min((now - last) / 1000, 0.1);
        last = now;
        setTime((previous) => {
          const next = previous + elapsed * 5;
          return next >= duration ? -STREET_APPROACH_SECONDS : next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduceMotion]);

  return (
    <Cafe
      level={HOME_PREVIEW_LEVEL}
      restored={restoredShift(save)}
      decor={decorOf(save)}
      result={result}
      time={reduceMotion && stillTime ? (stillTime.start + stillTime.end) / 2 : time}
      reduced={reduceMotion}
      pixelArt={pixelArt}
      moving={!reduceMotion}
      showStatusBubbles={false}
      zoomScale={0.92}
      cameraAngleDegrees={7}
    />
  );
}
