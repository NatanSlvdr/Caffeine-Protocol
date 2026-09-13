import type { StationId } from '../domain/layout';
import { RoundedBox } from '@react-three/drei';

export type Vec3=[number,number,number];
/** Quiet café materials; saturated command colors belong to the editor. */
export const CAFE_COLORS={walnut:'#70503d',sand:'#e6d8bf',clay:'#aa7965',sage:'#9aa88f',cream:'#f5eee0',charcoal:'#393b36',wall:'#78968c'} as const;
/** Soft edges keep the modern furniture simple and approachable. */
export function SoftBox({at=[0,0,0],size,color,radius=.08}:{at?:Vec3;size:Vec3;color:string;radius?:number}){
 return <RoundedBox position={at} args={size} radius={Math.min(radius,...size.map(n=>n/2-.001))} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.48}/></RoundedBox>;
}
export function Box({at=[0,0,0],size=[1,1,1],color='#d8b38b',rotation=0}:{at?:Vec3;size?:Vec3;color?:string;rotation?:number}){return <mesh position={at} rotation-y={rotation} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.82}/></mesh>;}
export function Cylinder({at,size=[.3,.3,1],color='#d3b690'}:{at:Vec3;size?:Vec3;color?:string}){return <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[...size,12]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
export function Cup({at=[0,0,0],tea=false}:{at?:Vec3;tea?:boolean}){return <group position={at}><Cylinder at={[0,.025,0]} size={[.24,.24,.045]} color="#ece3ce"/><Cylinder at={[0,.15,0]} size={[.16,.13,.24]} color="#f9ebd2"/><mesh position={[0,.279,0]} rotation-x={Math.PI/2}><torusGeometry args={[.145,.018,5,16]}/><meshStandardMaterial color="#fff3d9" roughness={.35}/></mesh><Cylinder at={[0,.277,0]} size={[.13,.13,.012]} color={tea?'#af8045':'#573528'}/><mesh position={[.17,.16,0]} rotation-x={Math.PI/2}><torusGeometry args={[.09,.027,5,10]}/><meshStandardMaterial color="#f9ebd2"/></mesh></group>;}

const STEEL = '#c1cfcc';
const DARK = '#304941';

/** Each appliance fits its existing station tile, with controls facing the room. */
export function Appliance({ id }: { id: StationId }) {
  switch (id) {
    case 'brewer':
    case 'grinder': return <group>
      <SoftBox at={[0,1.48,-.12]} size={[.8,.74,.55]} radius={.12} color={CAFE_COLORS.clay}/>
      <SoftBox at={[0,1.49,.165]} size={[.56,.46,.025]} radius={.01} color={CAFE_COLORS.charcoal}/>
      <Box at={[.19,1.65,.185]} size={[.12,.07,.018]} color="#9bb9b0"/>
      <Box at={[0,1.43,.25]} size={[.2,.07,.16]} color={STEEL}/>
      <SoftBox at={[0,1.14,.12]} size={[.8,.07,.72]} radius={.034} color={CAFE_COLORS.clay}/>
      <Cylinder at={[0,1.93,-.12]} size={[.2,.2,.18]} color="#665448"/>
      <Cylinder at={[0,2.03,-.12]} size={[.21,.21,.025]} color="#465051"/>
    </group>;
    case 'water': return <group>
      <Box at={[0,1.12,0]} size={[.9,.055,.85]} color={STEEL}/>
      <Box at={[0,1.155,.04]} size={[.7,.025,.57]} color="#406b70"/>
      {[-.39,.39].map(x=><Box key={x} at={[x,1.18,.04]} size={[.08,.08,.7]} color={STEEL}/>)}
      {[-.27,.35].map(z=><Box key={z} at={[0,1.18,z]} size={[.72,.08,.08]} color={STEEL}/>)}
      <Cylinder at={[0,1.4,-.29]} size={[.035,.045,.55]} color={STEEL}/>
      <Box at={[0,1.68,-.1]} size={[.075,.075,.4]} color={STEEL}/>
      <Cylinder at={[0,1.61,.08]} size={[.045,.045,.15]} color={STEEL}/>
      {[-.22,.22].map(x=><group key={x}><Cylinder at={[x,1.24,-.3]} size={[.07,.07,.1]} color={STEEL}/><Box at={[x,1.3,-.3]} size={[.15,.035,.04]} color={x<0?'#bb6850':'#649fb8'}/></group>)}
      <Cylinder at={[0,1.174,.08]} size={[.07,.07,.012]} color={DARK}/>
    </group>;
    case 'ingredients': return <group>
      <Fridge/>
      <HighShelf/>
    </group>;
    case 'sugar': return <group>
      <Cylinder at={[0,1.32,0]} size={[.2,.2,.42]} color={CAFE_COLORS.sage}/>
      <Cylinder at={[0,1.54,0]} size={[.21,.21,.025]} color={CAFE_COLORS.walnut}/>
      <Box at={[0,1.33,.2]} size={[.17,.08,.012]} color="#c98270"/>
    </group>;
    case 'pickup': return <SoftBox at={[0,1.12,0]} size={[.86,.035,.78]} radius={.016} color={CAFE_COLORS.clay}/>;
    case 'returns': return null;
    case 'dock': return <group>
      <Box at={[.32,.16,0]} size={[.3,.3,.9]} color="#466d62"/>
      <Box at={[.49,.25,0]} size={[.03,.12,.65]} color="#96df98"/>
      {[-.27,.27].map(z=><Box key={z} at={[.12,.08,z]} size={[.14,.07,.12]} color="#d8b875"/>)}
      {[-.2,0,.2].map(z=><Box key={z} at={[.32,.32,z]} size={[.16,.025,.04]} color={DARK}/>)}
    </group>;
    case 'orders': return <group>
      <Box at={[0,1.13,0]} size={[.45,.045,.4]} color="#465051"/>
      <Box at={[0,1.3,-.07]} size={[.08,.3,.08]} color="#465051"/>
      <SoftBox at={[0,1.51,-.07]} size={[.63,.4,.075]} radius={.035} color={CAFE_COLORS.clay}/>
      <Box at={[0,1.51,-.025]} size={[.51,.28,.012]} color={CAFE_COLORS.sage}/>
    </group>;
  }
}

/** Compact cold storage beside the ingredient cabinet, opening toward the prep aisle. */
export function Fridge(){return <group>
 <Box at={[0,1,-.4]} size={[.94,1.9,.06]} color="#d8e0dc"/>
 {[-.44,.44].map(x=><Box key={x} at={[x,1,0]} size={[.06,1.9,.86]} color="#d8e0dc"/>)}
 {[.1,.65,1.2,1.85].map(y=><Box key={y} at={[0,y,0]} size={[.84,.045,.78]} color="#c1cfcc"/>)}
 {[.3,.85,1.4].flatMap(y=>[-.25,0,.25].map(x=><group key={`${x}-${y}`}>
  <Cylinder at={[x,y,0]} size={[.08,.09,.3]} color="#edf2dc"/>
  <Cylinder at={[x,y+.17,0]} size={[.05,.05,.05]} color="#83a9a0"/>
 </group>))}
 <mesh position={[0,1,.44]}><boxGeometry args={[.82,1.73,.025]}/><meshStandardMaterial color="#bce2dc" transparent opacity={.18} depthWrite={false} roughness={.12} metalness={.15}/></mesh>
 {[-.42,.42].map(x=><Box key={x} at={[x,1,.46]} size={[.05,1.83,.045]} color="#496267"/>)}
 <Box at={[.31,1.1,.5]} size={[.045,.5,.07]} color="#334c50"/>
 <Box at={[0,1.95,0]} size={[.98,.06,.9]} color="#496267"/>
</group>;}

/** A full-height open shelf stands beside the fridge and matches its silhouette. */
export function HighShelf(){return <group>
 {['left','right'].map((side,i)=><Box key={side} at={[.57+i*.86,1,-.02]} size={[.07,2,.74]} color="#355358"/>)}
 {[.08,.7,1.32,1.94].map(y=><Box key={y} at={[1,y,-.02]} size={[.92,.07,.78]} color="#b68b69"/>)}
 {[.34,.96,1.58].flatMap((y,row)=>[-.28,0,.28].flatMap((offset,column)=>[-.2,.2].map(z=><group key={`${y}-${offset}-${z}`} position={[1+offset,y,z]}>
  {row===1?<Cylinder at={[0,0,0]} size={[.115,.115,.4]} color="#b8c398"/>:<Box size={[.24,.4,.3]} color={['#80523b','#75a45c','#ddc49c','#668e83'][(row+column)%4]}/>}
  <Box at={[0,0,.16]} size={[.16,.1,.015]} color="#f0e8d6"/>
 </group>)))}
</group>;}

/** Both robots can reach this open ticket tray from their own side of the divider. */
export function TicketTray(){return <group>
 <Box at={[0,1.12,0]} size={[.85,.045,.8]} color="#eee9df"/>
 {[-.37,.37].map(z=><Box key={z} at={[0,1.17,z]} size={[.85,.075,.045]} color="#9bb9b0"/>)}
 <Box at={[-.26,1.15,0]} size={[.1,.035,.55]} color="#334e53"/>
</group>;}
