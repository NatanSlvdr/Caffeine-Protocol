import { Box, Cylinder, type Vec3 } from './primitives';
import { Cup } from './Cup';
import type { HumanLook } from './looks';

function Ball({ at = [0, 0, 0], radius, color, scale }: { at?: Vec3; radius: number; color: string; scale?: Vec3 }) {
  return (
    <mesh position={at} scale={scale} castShadow>
      <sphereGeometry args={[radius, 12, 10]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

/** A hair shell over the crown, tipped back so the forehead and face stay clear. */
function HairCap({ color, radius = 0.278 }: { color: string; radius?: number }) {
  return (
    <mesh position={[0, 0.02, -0.02]} rotation-x={-0.5} castShadow>
      <sphereGeometry args={[radius, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

const CURLS: Vec3[] = [
  [-0.2, 0.12, 0.06],
  [0.2, 0.12, 0.06],
  [-0.23, -0.02, -0.06],
  [0.23, -0.02, -0.06],
  [-0.12, 0.2, -0.14],
  [0.12, 0.2, -0.14],
  [0, 0.1, -0.24],
  [-0.1, 0.24, 0.08],
  [0.1, 0.24, 0.08],
];

function Hair({ look }: { look: HumanLook }) {
  const { hair, hairStyle, streak } = look;
  return (
    <>
      <HairCap color={hair} />
      {hairStyle === 'messy' &&
        (
          [
            [-0.13, 0.2, 0.11],
            [0.02, 0.25, 0.08],
            [0.14, 0.19, 0.1],
            [-0.06, 0.23, -0.1],
            [0.1, 0.21, -0.12],
          ] as Vec3[]
        ).map(([x, y, z], i) => (
          // Under a cap the tufts only peek out round the rim.
          <Ball key={i} at={look.hat ? [x * 1.3, y - 0.14, z * 1.3] : [x, y, z]} radius={0.095} color={hair} />
        ))}
      {hairStyle === 'bun' && <Ball at={[0, 0.22, -0.17]} radius={0.12} color={hair} />}
      {(hairStyle === 'curly' || hairStyle === 'curly-bun') &&
        CURLS.map((at, i) => <Ball key={i} at={at} radius={0.1} color={streak && i % 3 === 1 ? streak : hair} />)}
      {hairStyle === 'curly-bun' && <Ball at={[0, 0.3, -0.06]} radius={0.15} color={hair} />}
      {hairStyle === 'long' && (
        <>
          <Ball at={[0, -0.13, -0.12]} radius={0.27} scale={[1.08, 1.45, 0.62]} color={hair} />
          <Ball at={[-0.21, -0.1, 0.02]} radius={0.1} scale={[0.8, 1.9, 0.9]} color={hair} />
          <Ball at={[0.21, -0.1, 0.02]} radius={0.1} scale={[0.8, 1.9, 0.9]} color={hair} />
        </>
      )}
    </>
  );
}

function Hat({ hat }: { hat: NonNullable<HumanLook['hat']> }) {
  const dome = (
    <mesh
      position={[0, hat.kind === 'flat-cap' ? 0.1 : 0.08, 0]}
      scale={[1, hat.kind === 'flat-cap' ? 0.75 : 0.85, 1]}
      castShadow
    >
      <sphereGeometry args={[0.29, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={hat.color} roughness={0.9} />
    </mesh>
  );
  return (
    <>
      {dome}
      <mesh
        position={hat.kind === 'flat-cap' ? [0, 0.11, 0.25] : [0, 0.09, -0.3]}
        rotation-x={hat.kind === 'flat-cap' ? 0.2 : -0.15}
      >
        <boxGeometry args={[0.3, 0.025, 0.16]} />
        <meshStandardMaterial color={hat.color} roughness={0.9} />
      </mesh>
    </>
  );
}

/** Head, hair and face details, centred on the middle of the head. */
function Head({ look }: { look: HumanLook }) {
  return (
    <>
      <Ball radius={0.26} color={look.skin} />
      <Hair look={look} />
      {look.hat && <Hat hat={look.hat} />}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Ball at={[side * 0.085, 0.02, 0.238]} radius={0.028} color="#2a1d16" />
          <Ball at={[side * 0.255, -0.01, 0]} radius={0.05} color={look.skin} />
          {look.glasses && (
            <mesh position={[side * 0.09, 0.02, 0.252]}>
              <torusGeometry args={[0.058, 0.012, 6, 14]} />
              <meshStandardMaterial color={look.glasses} />
            </mesh>
          )}
        </group>
      ))}
      {look.mustache && <Box at={[0, -0.075, 0.245]} size={[0.15, 0.035, 0.04]} color={look.mustache} />}
      {look.headband && (
        <mesh position={[0, 0.12, 0.01]} rotation-x={Math.PI / 2 - 0.25}>
          <torusGeometry args={[0.262, 0.03, 6, 20]} />
          <meshStandardMaterial color={look.headband} />
        </mesh>
      )}
      {look.sunglasses && (
        <group position={[0, 0.2, 0.18]} rotation-x={-0.6}>
          {[-1, 1].map((side) => (
            <Box key={side} at={[side * 0.08, 0, 0]} size={[0.12, 0.07, 0.03]} color={look.sunglasses} />
          ))}
        </group>
      )}
    </>
  );
}

/** Collar, tie, scarf, headphones and apron, drawn over the torso. */
function Outfit({ look }: { look: HumanLook }) {
  const { apron } = look;
  return (
    <>
      {look.collar && <Box at={[0, 0.98, 0.262]} size={[0.16, 0.2, 0.03]} color={look.collar} />}
      {look.tie && <Box at={[0, 0.93, 0.282]} size={[0.05, 0.22, 0.02]} color={look.tie} />}
      {look.scarf && (
        <>
          <mesh position={[0, 1.1, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.14, 0.06, 8, 16]} />
            <meshStandardMaterial color={look.scarf} roughness={0.95} />
          </mesh>
          <Box at={[0.08, 0.93, 0.27]} size={[0.09, 0.3, 0.05]} color={look.scarf} />
        </>
      )}
      {look.headphones && (
        <>
          <mesh position={[0, 1.1, 0.02]} rotation-x={Math.PI / 2 - 0.2}>
            <torusGeometry args={[0.16, 0.03, 6, 16]} />
            <meshStandardMaterial color={look.headphones} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.13, 1.08, 0.13]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
              <meshStandardMaterial color={look.headphones} />
            </mesh>
          ))}
        </>
      )}
      {apron && (
        <>
          <Box at={[0, 0.715, 0.285]} size={[0.38, 0.53, 0.04]} color={apron.color} />
          <Box at={[0, 0.66, 0.308]} size={[0.2, 0.12, 0.01]} color={apron.straps} />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Box at={[side * 0.12, 1.03, 0.25]} size={[0.05, 0.12, 0.03]} color={apron.straps} />
              <Box at={[side * 0.12, 1.085, 0]} size={[0.05, 0.03, 0.48]} color={apron.straps} />
            </group>
          ))}
        </>
      )}
    </>
  );
}

/** A person from the cast, posed for walking, sitting and sipping; the face points down +z. */
export function HumanModel({
  look,
  sit,
  stride,
  sip,
  drinking,
  tea,
  paper,
}: {
  look: HumanLook;
  sit: number;
  stride: number;
  sip: number;
  drinking: boolean;
  tea: boolean;
  paper: boolean;
}) {
  const lift = sit * 0.26;
  const hip = 0.51 + sit * 0.21;
  return (
    <group scale={look.scale ?? 1}>
      <group position={[0, lift, 0]}>
        <Cylinder at={[0, 0.78, 0]} size={[0.25, 0.29, 0.6]} color={look.top} />
        <Cylinder at={[0, 1.12, 0]} size={[0.08, 0.09, 0.1]} color={look.skin} />
        <Outfit look={look} />
      </group>
      <group position={[0, 1.37 + lift, 0]} rotation-x={sip * 0.12}>
        <Head look={look} />
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[side * 0.15, hip, 0]} rotation-x={(-sit * Math.PI) / 2 + stride * side * 0.5 * (1 - sit)}>
            <Box at={[0, -0.12, 0]} size={[0.17, 0.25, 0.19]} color={look.trousers} />
            <group
              position={[0, -0.25, 0]}
              rotation-x={(sit * Math.PI) / 2 + Math.max(0, -stride * side) * 0.35 * (1 - sit)}
            >
              <Box at={[0, -0.12, 0]} size={[0.17, 0.25, 0.17]} color={look.trousers} />
              <Box at={[0, -0.2, 0.09]} size={[0.2, 0.13, 0.33]} color={look.shoes} />
            </group>
          </group>
          <group
            position={[side * 0.35, 1 + lift, 0]}
            rotation-x={drinking && side === 1 ? -1.05 - sip * 0.7 : -sit * 0.75 - stride * side * 0.4}
          >
            <Box at={[0, -0.2, 0]} size={[0.13, 0.42, 0.15]} color={look.top} />
            <Ball at={[0, -0.43, 0]} radius={0.08} color={look.skin} />
          </group>
        </group>
      ))}
      {drinking && (
        <group position={[0.22, 1.26 + sip * 0.27, 0.43 - sip * 0.19]} rotation-x={-sip * 0.3} scale={0.72}>
          <Cup tea={tea} paper={paper} lid={paper} />
        </group>
      )}
    </group>
  );
}
