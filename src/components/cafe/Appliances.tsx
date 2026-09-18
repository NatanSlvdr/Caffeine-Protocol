import type { StationId } from '@/domain';
import { Box, Cylinder, SoftBox, CAFE_COLORS } from './primitives';
import { Cup } from './Cup';

const STEEL = '#c1cfcc';
const DARK = '#304941';

/** Recognizable workstation silhouettes: a two-group espresso machine and a full cash register. */
export function Appliance({ id }: { id: StationId }) {
  switch (id) {
    case 'brewer':
    case 'grinder': return <group>
      <SoftBox at={[0,1.58,-.14]} size={[1.65,.82,.58]} radius={.1} color={CAFE_COLORS.charcoal}/>
      <SoftBox at={[0,1.67,.17]} size={[1.49,.42,.08]} radius={.03} color={STEEL}/>
      <SoftBox at={[0,1.15,.1]} size={[1.76,.1,.9]} radius={.035} color={STEEL}/>
      {[-.65,-.52,-.39,-.26,-.13,0,.13,.26,.39,.52,.65].map(x=><Box key={x} at={[x,1.207,.22]} size={[.025,.012,.52]} color={CAFE_COLORS.charcoal}/>)}
      {[-.4,.4].map(x=><group key={x}>
        <Cylinder at={[x,1.46,.25]} size={[.13,.13,.13]} color={STEEL}/>
        <Box at={[x,1.43,.4]} size={[.075,.07,.32]} color={CAFE_COLORS.walnut}/>
        {[-.085,0,.085].map(dx=><Box key={dx} at={[x+dx,1.74,.22]} size={[.045,.055,.02]} color={dx===0?'#9fc4b0':CAFE_COLORS.charcoal}/>)}
        <Cup at={[x,2.015,-.13]}/>
      </group>)}
      {[-.72,.72].map(x=><group key={x}>
        <Cylinder at={[x,1.7,.22]} size={[.065,.065,.07]} color={CAFE_COLORS.charcoal}/>
        <Box at={[x,1.47,.29]} size={[.025,.32,.025]} color={STEEL}/>
        <Box at={[x,1.3,.35]} size={[.025,.025,.14]} color={STEEL}/>
      </group>)}
      <mesh position={[0,1.75,.221]} rotation-x={Math.PI/2}><cylinderGeometry args={[.085,.085,.015,24]}/><meshStandardMaterial color={CAFE_COLORS.cream}/></mesh>
      <Box at={[.014,1.766,.235]} size={[.015,.06,.012]} color={CAFE_COLORS.charcoal}/>
      <Box at={[0,2.015,-.14]} size={[1.61,.045,.53]} color={STEEL}/>
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
    case 'orders': return <group>
      <SoftBox at={[0,1.23,0]} size={[.85,.25,.72]} radius={.04} color={CAFE_COLORS.charcoal}/>
      <Box at={[0,1.23,.368]} size={[.7,.13,.02]} color={STEEL}/>
      <Box at={[0,1.24,.39]} size={[.25,.035,.025]} color={CAFE_COLORS.charcoal}/>
      <SoftBox at={[0,1.46,-.13]} size={[.79,.28,.43]} radius={.05} color={CAFE_COLORS.cream}/>
      <group position={[.1,1.57,.12]} rotation-x={-.28}>
        <Box size={[.47,.06,.28]} color={CAFE_COLORS.charcoal}/>
        {[0,1,2].flatMap(row=>[0,1,2,3].map(col=><Box key={row*4+col} at={[-.17+col*.11,.041,-.09+row*.085]} size={[.078,.03,.056]} color={col===3?CAFE_COLORS.sage:CAFE_COLORS.cream}/>))}
      </group>
      <Box at={[-.27,1.58,.1]} size={[.12,.025,.24]} color={CAFE_COLORS.charcoal}/>
      <Box at={[-.27,1.7,.09]} size={[.1,.22,.014]} color="#fffaf0"/>
      {[0,1,2].map(i=><Box key={i} at={[-.27,1.67+i*.035,.101]} size={[.06,.008,.007]} color={CAFE_COLORS.charcoal}/>)}
      <Box at={[0,1.75,-.23]} size={[.07,.3,.07]} color={CAFE_COLORS.charcoal}/>
      <SoftBox at={[0,1.9,-.23]} size={[.64,.26,.13]} radius={.025} color={CAFE_COLORS.charcoal}/>
      <Box at={[0,1.9,-.155]} size={[.52,.16,.012]} color="#a9c7a3"/>
      {[-.12,0,.12].map(x=><group key={x}>{[-.045,.045].map(y=><Box key={y} at={[x,1.9+y,-.144]} size={[.065,.012,.01]} color="#365547"/>)}<Box at={[x+.03,1.9,-.144]} size={[.012,.1,.01]} color="#365547"/></group>)}
    </group>;
  }
}

/** Compact cold storage beside the ingredient cabinet, opening toward the prep aisle. */
function Fridge(){return <group>
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
function HighShelf(){return <group>
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

