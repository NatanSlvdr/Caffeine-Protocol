import type { Ref } from 'react';
import { Color, DoubleSide, LatheGeometry, Quaternion, SphereGeometry, SplineCurve, Vector2, Vector3 } from 'three';
import type { Group } from 'three';
import type { Cargo } from '@/domain';
import type { Vec3 } from './primitives';
import { Cup } from './Cup';
import type { HumanLook } from './looks';
import { DRINK_SCALE, HUMAN_ARM as ARM, humanArmPose, itemsForHand, sipCup, type ArmPose } from './arms';
import { HeldItem } from './HeldItem';

/**
 * The cast are soft, rounded figures about three heads tall, matching their painted portraits: an egg-shaped
 * head with a chin, a torso turned on a lathe from hips through waist to sloping shoulders, capsule limbs,
 * mitten hands and rounded shoes. Every shape is smooth so the figures read as people, not stacked blocks.
 */

/** A smooth lathe profile through (radius, height) control points. */
function smooth(points: [number, number][], divisions = 28) {
  return new SplineCurve(points.map(([r, y]) => new Vector2(r, y))).getPoints(divisions);
}

/** A full turn on the lathe, its seam turned to the back by the mesh. */
function turned(points: [number, number][], segments = 24) {
  return new LatheGeometry(smooth(points), segments);
}

/** A slice of the lathe centred on the front (+z): aprons and shirt fronts that wrap the body. */
function panel(points: [number, number][], halfWidth: number) {
  return new LatheGeometry(smooth(points, 16), 12, -halfWidth, halfWidth * 2);
}

/** Head centred on its middle: full cheeks, a narrower chin and a rounded crown. */
const HEAD = turned([
  [0, -0.255],
  [0.1, -0.245],
  [0.175, -0.2],
  [0.225, -0.12],
  [0.248, -0.02],
  [0.25, 0.06],
  [0.235, 0.15],
  [0.195, 0.225],
  [0.12, 0.27],
  [0, 0.285],
]);
/** Hips in the trousers, tucked under the shirt's hem. */
const HIPS = turned([
  [0, 0.44],
  [0.14, 0.445],
  [0.19, 0.48],
  [0.197, 0.54],
  [0.186, 0.62],
  [0.17, 0.66],
]);
/** The top: a hem over the belt, a waist, a fuller chest and shoulders sloping into the neck. */
const CHEST_PROFILE: [number, number][] = [
  [0, 0.585],
  [0.2, 0.585],
  [0.2, 0.61],
  [0.183, 0.68],
  [0.188, 0.78],
  [0.208, 0.9],
  [0.222, 0.98],
  [0.222, 1.03],
  [0.205, 1.075],
  [0.16, 1.11],
  [0.09, 1.13],
  [0, 1.135],
];
const CHEST = turned(CHEST_PROFILE);
/** The crew's bib apron: a bib over the chest and a wider skirt to mid-thigh. */
const APRON_BIB = panel(
  [
    [0.2, 0.66],
    [0.203, 0.78],
    [0.222, 0.9],
    [0.236, 0.98],
  ],
  0.6,
);
const APRON_SKIRT = panel(
  [
    [0.222, 0.38],
    [0.218, 0.46],
    [0.214, 0.54],
    [0.205, 0.62],
    [0.2, 0.68],
  ],
  1.12,
);
const APRON_POCKET = panel(
  [
    [0.224, 0.56],
    [0.219, 0.62],
    [0.216, 0.67],
  ],
  0.36,
);
/** People are shallower front to back than side to side. */
const TORSO_DEPTH = 0.75;
/** One sphere shared by every rounded part, each scaled to its own size. */
const SPHERE = new SphereGeometry(1, 16, 12);
const UP = new Vector3(0, 1, 0);

function shade(color: string, amount: number) {
  return `#${new Color(color).multiplyScalar(amount).getHexString()}`;
}

function blend(color: string, toward: string, amount: number) {
  return `#${new Color(color).lerp(new Color(toward), amount).getHexString()}`;
}

function Cloth({ color, roughness = 0.82, doubleSided }: { color: string; roughness?: number; doubleSided?: boolean }) {
  return <meshStandardMaterial color={color} roughness={roughness} side={doubleSided ? DoubleSide : undefined} />;
}

/** An ellipsoid: `size` is its three radii. */
function Blob({
  at = [0, 0, 0],
  size,
  rotation = [0, 0, 0],
  color,
  roughness,
  shadow = true,
}: {
  at?: Vec3;
  size: Vec3 | number;
  rotation?: Vec3;
  color: string;
  roughness?: number;
  shadow?: boolean;
}) {
  return (
    <mesh geometry={SPHERE} position={at} rotation={rotation} scale={size} castShadow={shadow}>
      <Cloth color={color} roughness={roughness} />
    </mesh>
  );
}

/** A rounded limb or strap, centred on `at` and running along its local y. */
function Capsule({
  at,
  radius,
  length,
  color,
  rotation = [0, 0, 0],
}: {
  at: Vec3;
  radius: number;
  length: number;
  color: string;
  rotation?: Vec3;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow>
      <capsuleGeometry args={[radius, length, 4, 12]} />
      <Cloth color={color} />
    </mesh>
  );
}

/** A capsule laid between two points. */
function Strap({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const a = new Vector3(...from),
    b = new Vector3(...to);
  const quaternion = new Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return (
    <mesh position={a.clone().add(b).multiplyScalar(0.5)} quaternion={quaternion} castShadow>
      <capsuleGeometry args={[radius, a.distanceTo(b), 3, 8]} />
      <Cloth color={color} />
    </mesh>
  );
}

/** Hair over the whole crown, then down the sides and back to the nape, leaving the face open. Under a hat only the nape shows. */
const HAIR_TOP = new SphereGeometry(0.285, 24, 8, 0, Math.PI * 2, 0, Math.PI * 0.43);
const HAIR_BACK = new SphereGeometry(0.285, 24, 8, Math.PI * 0.83, Math.PI * 1.34, Math.PI * 0.42, Math.PI * 0.27);
const HAIR_NAPE = new SphereGeometry(0.285, 24, 8, Math.PI * 0.83, Math.PI * 1.34, Math.PI * 0.3, Math.PI * 0.39);

function HairCap({ color, capped }: { color: string; capped: boolean }) {
  return (
    <group position={[0, 0.025, -0.012]} scale={[1, 1.02, 1.02]}>
      {(capped ? [HAIR_NAPE] : [HAIR_TOP, HAIR_BACK]).map((geometry, i) => (
        <mesh key={i} geometry={geometry} castShadow>
          <Cloth color={color} roughness={0.7} doubleSided />
        </mesh>
      ))}
    </group>
  );
}

/** Points on the scalp for curls, leaving the face open. */
function scalp(rings: [elevation: number, count: number][], radius: number, centre: Vec3): Vec3[] {
  return rings.flatMap(([elevation, count], ring) =>
    Array.from({ length: count }, (_, i) => {
      const azimuth = ((i + (ring % 2) * 0.5) / count) * Math.PI * 2;
      const el = (elevation * Math.PI) / 180;
      return [
        centre[0] + Math.sin(azimuth) * Math.cos(el) * radius,
        centre[1] + Math.sin(el) * radius,
        centre[2] + Math.cos(azimuth) * Math.cos(el) * radius,
      ] as Vec3;
    }).filter(([, y, z]) => !(z > 0.12 && y < 0.17)),
  );
}

const CURLS = scalp(
  [
    [82, 1],
    [58, 7],
    [32, 11],
    [6, 12],
    [-22, 10],
  ],
  0.25,
  [0, 0.04, -0.02],
);
const SIDE_CURLS = scalp(
  [
    [32, 11],
    [6, 12],
    [-22, 10],
  ],
  0.25,
  [0, 0.04, -0.02],
);
const BUN_CURLS: Vec3[] = [
  [0, 0, 0],
  [0.09, 0.02, 0],
  [-0.09, 0.02, 0],
  [0, 0.03, 0.08],
  [0, 0.03, -0.08],
  [0.05, 0.09, 0.03],
  [-0.05, 0.09, -0.03],
];

/** Messy locks: [position, rotation], fringe first. */
const LOCKS: [Vec3, Vec3][] = [
  [
    [-0.11, 0.15, 0.19],
    [1.1, 0, 0.35],
  ],
  [
    [0.0, 0.18, 0.2],
    [1.2, 0, -0.05],
  ],
  [
    [0.12, 0.14, 0.18],
    [1.1, 0, -0.45],
  ],
  [
    [-0.17, 0.2, 0.0],
    [0.2, 0, 0.5],
  ],
  [
    [0.17, 0.2, 0.0],
    [0.1, 0, -0.5],
  ],
  [
    [0.02, 0.27, -0.06],
    [-0.4, 0, -0.1],
  ],
  [
    [-0.1, 0.19, -0.19],
    [-1.0, 0, 0.3],
  ],
  [
    [0.11, 0.2, -0.18],
    [-1.0, 0, -0.3],
  ],
];

function Hair({ look }: { look: HumanLook }) {
  const { hair, hairStyle, streak, hat } = look;
  return (
    <>
      <HairCap color={hair} capped={!!hat} />
      {hairStyle === 'short' && !hat && (
        <>
          <Blob at={[0.05, 0.16, 0.18]} size={[0.15, 0.06, 0.09]} rotation={[-0.55, 0, -0.3]} color={hair} />
          {[-1, 1].map((side) => (
            <Blob key={side} at={[side * 0.235, 0.0, 0.02]} size={[0.035, 0.08, 0.06]} color={hair} />
          ))}
        </>
      )}
      {hairStyle === 'messy' &&
        !hat &&
        LOCKS.map(([at, rotation], i) => (
          <Blob key={i} at={at} size={[0.06, 0.13, 0.06]} rotation={rotation} color={hair} />
        ))}
      {hat && (
        // Under a cap only a fringe and the tufts over the ears show.
        <>
          {hairStyle !== 'short' && (
            <Blob at={[0.02, 0.1, 0.2]} size={[0.15, 0.05, 0.08]} rotation={[-0.35, 0, -0.15]} color={hair} />
          )}
          {[-1, 1].map((side) => (
            <Blob key={side} at={[side * 0.235, 0.0, 0.02]} size={[0.035, 0.085, 0.065]} color={hair} />
          ))}
        </>
      )}
      {hairStyle === 'bun' && (
        <>
          <Blob at={[0, 0.2, -0.2]} size={0.115} color={hair} />
          <mesh position={[0, 0.16, -0.17]} rotation-x={-0.9}>
            <torusGeometry args={[0.07, 0.018, 6, 14]} />
            <Cloth color={shade(hair, 0.6)} />
          </mesh>
        </>
      )}
      {(hairStyle === 'curly' || hairStyle === 'curly-bun') &&
        (hairStyle === 'curly' ? CURLS : SIDE_CURLS).map((at, i) => (
          <Blob key={i} at={at} size={0.078} color={streak && i % 3 === 1 ? streak : hair} />
        ))}
      {hairStyle === 'curly-bun' && (
        <group position={[0, 0.27, -0.06]}>
          {BUN_CURLS.map((at, i) => (
            <Blob key={i} at={at} size={0.085} color={hair} />
          ))}
          {/* Juno keeps a pencil through her bun. */}
          <group rotation-z={1.05} rotation-x={0.2}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.34, 6]} />
              <Cloth color="#e5b23a" />
            </mesh>
            <Blob at={[0, 0.17, 0]} size={0.016} color="#e48c8c" shadow={false} />
          </group>
        </group>
      )}
      {hairStyle === 'long' && (
        <>
          {/* A fall of hair behind the head down to the shoulders, and two locks framing the face. */}
          <mesh position={[0, -0.02, -0.02]} scale={[1.08, 1.4, 1]} castShadow>
            <sphereGeometry args={[0.27, 20, 12, Math.PI * 0.8, Math.PI * 1.4, Math.PI * 0.28, Math.PI * 0.52]} />
            <Cloth color={hair} roughness={0.7} doubleSided />
          </mesh>
          {[-1, 1].map((side) => (
            <Blob
              key={side}
              at={[side * 0.215, -0.1, 0.07]}
              size={[0.055, 0.17, 0.07]}
              rotation={[0.1, 0, side * 0.12]}
              color={hair}
            />
          ))}
          <Blob at={[-0.06, 0.17, 0.17]} size={[0.16, 0.065, 0.09]} rotation={[-0.6, 0, 0.35]} color={hair} />
        </>
      )}
    </>
  );
}

function Hat({ hat }: { hat: NonNullable<HumanLook['hat']> }) {
  const crown = (
    <mesh scale={hat.kind === 'flat-cap' ? [1.1, 0.8, 1.15] : [1.08, 0.9, 1.1]} castShadow>
      <sphereGeometry args={[0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Cloth color={hat.color} roughness={0.9} />
    </mesh>
  );
  return hat.kind === 'flat-cap' ? (
    <group position={[0, 0.09, 0.02]} rotation-x={0.12}>
      {crown}
      <mesh position={[0, 0.005, 0.23]} scale={[1, 1, 0.62]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.025, 20, 1, false, -Math.PI / 2, Math.PI]} />
        <Cloth color={shade(hat.color, 0.85)} roughness={0.9} />
      </mesh>
      <Blob at={[0, 0.226, 0]} size={0.025} color={shade(hat.color, 0.85)} />
    </group>
  ) : (
    <group position={[0, 0.06, 0]}>
      {crown}
      <mesh position={[0, 0.0, -0.22]} rotation-x={-0.12} scale={[1, 1, 0.72]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.025, 20, 1, false, Math.PI / 2, Math.PI]} />
        <Cloth color={hat.color} roughness={0.9} />
      </mesh>
      <Blob at={[0, 0.254, 0]} size={0.028} color={hat.color} />
    </group>
  );
}

/** Head, face, hair and headwear, centred on the middle of the head; the face looks down +z. */
function Head({ look }: { look: HumanLook }) {
  const { skin } = look;
  const brows = look.hair === look.skin ? shade(skin, 0.6) : shade(look.hair, 0.85);
  return (
    <>
      <mesh geometry={HEAD} rotation-y={Math.PI} castShadow>
        <Cloth color={skin} roughness={0.7} />
      </mesh>
      <Blob at={[0, -0.035, 0.246]} size={[0.03, 0.034, 0.03]} color={shade(skin, 0.94)} roughness={0.7} />
      <mesh position={[0, -0.1, 0.236]} rotation-z={Math.PI}>
        <torusGeometry args={[0.03, 0.007, 4, 10, Math.PI]} />
        <Cloth color={shade(skin, 0.45)} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Blob at={[side * 0.085, 0.0, 0.232]} size={[0.026, 0.036, 0.016]} color="#2a1d16" roughness={0.3} />
          <Blob at={[side * 0.085 + 0.009, 0.013, 0.246]} size={0.009} color="#ffffff" shadow={false} />
          <Blob
            at={[side * 0.09, 0.072, 0.232]}
            size={[0.042, 0.011, 0.012]}
            rotation={[0, 0, side * -0.12]}
            color={brows}
          />
          <Blob
            at={[side * 0.142, -0.062, 0.194]}
            size={[0.04, 0.024, 0.012]}
            rotation={[0, side * 0.6, 0]}
            color={blend(skin, '#e2725b', 0.4)}
            shadow={false}
          />
          <Blob at={[side * 0.245, -0.01, -0.01]} size={[0.028, 0.05, 0.04]} color={skin} roughness={0.7} />
          {look.glasses && (
            <mesh position={[side * 0.088, 0.003, 0.252]}>
              <torusGeometry args={[0.052, 0.009, 6, 18]} />
              <Cloth color={look.glasses} roughness={0.4} />
            </mesh>
          )}
          {look.mustache && (
            <Blob
              at={[side * 0.038, -0.07, 0.242]}
              size={[0.045, 0.022, 0.022]}
              rotation={[0, 0, side * 0.25]}
              color={look.mustache}
            />
          )}
        </group>
      ))}
      {look.glasses && (
        <mesh position={[0, 0.008, 0.258]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.007, 0.05, 2, 6]} />
          <Cloth color={look.glasses} />
        </mesh>
      )}
      <Hair look={look} />
      {look.hat && <Hat hat={look.hat} />}
      {look.headband && (
        <mesh position={[0, 0.1, 0.0]} rotation-x={Math.PI / 2 - 0.4}>
          <torusGeometry args={[0.262, 0.026, 6, 24]} />
          <Cloth color={look.headband} />
        </mesh>
      )}
      {look.sunglasses && (
        <group position={[0, 0.215, 0.165]} rotation-x={-0.75}>
          {[-1, 1].map((side) => (
            <Blob
              key={side}
              at={[side * 0.068, 0, 0]}
              size={[0.055, 0.04, 0.014]}
              color={look.sunglasses!}
              roughness={0.2}
            />
          ))}
          <Blob size={[0.03, 0.008, 0.008]} color={look.sunglasses} />
        </group>
      )}
    </>
  );
}

/** Hips, top, shirt front, tie and apron, squashed front to back together. */
function Torso({ look }: { look: HumanLook }) {
  const { apron, collar } = look;
  return (
    <group scale={[1, 1, TORSO_DEPTH]}>
      <mesh geometry={HIPS} rotation-y={Math.PI} castShadow receiveShadow>
        <Cloth color={look.trousers} />
      </mesh>
      <mesh geometry={CHEST} rotation-y={Math.PI} castShadow receiveShadow>
        <Cloth color={look.top} />
      </mesh>
      {collar && (
        <>
          {/* The open neck: a V of shirt with the collar points either side. */}
          <mesh position={[0, 1.0, 0.222]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 3]} />
            <Cloth color={collar} />
          </mesh>
          {[-1, 1].map((side) => (
            <Blob
              key={side}
              at={[side * 0.055, 1.06, 0.215]}
              size={[0.05, 0.022, 0.03]}
              rotation={[0, 0, side * -0.5]}
              color={collar}
            />
          ))}
        </>
      )}
      {look.tie && (
        <>
          <Blob at={[0, 1.0, 0.245]} size={[0.026, 0.024, 0.02]} color={look.tie} />
          <Blob at={[0, 0.88, 0.235]} size={[0.03, 0.11, 0.014]} color={look.tie} />
        </>
      )}
      {apron && (
        <>
          <mesh geometry={APRON_BIB} castShadow>
            <Cloth color={apron.color} roughness={0.9} doubleSided />
          </mesh>
          <mesh geometry={APRON_SKIRT} castShadow>
            <Cloth color={apron.color} roughness={0.9} doubleSided />
          </mesh>
          <mesh geometry={APRON_POCKET}>
            <Cloth color={shade(apron.color, 0.82)} roughness={0.9} doubleSided />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Strap
                from={[side * 0.13, 0.975, 0.2]}
                to={[side * 0.12, 1.085, 0.02]}
                radius={0.018}
                color={apron.straps}
              />
              <Strap
                from={[side * 0.12, 1.085, 0.02]}
                to={[side * 0.13, 0.9, -0.21]}
                radius={0.018}
                color={apron.straps}
              />
              <Blob at={[side * 0.13, 0.965, 0.235]} size={0.016} color="#b48a4c" roughness={0.35} shadow={false} />
            </group>
          ))}
        </>
      )}
    </group>
  );
}

/** Neck, with whatever is worn round it: a hood, a scarf or headphones. */
function Neck({ look }: { look: HumanLook }) {
  const { headphones } = look;
  return (
    <>
      <mesh position={[0, 1.16, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.068, 0.16, 12]} />
        <Cloth color={look.skin} roughness={0.7} />
      </mesh>
      {look.hood && (
        <mesh position={[0, 1.1, -0.03]} rotation-x={-Math.PI / 2} scale={[1, 0.8, 1]} castShadow>
          <torusGeometry args={[0.13, 0.065, 8, 16, Math.PI]} />
          <Cloth color={look.top} />
        </mesh>
      )}
      {look.scarf && (
        <>
          <mesh position={[0, 1.12, 0]} rotation-x={Math.PI / 2} scale={[1, 0.85, 1]} castShadow>
            <torusGeometry args={[0.095, 0.05, 8, 18]} />
            <Cloth color={look.scarf} roughness={0.95} />
          </mesh>
          <Capsule at={[0.07, 0.97, 0.2]} radius={0.035} length={0.16} rotation={[0.15, 0, 0.12]} color={look.scarf} />
        </>
      )}
      {headphones && (
        <>
          <mesh position={[0, 1.13, 0.01]} rotation-x={Math.PI / 2 - 0.3}>
            <torusGeometry args={[0.125, 0.02, 6, 18]} />
            <Cloth color={shade(headphones, 0.35)} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.115, 1.09, 0.11]} rotation-x={Math.PI / 2 - 0.4}>
              <mesh>
                <cylinderGeometry args={[0.06, 0.06, 0.045, 14]} />
                <Cloth color={headphones} roughness={0.5} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.064, 0.064, 0.02, 14]} />
                <Cloth color={shade(headphones, 0.3)} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </>
  );
}

/** Thigh, shin and a rounded shoe, swung from the hip. */
function Leg({
  look,
  side,
  hip,
  sit,
  stride,
}: {
  look: HumanLook;
  side: number;
  hip: number;
  sit: number;
  stride: number;
}) {
  return (
    <group position={[side * 0.1, hip, 0]} rotation-x={(-sit * Math.PI) / 2 + stride * side * 0.5 * (1 - sit)}>
      <Capsule at={[0, -0.125, 0]} radius={0.085} length={0.2} color={look.trousers} />
      <group position={[0, -0.25, 0]} rotation-x={(sit * Math.PI) / 2 + Math.max(0, -stride * side) * 0.35 * (1 - sit)}>
        <Capsule at={[0, -0.09, 0]} radius={0.072} length={0.16} color={look.trousers} />
        <mesh position={[0, -0.248, 0.04]} scale={[0.088, 0.1, 0.15]} castShadow>
          <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Cloth color={look.shoes} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.25, 0.04]} scale={[0.092, 0.012, 0.155]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <Cloth color={shade(look.shoes, 0.55)} />
        </mesh>
      </group>
    </group>
  );
}

/** A person from the cast, posed for walking, sitting and sipping; the face points down +z. */
export function HumanModel({
  look,
  sit = 0,
  stride = 0,
  sip = 0,
  drinking = false,
  tea = false,
  paper = false,
  held = [],
  reach = 0,
  legsRef,
}: {
  look: HumanLook;
  sit?: number;
  stride?: number;
  sip?: number;
  drinking?: boolean;
  tea?: boolean;
  paper?: boolean;
  /** What a crew stand-in carries: one item per hand. */
  held?: readonly Cargo[];
  reach?: number;
  /** The group holding both legs, for walkers that swing them every frame without re-rendering. */
  legsRef?: Ref<Group>;
}) {
  const lift = sit * 0.26;
  const hip = 0.51 + sit * 0.21;
  const scale = look.scale ?? 1;
  const drink = sipCup(sit, sip, tea);
  const arms = [-1, 1].map((side) =>
    humanArmPose(side, {
      carrying: itemsForHand(held, side).length > 0,
      scale,
      reach,
      sit,
      stride,
      drink: drinking ? drink.handle : undefined,
    }),
  );
  return (
    <group scale={scale}>
      <group position={[0, lift, 0]}>
        <Torso look={look} />
        <Neck look={look} />
      </group>
      <group position={[0, 1.37 + lift, 0]} rotation-x={-sip * 0.1}>
        <Head look={look} />
      </group>
      <group ref={legsRef}>
        {[-1, 1].map((side) => (
          <Leg key={side} look={look} side={side} hip={hip} sit={sit} stride={stride} />
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Arm look={look} side={side} pose={arms[side === 1 ? 1 : 0]} lift={lift} />
          {itemsForHand(held, side).map((cargo, i) => {
            const [x, y, z] = arms[side === 1 ? 1 : 0].hand;
            return <HeldItem key={cargo.ticketId} cargo={cargo} at={[x, y + lift + ARM.hand, z + i * 0.3]} />;
          })}
        </group>
      ))}
      {drinking && (
        <group position={[drink.at[0], drink.at[1] + lift, drink.at[2]]} rotation-x={drink.tilt} scale={DRINK_SCALE}>
          <Cup tea={tea} paper={paper} lid={paper} />
        </group>
      )}
    </group>
  );
}

/** Rounded shoulder, sleeve and mitten hand, posed by the shared two-bone arm. */
function Arm({ look, side, pose, lift }: { look: HumanLook; side: number; pose: ArmPose; lift: number }) {
  return (
    <group position={[side * ARM.shoulderX, ARM.shoulderY + lift, 0]} quaternion={pose.upper}>
      <Blob size={0.074} color={look.top} />
      <Capsule at={[0, -ARM.upper / 2, 0]} radius={0.064} length={ARM.upper} color={look.top} />
      <group position={[0, -ARM.upper, 0]} quaternion={pose.lower}>
        <Capsule at={[0, -ARM.lower / 2 + 0.01, 0]} radius={0.057} length={ARM.lower - 0.06} color={look.top} />
        <Blob
          at={[0, -ARM.lower, 0]}
          size={[ARM.hand, ARM.hand * 1.1, ARM.hand * 0.85]}
          color={look.skin}
          roughness={0.7}
        />
      </group>
    </group>
  );
}
