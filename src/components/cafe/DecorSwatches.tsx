import type { CushionId, PrintId } from '@/domain';
import { CUSHIONS } from './dressing';
import { CAFE_COLORS } from './primitives';
import { PRINTS, PRINT_FRAME } from './prints';

const degrees = (radians: number) => (radians * 180) / Math.PI;

/** A print as the shelf shows it: the café's own picture, frame and all, drawn flat. */
export function PrintSwatch({ print }: { print: PrintId }) {
  const [frameWidth, frameHeight] = PRINT_FRAME.frame;
  const [mountWidth, mountHeight] = PRINT_FRAME.mount;
  return (
    <svg
      className="print-swatch"
      viewBox={`${-frameWidth / 2} ${-frameHeight / 2} ${frameWidth} ${frameHeight}`}
      aria-hidden="true"
    >
      {/* The print's shapes count y up, as the café does. */}
      <g transform="scale(1 -1)">
        <rect
          x={-frameWidth / 2}
          y={-frameHeight / 2}
          width={frameWidth}
          height={frameHeight}
          fill={CAFE_COLORS.walnut}
        />
        <rect
          x={-mountWidth / 2}
          y={-mountHeight / 2}
          width={mountWidth}
          height={mountHeight}
          fill={CAFE_COLORS.cream}
        />
        {PRINTS[print].map(({ shape, at: [x, y], size: [width, height], color, turn = 0 }, i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${degrees(turn)})`}>
            {shape === 'band' ? (
              <rect x={-width / 2} y={-height / 2} width={width} height={height} fill={color} />
            ) : (
              <ellipse rx={width} ry={height} fill={color} />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A pair of cushions as the shelf shows it: one of each colour, as the chairs alternate them. */
export function CushionSwatch({ cushions }: { cushions: CushionId }) {
  return (
    <svg className="cushion-swatch" viewBox="0 0 40 24" aria-hidden="true">
      {CUSHIONS[cushions].map((color, i) => (
        <rect key={color} x={2 + i * 19} y={4} width={17} height={16} rx={4} fill={color} />
      ))}
    </svg>
  );
}
