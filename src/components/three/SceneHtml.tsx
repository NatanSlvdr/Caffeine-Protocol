import { Html } from '@react-three/drei';

/** Overlay bubbles share one Html configuration; only position, stacking, and style vary. */
export function SceneHtml({
  position,
  zIndexRange,
  style,
  children,
}: {
  position: [number, number, number];
  zIndexRange: [number, number];
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <Html transform={false} distanceFactor={1 / 70} position={position} center zIndexRange={zIndexRange} style={style}>
      {children}
    </Html>
  );
}
