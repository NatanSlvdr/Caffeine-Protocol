import { DoubleSide } from 'three';
import { BOUNDS, ENTRANCE, type Restoration, type SillGrowth } from '@/domain';
import { useCanvasTexture } from '@/hooks/useCanvasTexture';
import { Box, Cylinder, CAFE_COLORS } from './primitives';
import {
  BACK_WALL_FACE,
  KITCHEN_FLOOR,
  STREET_WALL_FACE,
  STREET_WINDOWS,
  WAINSCOT_HEIGHT,
  type FloorPatch,
} from './dressing';
import { StoryDressing } from './StoryDressing';
import { tileTexture } from './tileTexture';

/** The back wall runs the room's full width, from the street wall to the far side. */
const BACK_WALL = { left: STREET_WALL_FACE, right: BOUNDS.maxX + 0.5 };
const BACK_WALL_MID = (BACK_WALL.left + BACK_WALL.right) / 2;
const BACK_WALL_WIDTH = BACK_WALL.right - BACK_WALL.left;
/** The street wall's panelling stops at the door post. */
const STREET_WALL = { back: BACK_WALL_FACE, front: ENTRANCE[1] - 1.55 };
const STREET_WALL_MID = (STREET_WALL.back + STREET_WALL.front) / 2;
const STREET_WALL_LENGTH = STREET_WALL.front - STREET_WALL.back;
const WALL_TOP = 2.65;

/**
 * Panelling, trim and the few things hung on the walls, composed around the cup mural, with what the story has put
 * back by the shift shown: the herbs on the sills, and the photos, aprons and lights on the back wall.
 */
export function WallDressing({
  restored,
  growth,
  evening,
}: {
  restored: ReadonlySet<Restoration>;
  growth: SillGrowth;
  evening: boolean;
}) {
  return (
    <group>
      {/* Wainscot with a chair rail and skirting on the back wall… */}
      <Box
        at={[BACK_WALL_MID, WAINSCOT_HEIGHT / 2, BACK_WALL_FACE + 0.02]}
        size={[BACK_WALL_WIDTH, WAINSCOT_HEIGHT, 0.04]}
        color={CAFE_COLORS.wallDeep}
      />
      <Box
        at={[BACK_WALL_MID, WAINSCOT_HEIGHT, BACK_WALL_FACE + 0.04]}
        size={[BACK_WALL_WIDTH, 0.05, 0.08]}
        color={CAFE_COLORS.walnut}
      />
      <Box
        at={[BACK_WALL_MID, 0.1, BACK_WALL_FACE + 0.05]}
        size={[BACK_WALL_WIDTH, 0.14, 0.06]}
        color={CAFE_COLORS.walnut}
      />
      {/* …and the same on the street wall, running under the window sills. */}
      <Box
        at={[STREET_WALL_FACE + 0.02, WAINSCOT_HEIGHT / 2, STREET_WALL_MID]}
        size={[0.04, WAINSCOT_HEIGHT, STREET_WALL_LENGTH]}
        color={CAFE_COLORS.wallDeep}
      />
      <Box
        at={[STREET_WALL_FACE + 0.05, 0.1, STREET_WALL_MID]}
        size={[0.06, 0.14, STREET_WALL_LENGTH]}
        color={CAFE_COLORS.walnut}
      />
      {/* A walnut cap finishes the cut-away top of both walls. */}
      <Box
        at={[BACK_WALL_MID - 0.1, WALL_TOP + 0.03, BACK_WALL_FACE - 0.1]}
        size={[BACK_WALL_WIDTH + 0.4, 0.06, 0.3]}
        color={CAFE_COLORS.walnut}
      />
      <Box
        at={[STREET_WALL_FACE - 0.1, WALL_TOP + 0.03, (BACK_WALL_FACE - 0.2 + ENTRANCE[1] + 0.6) / 2]}
        size={[0.3, 0.06, ENTRANCE[1] + 0.6 - (BACK_WALL_FACE - 0.2)]}
        color={CAFE_COLORS.walnut}
      />
      <FramedPrint at={[-6.8, 1.62, BACK_WALL_FACE]} />
      <WallClock at={[-2.5, 1.85, BACK_WALL_FACE]} />
      <CupShelf at={[1.6, 1.55, BACK_WALL_FACE]} />
      <MenuBoard at={[5.7, 1.62, BACK_WALL_FACE]} />
      {STREET_WINDOWS.map((z, i) => (
        <SillPot key={z} at={[STREET_WALL_FACE + 0.22, 0.925, z + (i % 2 ? -0.62 : 0.62)]} growth={growth} />
      ))}
      <StoryDressing restored={restored} evening={evening} />
    </group>
  );
}

/** A small landscape print in the café's colours: hills, a field and a sun. */
function FramedPrint({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0.025]} size={[0.86, 0.64, 0.05]} color={CAFE_COLORS.walnut} />
      <Box at={[0, 0, 0.052]} size={[0.74, 0.52, 0.006]} color={CAFE_COLORS.cream} />
      <Box at={[0, -0.12, 0.057]} size={[0.6, 0.14, 0.006]} color={CAFE_COLORS.sage} />
      <Box at={[0.08, -0.03, 0.056]} size={[0.44, 0.08, 0.006]} color={CAFE_COLORS.wall} />
      <mesh position={[-0.16, 0.1, 0.058]}>
        <circleGeometry args={[0.07, 20]} />
        <meshStandardMaterial color={CAFE_COLORS.clay} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A plain station clock, its hands at seven: opening time. */
function WallClock({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh position={[0, 0, 0.03]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.06, 32]} />
        <meshStandardMaterial color={CAFE_COLORS.walnut} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0, 0.061]}>
        <circleGeometry args={[0.215, 32]} />
        <meshStandardMaterial color={CAFE_COLORS.cream} roughness={0.38} side={DoubleSide} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} rotation-z={(i * Math.PI) / 6}>
          <Box at={[0, 0.18, 0.066]} size={[0.012, i % 3 ? 0.025 : 0.045, 0.004]} color={CAFE_COLORS.charcoal} />
        </group>
      ))}
      <group rotation-z={(-7 * Math.PI) / 6}>
        <Box at={[0, 0.06, 0.07]} size={[0.022, 0.12, 0.006]} color={CAFE_COLORS.charcoal} />
      </group>
      <Box at={[0, 0.08, 0.074]} size={[0.014, 0.16, 0.006]} color={CAFE_COLORS.charcoal} />
    </group>
  );
}

/** A walnut shelf of spare cups and a trailing plant. */
function CupShelf({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0.13]} size={[1.3, 0.05, 0.26]} color={CAFE_COLORS.walnut} />
      {[-0.4, 0.4].map((x) => (
        <Box key={x} at={[x, -0.08, 0.04]} size={[0.04, 0.16, 0.08]} color={CAFE_COLORS.brass} />
      ))}
      {[-0.48, -0.3, -0.12].map((x) => (
        <group key={x}>
          <Cylinder at={[x, 0.09, 0.13]} size={[0.07, 0.06, 0.13]} color={CAFE_COLORS.cream} />
          <Cylinder at={[x, 0.16, 0.13]} size={[0.065, 0.065, 0.012]} color={CAFE_COLORS.sand} />
        </group>
      ))}
      <Cylinder at={[0.12, 0.08, 0.13]} size={[0.09, 0.09, 0.11]} color={CAFE_COLORS.sage} />
      <Cylinder at={[0.12, 0.14, 0.13]} size={[0.07, 0.07, 0.012]} color={CAFE_COLORS.walnut} />
      <Cylinder at={[0.42, 0.08, 0.13]} size={[0.08, 0.065, 0.12]} color={CAFE_COLORS.terracotta} />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0.42 + (i - 1.5) * 0.06, 0.12 - i * 0.07, 0.2]}
          rotation={[0.3, i * 1.3, 0.4]}
          scale={[0.07, 0.11, 0.04]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 ? CAFE_COLORS.leaf : CAFE_COLORS.leafLight} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A chalk menu: a heading, four lines with their prices, and a little cup doodle. */
function MenuBoard({ at }: { at: [number, number, number] }) {
  const chalk = '#ece7da';
  return (
    <group position={at}>
      <Box at={[0, 0, 0.025]} size={[1.3, 0.96, 0.05]} color={CAFE_COLORS.walnut} />
      <Box at={[0, 0, 0.052]} size={[1.18, 0.84, 0.006]} color={CAFE_COLORS.slate} />
      <Box at={[0, 0.3, 0.057]} size={[0.5, 0.05, 0.004]} color={chalk} />
      {[0.42, 0.34, 0.5, 0.3].map((width, i) => (
        <group key={i}>
          <Box at={[-0.44 + width / 2, 0.14 - i * 0.12, 0.057]} size={[width, 0.022, 0.004]} color={chalk} />
          <Box at={[0.42, 0.14 - i * 0.12, 0.057]} size={[0.1, 0.022, 0.004]} color={CAFE_COLORS.sand} />
        </group>
      ))}
      <mesh position={[0.36, 0.3, 0.058]}>
        <ringGeometry args={[0.035, 0.05, 16]} />
        <meshBasicMaterial color={chalk} />
      </mesh>
      <Box at={[0.18, -0.48, 0.09]} size={[0.5, 0.025, 0.06]} color={CAFE_COLORS.walnut} />
    </group>
  );
}

const LEAVES = [0, 1, 2, 3, 4];
const SHOOTS = [0, 2, 4];
const FLOWERS = ['#f6efe3', '#e9b0a0', '#f6efe3'];

/** A terracotta pot of herbs on a window sill: dry stalks, new shoots, a full pot, or one in flower. */
function SillPot({ at, growth }: { at: [number, number, number]; growth: SillGrowth }) {
  return (
    <group position={at}>
      <Cylinder at={[0, 0.07, 0]} size={[0.085, 0.065, 0.14]} color={CAFE_COLORS.terracotta} />
      {growth === 0
        ? SHOOTS.map((i) => (
            <group
              key={i}
              position={[Math.sin(i * 2.5) * 0.03, 0.2, Math.cos(i * 2.5) * 0.03]}
              rotation={[i * 0.2, i, 0.35]}
            >
              <Box size={[0.012, 0.14, 0.012]} color="#8b6b47" />
            </group>
          ))
        : (growth === 1 ? SHOOTS : LEAVES).map((i) => (
            <mesh
              key={i}
              position={[Math.sin(i * 2.5) * 0.05, (growth === 1 ? 0.15 : 0.17) + i * 0.02, Math.cos(i * 2.5) * 0.05]}
              rotation={[i * 0.4, i * 2.5, 0.5]}
              scale={growth === 1 ? [0.032, 0.065, 0.02] : [0.05, 0.1, 0.03]}
              castShadow
            >
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={i % 2 ? CAFE_COLORS.leaf : CAFE_COLORS.leafLight} roughness={0.8} />
            </mesh>
          ))}
      {growth === 3 &&
        FLOWERS.map((color, i) => (
          <mesh key={i} position={[Math.sin(i * 2.1 + 1) * 0.045, 0.3 + (i % 2) * 0.03, Math.cos(i * 2.1 + 1) * 0.045]}>
            <icosahedronGeometry args={[0.022, 0]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        ))}
    </group>
  );
}

/** Quarry tiles laid over the boards wherever only the crew walk. */
export function KitchenFloor() {
  return (
    <group>
      {KITCHEN_FLOOR.map((patch) => (
        <TiledPatch key={`${patch.left},${patch.back}`} patch={patch} />
      ))}
      <EntranceMat />
    </group>
  );
}

function TiledPatch({ patch }: { patch: FloorPatch }) {
  const width = patch.right - patch.left,
    depth = patch.front - patch.back;
  const texture = useCanvasTexture(() => tileTexture(width, depth), [width, depth]);
  return (
    <mesh
      position={[(patch.left + patch.right) / 2, 0.031, (patch.back + patch.front) / 2]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.55} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

/** A coir mat just inside the door, where every customer steps in. */
function EntranceMat() {
  return (
    <group position={[ENTRANCE[0] + 0.12, 0.034, ENTRANCE[1] - 0.5]}>
      <Box size={[0.72, 0.014, 1.66]} color="#7a5a3c" />
      <Box at={[0, 0.004, 0]} size={[0.58, 0.012, 1.5]} color="#a17a52" />
    </group>
  );
}
