import { TABLE_LAYOUT, reachedName, samePoint, type BlockPreview, type Point } from '@/domain';

/** The motion blocks' own green, so the café's mark reads as the block picked in the routine. */
const GREEN = '#3f9a77';
/** A reach into a bare tile, or a block that stopped the run. */
const WRONG = '#c4553a';
const FLOOR = 0.035;

/** A flat strip along the floor from one tile to the next. */
function Stride({ from, to, color, opacity }: { from: Point; to: Point; color: string; opacity: number }) {
  const [dx, dz] = [to[0] - from[0], to[1] - from[1]];
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, FLOOR, (from[1] + to[1]) / 2]}
      rotation-y={Math.atan2(-dz, dx)}
      renderOrder={2}
    >
      <boxGeometry args={[Math.hypot(dx, dz), 0.004, 0.12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** A flat arrowhead on the floor, pointing from one tile toward another. */
function Arrowhead({
  at,
  toward,
  size = 0.26,
  color,
  opacity,
}: {
  at: Point;
  toward: Point;
  size?: number;
  color: string;
  opacity: number;
}) {
  return (
    <group position={[at[0], FLOOR + 0.002, at[1]]} rotation-y={Math.atan2(-(toward[1] - at[1]), toward[0] - at[0])}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
        <circleGeometry args={[size, 3]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Ring({
  at,
  height = FLOOR,
  radius,
  color,
  opacity,
}: {
  at: Point;
  height?: number;
  radius: number;
  color: string;
  opacity: number;
}) {
  return (
    <mesh position={[at[0], height, at[1]]} rotation-x={-Math.PI / 2} renderOrder={2}>
      <ringGeometry args={[radius * 0.72, radius, 32]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** A square outline over a counter tile or a table, where a block reaches. */
function Square({ at, color, opacity }: { at: Point; color: string; opacity: number }) {
  const table = TABLE_LAYOUT.some((t) => samePoint(at, [t.x, t.z]));
  return (
    <mesh position={[at[0], table ? 1.32 : 1.13, at[1]]} rotation-x={-Math.PI / 2} renderOrder={3}>
      <ringGeometry args={[0.4, 0.52, 4, 1, Math.PI / 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/**
 * The block picked in the routine, drawn where it goes in the café: a walk as a green track from where it starts to an
 * arrowhead where it stops, a reach as an arrow from the robot's tile and a square over what it reaches. The first way
 * it went is drawn strongest; any others it took, fainter. Red marks a reach into nothing, or a block that stopped the
 * run.
 */
export function BlockPath({ preview }: { preview: BlockPreview }) {
  return (
    <>
      {preview.visits.slice(0, 4).map((visit, i) => {
        const opacity = i === 0 ? 0.92 : 0.45;
        const color = visit.error || (visit.target && !reachedName(visit.target)) ? WRONG : GREEN;
        const end = visit.path.at(-1)!;
        const before = visit.path.at(-2);
        return (
          <group key={i}>
            {visit.path.length > 1 && <Ring at={visit.path[0]} radius={0.17} color={color} opacity={opacity} />}
            {visit.path.slice(1).map((tile, j) => (
              <Stride key={j} from={visit.path[j]} to={tile} color={color} opacity={opacity} />
            ))}
            {before && !visit.target && (
              <Arrowhead
                at={end}
                toward={[2 * end[0] - before[0], 2 * end[1] - before[1]]}
                color={color}
                opacity={opacity}
              />
            )}
            {(visit.target || visit.path.length === 1) && (
              <Ring at={end} radius={0.42} color={color} opacity={opacity} />
            )}
            {visit.target && (
              <>
                <Arrowhead
                  at={[end[0] + (visit.target[0] - end[0]) * 0.5, end[1] + (visit.target[1] - end[1]) * 0.5]}
                  toward={visit.target}
                  size={0.2}
                  color={color}
                  opacity={opacity}
                />
                <Square at={visit.target} color={color} opacity={opacity} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
