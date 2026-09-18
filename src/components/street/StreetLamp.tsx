import { Cylinder, SoftBox, CAFE_COLORS } from '../cafe/primitives';

export function StreetLamp({ z, evening }: { z: number; evening: boolean }) {
  return <group position={[-11.2, 0, z]}>
    <Cylinder at={[0, .07, 0]} size={[.2, .23, .13]} color={CAFE_COLORS.charcoal}/>
    <Cylinder at={[0, 1.5, 0]} size={[.055, .07, 3]} color={CAFE_COLORS.walnut}/>
    <SoftBox at={[.2, 3, 0]} size={[.58, .12, .34]} radius={.055} color={CAFE_COLORS.walnut}/>
    <mesh position={[.24, 2.925, 0]}><boxGeometry args={[.38, .035, .24]}/><meshStandardMaterial color="#fff1c5" emissive="#ffc66a" emissiveIntensity={evening ? 2 : .15}/></mesh>
  </group>;
}

