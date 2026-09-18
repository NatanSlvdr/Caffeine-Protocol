import { Box, Cylinder } from './primitives';
import type { Vec3 } from './primitives';

/** Coffee uses a low ivory cup; tea uses a tall green mug with a hanging tea tag. */
export function Cup({at=[0,0,0],tea=false}:{at?:Vec3;tea?:boolean}){
 const color=tea?'#5d9977':'#f9ebd2',height=tea?.36:.22,radius=tea?.145:.19;
 return <group position={at}>
  {!tea&&<Cylinder at={[0,.025,0]} size={[.28,.28,.045]} color="#ece3ce"/>}
  <Cylinder at={[0,height/2+.05,0]} size={[radius,radius*.8,height]} color={color}/>
  <Cylinder at={[0,height+.052,0]} size={[radius*.86,radius*.86,.012]} color={tea?'#c88a32':'#573528'}/>
  <mesh position={[0,height+.055,0]} rotation-x={Math.PI/2}><torusGeometry args={[radius*.94,.016,8,32]}/><meshStandardMaterial color={color}/></mesh>
  <mesh position={[radius+.04,height*.6,0]} rotation-x={Math.PI/2}><torusGeometry args={[.085,.027,8,20]}/><meshStandardMaterial color={color}/></mesh>
  {tea&&<><Box at={[-.045,height-.005,radius+.006]} size={[.008,.13,.008]} color="#fff4cf"/><Box at={[-.045,height-.09,radius+.015]} size={[.085,.075,.015]} color="#f5d275"/></>}
 </group>;
}

