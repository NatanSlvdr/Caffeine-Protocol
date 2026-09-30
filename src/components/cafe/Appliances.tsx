import type { StationId } from '@/domain';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from './primitives';
import { Cup, PaperCup } from './Cup';

const STEEL = '#c1cfcc';
const DARK = '#304941';

/** Recognizable workstation silhouettes: a two-group espresso machine and a full cash register. */
export function Appliance({ id }: { id: StationId }) {
  switch (id) {
    case 'brewer':
    case 'grinder':
      return (
        <group>
          <SoftBox at={[0, 1.58, -0.14]} size={[1.65, 0.82, 0.58]} radius={0.1} color={CAFE_COLORS.charcoal} />
          <SoftBox at={[0, 1.67, 0.17]} size={[1.49, 0.42, 0.08]} radius={0.03} color={STEEL} />
          <SoftBox at={[0, 1.15, 0.1]} size={[1.76, 0.1, 0.9]} radius={0.035} color={STEEL} />
          {[-0.65, -0.52, -0.39, -0.26, -0.13, 0, 0.13, 0.26, 0.39, 0.52, 0.65].map((x) => (
            <Box key={x} at={[x, 1.207, 0.22]} size={[0.025, 0.012, 0.52]} color={CAFE_COLORS.charcoal} />
          ))}
          {[-0.4, 0.4].map((x) => (
            <group key={x}>
              <Cylinder at={[x, 1.46, 0.25]} size={[0.13, 0.13, 0.13]} color={STEEL} />
              <Box at={[x, 1.43, 0.4]} size={[0.075, 0.07, 0.32]} color={CAFE_COLORS.walnut} />
              {[-0.085, 0, 0.085].map((dx) => (
                <Box
                  key={dx}
                  at={[x + dx, 1.74, 0.22]}
                  size={[0.045, 0.055, 0.02]}
                  color={dx === 0 ? '#9fc4b0' : CAFE_COLORS.charcoal}
                />
              ))}
              <Cup at={[x, 2.015, -0.13]} />
            </group>
          ))}
          {[-0.72, 0.72].map((x) => (
            <group key={x}>
              <Cylinder at={[x, 1.7, 0.22]} size={[0.065, 0.065, 0.07]} color={CAFE_COLORS.charcoal} />
              <Box at={[x, 1.47, 0.29]} size={[0.025, 0.32, 0.025]} color={STEEL} />
              <Box at={[x, 1.3, 0.35]} size={[0.025, 0.025, 0.14]} color={STEEL} />
            </group>
          ))}
          <mesh position={[0, 1.75, 0.221]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.085, 0.085, 0.015, 24]} />
            <meshStandardMaterial color={CAFE_COLORS.cream} />
          </mesh>
          <Box at={[0.014, 1.766, 0.235]} size={[0.015, 0.06, 0.012]} color={CAFE_COLORS.charcoal} />
          <Box at={[0, 2.015, -0.14]} size={[1.61, 0.045, 0.53]} color={STEEL} />
        </group>
      );
    case 'water':
      return (
        <group>
          <Box at={[0, 1.12, 0]} size={[0.9, 0.055, 0.85]} color={STEEL} />
          <Box at={[0, 1.155, 0.04]} size={[0.7, 0.025, 0.57]} color="#406b70" />
          {[-0.39, 0.39].map((x) => (
            <Box key={x} at={[x, 1.18, 0.04]} size={[0.08, 0.08, 0.7]} color={STEEL} />
          ))}
          {[-0.27, 0.35].map((z) => (
            <Box key={z} at={[0, 1.18, z]} size={[0.72, 0.08, 0.08]} color={STEEL} />
          ))}
          <Cylinder at={[0, 1.4, -0.29]} size={[0.035, 0.045, 0.55]} color={STEEL} />
          <Box at={[0, 1.68, -0.1]} size={[0.075, 0.075, 0.4]} color={STEEL} />
          <Cylinder at={[0, 1.61, 0.08]} size={[0.045, 0.045, 0.15]} color={STEEL} />
          {[-0.22, 0.22].map((x) => (
            <group key={x}>
              <Cylinder at={[x, 1.24, -0.3]} size={[0.07, 0.07, 0.1]} color={STEEL} />
              <Box at={[x, 1.3, -0.3]} size={[0.15, 0.035, 0.04]} color={x < 0 ? '#bb6850' : '#649fb8'} />
            </group>
          ))}
          <Cylinder at={[0, 1.174, 0.08]} size={[0.07, 0.07, 0.012]} color={DARK} />
        </group>
      );
    case 'ingredients':
      return (
        <group>
          <Fridge />
          <HighShelf />
        </group>
      );
    case 'sugar':
      return (
        <group>
          <Cylinder at={[0, 1.32, 0]} size={[0.2, 0.2, 0.42]} color={CAFE_COLORS.sage} />
          <Cylinder at={[0, 1.54, 0]} size={[0.21, 0.21, 0.025]} color={CAFE_COLORS.walnut} />
          <Box at={[0, 1.33, 0.2]} size={[0.17, 0.08, 0.012]} color="#c98270" />
        </group>
      );
    case 'pickup':
      return <SoftBox at={[0, 1.12, 0]} size={[0.86, 0.035, 0.78]} radius={0.016} color={CAFE_COLORS.clay} />;
    // Paper cups stand in a column beside a stack of lids.
    case 'lids':
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <PaperCup key={i} at={[-0.18, 1.1 + i * 0.07, 0]} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Cylinder key={i} at={[0.2, 1.13 + i * 0.028, 0]} size={[0.185, 0.185, 0.024]} color="#3f322b" />
          ))}
        </group>
      );
    // A little sign marks the corner where take-away drinks wait.
    case 'togo':
      return (
        <group>
          <SoftBox at={[0, 1.12, 0]} size={[0.82, 0.03, 0.74]} radius={0.014} color={CAFE_COLORS.clay} />
          <Box at={[-0.28, 1.36, -0.25]} size={[0.04, 0.42, 0.04]} color={CAFE_COLORS.walnut} />
          <SoftBox at={[-0.28, 1.62, -0.25]} size={[0.34, 0.18, 0.035]} radius={0.02} color={CAFE_COLORS.cream} />
          <Box at={[-0.28, 1.62, -0.23]} size={[0.24, 0.05, 0.008]} color={CAFE_COLORS.charcoal} />
        </group>
      );
    case 'returns':
      return null;
    case 'orders':
      return (
        <group>
          <SoftBox at={[0, 1.23, 0]} size={[0.85, 0.25, 0.72]} radius={0.04} color={CAFE_COLORS.charcoal} />
          <Box at={[0, 1.23, 0.368]} size={[0.7, 0.13, 0.02]} color={STEEL} />
          <Box at={[0, 1.24, 0.39]} size={[0.25, 0.035, 0.025]} color={CAFE_COLORS.charcoal} />
          <SoftBox at={[0, 1.46, -0.13]} size={[0.79, 0.28, 0.43]} radius={0.05} color={CAFE_COLORS.cream} />
          <group position={[0.1, 1.57, 0.12]} rotation-x={-0.28}>
            <Box size={[0.47, 0.06, 0.28]} color={CAFE_COLORS.charcoal} />
            {[0, 1, 2].flatMap((row) =>
              [0, 1, 2, 3].map((col) => (
                <Box
                  key={row * 4 + col}
                  at={[-0.17 + col * 0.11, 0.041, -0.09 + row * 0.085]}
                  size={[0.078, 0.03, 0.056]}
                  color={col === 3 ? CAFE_COLORS.sage : CAFE_COLORS.cream}
                />
              )),
            )}
          </group>
          <Box at={[-0.27, 1.58, 0.1]} size={[0.12, 0.025, 0.24]} color={CAFE_COLORS.charcoal} />
          <Box at={[-0.27, 1.7, 0.09]} size={[0.1, 0.22, 0.014]} color="#fffaf0" />
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              at={[-0.27, 1.67 + i * 0.035, 0.101]}
              size={[0.06, 0.008, 0.007]}
              color={CAFE_COLORS.charcoal}
            />
          ))}
          <Box at={[0, 1.75, -0.23]} size={[0.07, 0.3, 0.07]} color={CAFE_COLORS.charcoal} />
          <SoftBox at={[0, 1.9, -0.23]} size={[0.64, 0.26, 0.13]} radius={0.025} color={CAFE_COLORS.charcoal} />
          <Box at={[0, 1.9, -0.155]} size={[0.52, 0.16, 0.012]} color="#a9c7a3" />
          {[-0.12, 0, 0.12].map((x) => (
            <group key={x}>
              {[-0.045, 0.045].map((y) => (
                <Box key={y} at={[x, 1.9 + y, -0.144]} size={[0.065, 0.012, 0.01]} color="#365547" />
              ))}
              <Box at={[x + 0.03, 1.9, -0.144]} size={[0.012, 0.1, 0.01]} color="#365547" />
            </group>
          ))}
        </group>
      );
  }
}

/** Compact cold storage beside the ingredient cabinet, opening toward the prep aisle. */
function Fridge() {
  return (
    <group>
      <Box at={[0, 1, -0.4]} size={[0.94, 1.9, 0.06]} color="#d8e0dc" />
      {[-0.44, 0.44].map((x) => (
        <Box key={x} at={[x, 1, 0]} size={[0.06, 1.9, 0.86]} color="#d8e0dc" />
      ))}
      {[0.1, 0.65, 1.2, 1.85].map((y) => (
        <Box key={y} at={[0, y, 0]} size={[0.84, 0.045, 0.78]} color="#c1cfcc" />
      ))}
      {[0.3, 0.85, 1.4].flatMap((y) =>
        [-0.25, 0, 0.25].map((x) => (
          <group key={`${x}-${y}`}>
            <Cylinder at={[x, y, 0]} size={[0.08, 0.09, 0.3]} color="#edf2dc" />
            <Cylinder at={[x, y + 0.17, 0]} size={[0.05, 0.05, 0.05]} color="#83a9a0" />
          </group>
        )),
      )}
      <mesh position={[0, 1, 0.44]}>
        <boxGeometry args={[0.82, 1.73, 0.025]} />
        <meshStandardMaterial
          color="#bce2dc"
          transparent
          opacity={0.18}
          depthWrite={false}
          roughness={0.12}
          metalness={0.15}
        />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <Box key={x} at={[x, 1, 0.46]} size={[0.05, 1.83, 0.045]} color="#496267" />
      ))}
      <Box at={[0.31, 1.1, 0.5]} size={[0.045, 0.5, 0.07]} color="#334c50" />
      <Box at={[0, 1.95, 0]} size={[0.98, 0.06, 0.9]} color="#496267" />
    </group>
  );
}

/** A full-height open shelf stands beside the fridge and matches its silhouette. */
function HighShelf() {
  return (
    <group>
      {['left', 'right'].map((side, i) => (
        <Box key={side} at={[0.57 + i * 0.86, 1, -0.02]} size={[0.07, 2, 0.74]} color="#355358" />
      ))}
      {[0.08, 0.7, 1.32, 1.94].map((y) => (
        <Box key={y} at={[1, y, -0.02]} size={[0.92, 0.07, 0.78]} color="#b68b69" />
      ))}
      {[0.34, 0.96, 1.58].flatMap((y, row) =>
        [-0.28, 0, 0.28].flatMap((offset, column) =>
          [-0.2, 0.2].map((z) => (
            <group key={`${y}-${offset}-${z}`} position={[1 + offset, y, z]}>
              {row === 1 ? (
                <Cylinder at={[0, 0, 0]} size={[0.115, 0.115, 0.4]} color="#b8c398" />
              ) : (
                <Box size={[0.24, 0.4, 0.3]} color={['#80523b', '#75a45c', '#ddc49c', '#668e83'][(row + column) % 4]} />
              )}
              <Box at={[0, 0, 0.16]} size={[0.16, 0.1, 0.015]} color="#f0e8d6" />
            </group>
          )),
        ),
      )}
    </group>
  );
}

/** Both robots can reach this open ticket tray from their own side of the divider. */
export function TicketTray() {
  return (
    <group>
      <Box at={[0, 1.12, 0]} size={[0.85, 0.045, 0.8]} color="#eee9df" />
      {[-0.37, 0.37].map((z) => (
        <Box key={z} at={[0, 1.17, z]} size={[0.85, 0.075, 0.045]} color="#9bb9b0" />
      ))}
      <Box at={[-0.26, 1.15, 0]} size={[0.1, 0.035, 0.55]} color="#334e53" />
    </group>
  );
}
