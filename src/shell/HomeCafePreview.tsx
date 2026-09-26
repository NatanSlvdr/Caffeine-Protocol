import { useEffect, useState } from 'react';
import { Cafe } from '@/components';
import { STREET_APPROACH_SECONDS } from '@/domain';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { HOME_PREVIEW_LEVEL, homePreviewResult } from './homePreview';

/** Loop a completed service in the landing preview, respecting reduced motion. */
export function HomeCafePreview({ reduced, pixelArt }: { reduced: boolean; pixelArt: boolean }) {
  const [result] = useState(homePreviewResult);
  const [time, setTime] = useState(-STREET_APPROACH_SECONDS);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = reduced || prefersReducedMotion;
  const duration = result.execution?.[0]?.duration ?? 60;
  const stillTime = result.execution?.[0]?.events.find(
    (event) => event.actor === 'prep' && /^(BREW|STEEP)$/.test(event.command),
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
