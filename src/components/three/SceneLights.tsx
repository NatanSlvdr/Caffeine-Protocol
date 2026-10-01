import { DoubleSide } from 'three';
import { CAFE_COLORS } from '../cafe/primitives';
import { LAMP_REACH, LAMP_WARM, LIGHT_POOLS, TABLE_CANDLES, WALL_SCONCES, lightMood } from './lightMoods';

const BRASS = '#b48a4c';

/** Shared café lighting: sky fill, ground bounce and a shadow-casting key; lamps take over in the evening. */
export function SceneLights({ evening }: { evening: boolean }) {
  const mood = lightMood(evening);
  return (
    <>
      <ambientLight intensity={mood.ambient.intensity} color={mood.ambient.color} />
      <hemisphereLight args={[mood.hemisphere.sky, mood.hemisphere.ground, mood.hemisphere.intensity]} />
      <directionalLight
        position={mood.key.position}
        intensity={mood.key.intensity}
        color={mood.key.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-normalBias={0.04}
      />
      {evening &&
        [
          ...LIGHT_POOLS,
          ...WALL_SCONCES.map((at) => ({ at: [at[0], at[1], at[2] + 0.4] as typeof at, intensity: 4 })),
        ].map(({ at, intensity }) => (
          <pointLight
            key={at.join()}
            position={at}
            color={LAMP_WARM}
            intensity={intensity}
            distance={LAMP_REACH}
            decay={2}
          />
        ))}
      {WALL_SCONCES.map((at) => (
        <WallSconce key={at.join()} at={at} lit={evening} />
      ))}
      {TABLE_CANDLES.map((at) => (
        <TableCandle key={at.join()} at={at} lit={evening} />
      ))}
    </>
  );
}

/** A brass wall plate and arm holding a cream glass shade that glows once the lamps are on. */
function WallSconce({ at, lit }: { at: readonly [number, number, number]; lit: boolean }) {
  return (
    <group position={[...at]}>
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[0.16, 0.3, 0.04]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.02, 0.14]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0.26]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.2, 16, 1, true]} />
        <meshStandardMaterial
          color={CAFE_COLORS.cream}
          emissive={LAMP_WARM}
          emissiveIntensity={lit ? 1.4 : 0}
          roughness={0.5}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** An amber candle jar; its flame only shows in the evening. */
function TableCandle({ at, lit }: { at: readonly [number, number, number]; lit: boolean }) {
  return (
    <group position={[...at]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.05, 0.1, 12]} />
        <meshStandardMaterial color="#c98a4a" emissive={LAMP_WARM} emissiveIntensity={lit ? 0.9 : 0} roughness={0.25} />
      </mesh>
      {lit && (
        <mesh position={[0, 0.125, 0]}>
          <coneGeometry args={[0.018, 0.05, 6]} />
          <meshBasicMaterial color="#ffe3a6" />
        </mesh>
      )}
    </group>
  );
}
