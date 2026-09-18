import { RoundedBox } from '@react-three/drei';
import { Box, Cylinder } from './primitives';

/** Shared robot silhouette for the café and direction selector. */
export function RobotModel({color="#80a889",stride=0,reach=0}:{color?:string;stride?:number;reach?:number}){return <><RoundedBox args={[.62,.55,.46]} radius={.09} position={[0,.74,0]} castShadow><meshStandardMaterial color={color}/></RoundedBox><RoundedBox args={[.75,.55,.57]} radius={.1} position={[0,1.29,0]} castShadow><meshStandardMaterial color="#f1dfb5"/></RoundedBox><Box at={[0,1.3,.29]} size={[.58,.28,.04]} color="#263f37"/>{[-.16,.16].map(x=><Box key={x} at={[x,1.32,.32]} size={[.07,.08,.025]} color="#b6e4bc"/>)}<Cylinder at={[0,1.69,0]} size={[.025,.025,.25]} color="#728774"/><mesh position={[0,1.84,0]}><sphereGeometry args={[.075,8,6]}/><meshStandardMaterial color="#e1a251"/></mesh><Box at={[0,.93,.25]} size={[.25,.08,.02]} color="#f1db9f"/>{[-1,1].map(side => <group key={side}>
 <group position={[side*.17,.44,0]} rotation-x={stride*side*.45}>
  <Box at={[0,-.21,0]} size={[.17,.4,.19]} color="#4b5543"/>
  <Box at={[side*.01,-.37,.09]} size={[.23,.14,.35]} color="#394538"/>
 </group>
 <group position={[side*.4,1,0]} rotation-x={-stride*side*.35-reach*1.15}><Box at={[0,-.22,0]} size={[.14,.44,.17]} color={color}/></group>
 </group>)}</>;}

