import type { StationId } from '../domain/layout';

export type Vec3=[number,number,number];
export function Box({at=[0,0,0],size=[1,1,1],color='#d8b38b',rotation=0}:{at?:Vec3;size?:Vec3;color?:string;rotation?:number}){return <mesh position={at} rotation-y={rotation} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.82}/></mesh>;}
export function Cylinder({at,size=[.3,.3,1],color='#d3b690'}:{at:Vec3;size?:Vec3;color?:string}){return <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[...size,12]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
export function Cup({at=[0,0,0],tea=false}:{at?:Vec3;tea?:boolean}){return <group position={at}><Cylinder at={[0,.025,0]} size={[.24,.24,.045]} color="#ece3ce"/><Cylinder at={[0,.15,0]} size={[.16,.13,.24]} color="#f9ebd2"/><mesh position={[0,.279,0]} rotation-x={Math.PI/2}><torusGeometry args={[.145,.018,5,16]}/><meshStandardMaterial color="#fff3d9" roughness={.35}/></mesh><Cylinder at={[0,.277,0]} size={[.13,.13,.012]} color={tea?'#af8045':'#573528'}/><mesh position={[.17,.16,0]} rotation-x={Math.PI/2}><torusGeometry args={[.09,.027,5,10]}/><meshStandardMaterial color="#f9ebd2"/></mesh></group>;}

const STEEL = '#c1cfcc';
const DARK = '#304941';

/** Small metal fittings catch light without smoothing away the pixel silhouettes. */
function Fitting({ at, radius = .06, depth = .06, color = STEEL }: { at: Vec3; radius?: number; depth?: number; color?: string }) {
  return <mesh position={at} rotation-x={Math.PI / 2} castShadow>
    <cylinderGeometry args={[radius, radius, depth, 12]}/>
    <meshStandardMaterial color={color} metalness={.65} roughness={.3}/>
  </mesh>;
}

/** Each appliance fits its existing station tile, with controls facing the room. */
export function Appliance({ id }: { id: StationId }) {
  switch (id) {
    case 'brewer': return <group>
      <Box at={[0,1.14,0]} size={[.94,.1,.88]} color={DARK}/>
      <Box at={[0,1.51,-.22]} size={[.88,.66,.4]} color="#ece7dc"/>
      {[-.4,.4].map(x=><Box key={x} at={[x,1.45,.03]} size={[.09,.55,.65]} color="#35575b"/>)}
      <Box at={[0,1.71,.05]} size={[.74,.18,.1]} color={STEEL}/>
      <Fitting at={[-.22,1.72,.12]} radius={.075} color="#f4e9ce"/>
      <Box at={[-.22,1.74,.16]} size={[.025,.055,.015]} rotation={-.35} color={DARK}/>
      {[-.02,.13,.27].map((x,i)=><Fitting key={x} at={[x,1.72,.12]} radius={.035} color={i===0?'#d9e8a2':DARK}/>)}
      <Cylinder at={[0,1.55,.15]} size={[.13,.11,.12]} color={STEEL}/>
      <Box at={[0,1.52,.3]} size={[.08,.07,.3]} color={DARK}/>
      {[-.07,.07].map(x=><Cylinder key={x} at={[x,1.45,.15]} size={[.025,.025,.1]} color={STEEL}/>)}
      <Box at={[0,1.21,.2]} size={[.68,.045,.44]} color={STEEL}/>
      {[-.24,-.12,0,.12,.24].map(x=><Box key={x} at={[x,1.237,.2]} size={[.035,.012,.32]} color={DARK}/>)}
      <group position={[0,1.24,.18]} scale={.65}><Cup/></group>
      <Cylinder at={[.32,1.43,.28]} size={[.025,.025,.32]} color={STEEL}/>
      <Box at={[.27,1.28,.28]} size={[.12,.04,.04]} color={STEEL}/>
      <Box at={[0,1.86,-.18]} size={[.82,.06,.48]} color={STEEL}/>
      {[-.22,.2].map(x=><group key={x} position={[x,1.9,-.18]} scale={.55}><Cup/></group>)}
    </group>;
    case 'grinder': return <group>
      <Box at={[0,1.14,.03]} size={[.7,.08,.76]} color={DARK}/>
      <Box at={[0,1.4,-.12]} size={[.46,.49,.43]} color="#44676b"/>
      <Cylinder at={[0,1.78,-.12]} size={[.27,.12,.35]} color="#624737"/>
      <Cylinder at={[0,1.97,-.12]} size={[.29,.29,.055]} color={DARK}/>
      <Cylinder at={[0,2.025,-.12]} size={[.065,.065,.06]} color="#bb9a65"/>
      <Box at={[0,1.64,-.12]} size={[.53,.065,.5]} color={STEEL}/>
      <Box at={[0,1.49,.16]} size={[.19,.13,.2]} color={STEEL}/>
      <Box at={[0,1.42,.23]} size={[.13,.08,.08]} color={DARK}/>
      <Cylinder at={[0,1.27,.24]} size={[.14,.11,.16]} color="#e1c597"/>
      <Fitting at={[.15,1.35,.115]} radius={.05} color={DARK}/>
      {[-.12,0,.12].map(x=><Box key={x} at={[x,1.53,-.341]} size={[.035,.12,.018]} color={DARK}/>)}
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
      <Box at={[0,1.14,0]} size={[.92,.07,.64]} color="#8b6545"/>
      {[-.24,.24].map(x=><group key={x}>
        <Cylinder at={[x,1.44,0]} size={[.19,.19,.52]} color={x<0?'#80523b':'#75a45c'}/>
        <Cylinder at={[x,1.71,0]} size={[.21,.21,.06]} color="#dfbe82"/>
        <Cylinder at={[x,1.77,0]} size={[.065,.065,.06]} color="#856c46"/>
        <Box at={[x,1.44,.195]} size={[.23,.21,.018]} color="#f0e2bd"/>
        {[1.4,1.47].map(y=><Box key={y} at={[x,y,.209]} size={[.13,.022,.01]} color={x<0?'#80523b':'#60814c'}/>)}
      </group>)}
    </group>;
    case 'sugar': return <group>
      <Cylinder at={[0,1.39,0]} size={[.29,.25,.56]} color="#f4e9d0"/>
      <Cylinder at={[0,1.68,0]} size={[.31,.31,.07]} color="#bd9b62"/>
      <Cylinder at={[0,1.75,0]} size={[.08,.08,.08]} color="#9d7745"/>
      <Box at={[0,1.43,.285]} size={[.29,.17,.025]} color="#d0ad79"/>
      <Box at={[0,1.43,.302]} size={[.15,.035,.012]} color="#fff0d0"/>
      <Box at={[.31,1.14,.06]} size={[.055,.035,.48]} rotation={-.2} color={STEEL}/>
      <Cylinder at={[.35,1.15,.28]} size={[.08,.08,.025]} color={STEEL}/>
    </group>;
    case 'pickup': return <group>
      <Box at={[0,1.12,0]} size={[.9,.08,.85]} color="#edb548"/>
      {[-.42,.42].map(x=><Box key={x} at={[x,1.18,0]} size={[.055,.08,.8]} color="#b77d2c"/>)}
      <Box at={[0,1.2,-.38]} size={[.9,.12,.07]} color="#b77d2c"/>
      {[-.23,.23].map(x=><Box key={x} at={[x,1.167,0]} size={[.33,.012,.45]} color="#f3d887"/>)}
    </group>;
    case 'returns': return <group>
      <Box at={[0,1.14,0]} size={[.9,.08,.85]} color="#657e99"/>
      {[-.42,.42].map(x=><Box key={x} at={[x,1.27,0]} size={[.06,.22,.85]} color="#7994b0"/>)}
      {[-.39,.39].map(z=><Box key={z} at={[0,1.27,z]} size={[.85,.22,.06]} color="#7994b0"/>)}
      {[-.24,0,.24].map(x=><Box key={x} at={[x,1.19,0]} size={[.035,.035,.7]} color="#aec0c7"/>)}
      {[0,1,2].map(i=><Cylinder key={i} at={[-.2,1.2+i*.035,0]} size={[.2,.2,.025]} color="#e5dfce"/>)}
      <group position={[.21,1.2,.05]} scale={.75}><Cup/></group>
    </group>;
    case 'dock': return <group>
      <Box at={[.32,.16,0]} size={[.3,.3,.9]} color="#466d62"/>
      <Box at={[.49,.25,0]} size={[.03,.12,.65]} color="#96df98"/>
      {[-.27,.27].map(z=><Box key={z} at={[.12,.08,z]} size={[.14,.07,.12]} color="#d8b875"/>)}
      {[-.2,0,.2].map(z=><Box key={z} at={[.32,.32,z]} size={[.16,.025,.04]} color={DARK}/>)}
    </group>;
    case 'orders': return <group>
      <Box at={[0,1.15,0]} size={[.72,.1,.64]} color={DARK}/>
      <Box at={[0,1.35,-.12]} size={[.6,.35,.29]} color="#496a65"/>
      <Box at={[0,1.41,.038]} size={[.49,.2,.03]} color={DARK}/>
      <Box at={[0,1.41,.058]} size={[.42,.14,.015]} color="#99d9c0"/>
      {[-.13,0,.13].flatMap(x=>[.18,.29].map(z=><Box key={`${x}-${z}`} at={[x,1.22,z]} size={[.085,.035,.065]} color="#e4ca83"/>))}
      <Box at={[.24,1.25,.19]} size={[.1,.07,.22]} color="#cb7953"/>
      <Box at={[0,1.56,-.11]} size={[.28,.035,.13]} color={DARK}/>
      <Box at={[0,1.59,-.11]} size={[.23,.045,.11]} color="#f4e9d0"/>
    </group>;
  }
}

/** Compact cold storage beside the ingredient cabinet, opening toward the prep aisle. */
export function Fridge(){return <group>
 <Box at={[0,.97,0]} size={[.94,1.9,.86]} color="#d8e0dc"/>
 <Box at={[0,1.22,-.445]} size={[.85,1.28,.055]} color="#b8cbc7"/>
 <Box at={[0,.31,-.445]} size={[.85,.44,.055]} color="#9cafac"/>
 <Box at={[.31,1.2,-.5]} size={[.045,.45,.07]} color="#334c50"/>
 <Box at={[.31,.32,-.5]} size={[.045,.21,.07]} color="#334c50"/>
 <Box at={[0,1.76,-.48]} size={[.28,.09,.018]} color="#29474c"/>
 <Box at={[.06,1.76,-.495]} size={[.1,.035,.012]} color="#a9dfbf"/>
 {[1.35,1.55,1.75].map(y=><Box key={y} at={[0,y,.44]} size={[.55,.035,.025]} color="#93a7a4"/>)}
 <Box at={[0,1.95,0]} size={[.98,.06,.9]} color="#496267"/>
</group>;}

/** Open, shallow pantry shelves keep the beans, tea and sugar together. */
export function DryStorage(){return <group>
 {[-.43,1.43].map(x=><Box key={x} at={[x,1.62,-.3]} size={[.07,1.04,.35]} color="#355358"/>)}
 {[1.84,2.12].map(y=><group key={y}>
  <Box at={[.5,y,-.3]} size={[1.94,.06,.36]} color="#b68b69"/>
  {[-.22,.12,.46,.8,1.14].map((x,i)=><group key={x}>
   <Box at={[x,y+.12,-.3]} size={[.22,.18,.2]} color={['#ddc49c','#b97e5e','#668e83'][i%3]}/>
   <Box at={[x,y+.12,-.185]} size={[.12,.065,.012]} color="#f0e8d6"/>
  </group>)}
 </group>)}
</group>;}

/** Both robots can reach this open ticket tray from their own side of the divider. */
export function TicketTray(){return <group>
 <Box at={[0,1.12,0]} size={[.85,.045,.8]} color="#c4ad7e"/>
 {[-.37,.37].map(z=><Box key={z} at={[0,1.17,z]} size={[.85,.075,.045]} color="#7d6e4d"/>)}
 <Box at={[-.26,1.15,0]} size={[.1,.035,.55]} color="#334e53"/>
</group>;}
