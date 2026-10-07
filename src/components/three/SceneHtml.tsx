import { Html } from '@react-three/drei';
import { LanguageRelay, useLanguage } from '@/shared/language';

/** Overlay bubbles share one Html configuration; only position, stacking, and style vary. They read the language too. */
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
  const language = useLanguage();
  return (
    <Html transform={false} distanceFactor={1 / 70} position={position} center zIndexRange={zIndexRange} style={style}>
      <LanguageRelay language={language}>{children}</LanguageRelay>
    </Html>
  );
}
