import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera } from '@react-three/drei';
import { CanvasTexture, Group, SRGBColorSpace } from 'three';
import { PixelArtEffect } from './PixelArtEffect';
import { Street, StreetClip } from './Street';
import { OrderQueueBubble } from './OrderQueueBubble';
import { CustomerSpeech } from './CustomerSpeech';
import { RobotHolding } from './RobotHolding';
import { CafeFloor } from './CafeFloor';
import { Appliance, Box, Cylinder, Cup, TicketTray, SoftBox, RobotModel, CAFE_COLORS } from './CafeModels';
import type { Vec3 } from './CafeModels';
import type { StationId } from '../domain/layout';
import type { ActorId, ActorSnapshot, RobotRole, RunResult } from '../domain/types';
import { sampleReplay } from '../domain/replay';
import { cameraZoom, TABLE_LAYOUT, FURNITURE, STATIONS, STARTS, CAMERA_POSITION, CAMERA_TARGET, CAMERA_ELEVATION, ENTRANCE, STAFF_ENTRY, ROOM, tableSeat } from '../domain/layout';
import type { Point } from '../domain/layout';

function Plant({at,scale=1}:{at:Vec3;scale?:number}){return <group position={at} scale={scale}><Cylinder at={[0,.32,0]} size={[.35,.25,.62]} color="#c26b50"/><Cylinder at={[0,.65,0]} size={[.29,.29,.04]} color="#514439"/><Cylinder at={[0,1.08,0]} size={[.035,.045,.9]} color="#5f6c43"/>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.26,.9+i*.11,Math.cos(i*2.4)*.24]} rotation={[i*.2,i*2.4,.6]} scale={[.22,.55,.11]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#6a895b':'#93a86d'}/></mesh>)}</group>;}
/** Clay upholstery and walnut legs add a restrained accent to the seating. */
function Chair({at,rotation=0}:{at:Vec3;rotation?:number}){return <group position={at} rotation-y={rotation}>
 <SoftBox at={[0,.6,0]} size={[.66,.16,.64]} radius={.075} color={CAFE_COLORS.clay}/>
 <SoftBox at={[0,1.02,-.25]} size={[.66,.6,.15]} radius={.074} color={CAFE_COLORS.clay}/>
 {[-.23,.23].flatMap(x=>[-.22,.22].map(z=><Cylinder key={`${x}-${z}`} at={[x,.29,z]} size={[.045,.045,.55]} color={CAFE_COLORS.walnut}/>))}
 </group>;}
function Table({point,depth=1}:{point:Point;depth?:number}){return <group position={[point[0],0,point[1]]}>
 <Cylinder at={[0,.12,0]} size={[.33,.36,.16]} color={CAFE_COLORS.walnut}/>
 <Cylinder at={[0,.66,0]} size={[.12,.15,1.08]} color={CAFE_COLORS.walnut}/>
 <SoftBox at={[0,1.23,0]} size={[1,.18,depth]} radius={.089} color={CAFE_COLORS.sand}/>
 </group>;}
/** A small tonal cup graphic marks the café without adding visual clutter. */
function CafeMural(){return <group position={[-.5,1.38,-6.475]} scale={.65}>
 <mesh><circleGeometry args={[1.18,48]}/><meshBasicMaterial color={CAFE_COLORS.sand}/></mesh>
 <mesh position={[.55,-.13,.018]}><ringGeometry args={[.22,.34,32]}/><meshBasicMaterial color={CAFE_COLORS.walnut}/></mesh>
 <SoftBox at={[-.05,-.14,.06]} size={[1.08,.8,.07]} radius={.03} color={CAFE_COLORS.walnut}/>
 <SoftBox at={[0,-.64,.06]} size={[1.5,.1,.075]} radius={.04} color={CAFE_COLORS.clay}/>
 {[-.3,.1].map(x=><group key={x} position={[x,.53,.035]} rotation-z={-.2}><SoftBox size={[.1,.35,.055]} radius={.025} color={CAFE_COLORS.clay}/></group>)}
 </group>;}
/** Canvas-backed lettering sits flush with a walkable tile like a painted floor marking. */
function FloorLabel({at,label}:{at:Point;label:string}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const context=canvas.getContext('2d');if(context){context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle='#29484a';context.font='700 44px ui-monospace, monospace';context.textAlign='center';context.textBaseline='middle';const width=context.measureText(label).width;const scale=Math.min(1,430/Math.max(1,width));context.save();context.translate(256,64);context.scale(scale,scale);context.fillText(label,0,0);context.restore();}const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;},[label]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[at[0],.075,at[1]]} rotation-x={-Math.PI/2} renderOrder={2}><planeGeometry args={[.92,.27]}/><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2}/></mesh>;
}
/** Hinged counter leaf swings toward the room when Niko approaches the staff opening. */
function CounterGate({open}:{open:boolean}){
 const ref=useRef<Group>(null);
 useFrame(()=>{if(ref.current){const target=open?Math.PI/2:0;ref.current.rotation.y+=(target-ref.current.rotation.y)*.16;}});
 return <group position={[STAFF_ENTRY[0]-.47,0,STAFF_ENTRY[1]]} ref={ref}><SoftBox at={[.47,1.03,0]} size={[.94,.12,.82]} radius={.055} color={CAFE_COLORS.sand}/><SoftBox at={[.47,.58,0]} size={[.86,.74,.08]} radius={.035} color={CAFE_COLORS.walnut}/><Box at={[.78,.62,-.055]} size={[.11,.045,.035]} color="#465051"/></group>;
}
/** Floor zones, furniture, and station positions share the simulation's tile model. */
function Room({evening,gateOpen,showLabels}:{evening:boolean;gateOpen:boolean;showLabels:boolean}){return <group>
 <Box at={[-.55,-.42,-.55]} size={[16.1,.7,ROOM[1]+.1]} color={CAFE_COLORS.walnut}/>
 <CafeFloor editing={showLabels}/>
 <Box at={[-.6,1.3,-6.6]} size={[16.2,2.7,.2]} color={CAFE_COLORS.wall}/><CafeMural/>
 <Box at={[-8.6,1.3,-1.6]} size={[.2,2.7,10.2]} color={CAFE_COLORS.wall}/>
 <Box at={[-8.6,2.48,4.5]} size={[.24,.34,2]} color={CAFE_COLORS.walnut}/>
 <Box at={[-8.6,1.14,3.45]} size={[.25,2.3,.1]} color={CAFE_COLORS.walnut}/>
 <Box at={[-8.6,1.14,5.55]} size={[.25,2.3,.1]} color={CAFE_COLORS.walnut}/>
 {/* The two-tile sliding entrance stays fully open, with its panels recessed into the wall. */}
 <Box at={[-8.6,.035,4.5]} size={[.6,.025,2]} color={CAFE_COLORS.sand}/>
 {[-4,0,2.3].map(z=><group key={z}><Box at={[-8.48,1.7,z]} size={[.1,1.8,2]} color={CAFE_COLORS.walnut}/><Box at={[-8.41,1.7,z]} size={[.04,1.5,1.7]} color={evening?'#aa99a2':'#c7e3df'}/><Box at={[-8.37,1.7,z]} size={[.06,1.55,.055]} color={CAFE_COLORS.walnut}/><Box at={[-8.37,1.7,z]} size={[.06,.055,1.7]} color={CAFE_COLORS.walnut}/><Box at={[-8.28,.88,z]} size={[.35,.09,2.12]} color={CAFE_COLORS.clay}/></group>)}
 {FURNITURE.filter(f=>f.kind!=='table'&&f.kind!=='chair'&&f.id!=='storage').map(f=><group key={f.id} position={[f.x+(f.width-1)/2,0,f.z+(f.depth-1)/2]}>{f.kind==='plant'?<Plant at={[0,0,0]}/>:<>
  <SoftBox at={[0,.54,0]} size={[f.width,.98,f.depth]} radius={.16} color={CAFE_COLORS.walnut}/>
  <SoftBox at={[0,1.04,0]} size={[f.width,.12,f.depth]} radius={.059} color={CAFE_COLORS.sand}/>
  <Box at={[0,.065,0]} size={[f.width-.08,.1,f.depth-.08]} color={CAFE_COLORS.charcoal}/>
 </>}</group>)}
 {Object.entries(STATIONS).map(([id,station])=>id==='returns'||id==='brewer'?null:<group key={id} position={[station.cell[0],0,station.cell[1]]}>
  {id==='orders'?<TicketTray/>:<Appliance id={id as StationId}/>}
 </group>)}
 <group position={[STATIONS.orders.customerCounter[0],0,STATIONS.orders.customerCounter[1]]} rotation-y={Math.PI/2}><Appliance id="orders"/></group>
 {/* Query takes paper from the counter one tile above its starting position. */}
 <group position={[STARTS.query[0],1.11,STARTS.query[1]-1]}>
  {Array.from({length:7},(_,i)=><group key={i} position={[(i%3-1)*.018,i*.024,0]} rotation-y={(i%2?1:-1)*.025}>
   <Box size={[.58,.018,.7]} color={i===6?'#fffbed':'#e4d5b7'}/>
  </group>)}
 </group>
 <CounterGate open={gateOpen}/>
 {showLabels&&<><FloorLabel at={STATIONS.orders.prep} label="ORDER HANDOFF"/><FloorLabel at={STATIONS.ingredients.prep} label="STORAGE"/><FloorLabel at={STATIONS.grinder.prep} label="COFFEE MACHINE"/><FloorLabel at={STATIONS.sugar.prep} label="SUGAR"/><FloorLabel at={STATIONS.pickup.floor} label="DRINK PICKUP"/><FloorLabel at={STATIONS.returns.floor} label="SINK"/><FloorLabel at={ENTRANCE} label="ENTER"/></>}
 {TABLE_LAYOUT.map((t,i)=><group key={t.id}><Table point={[t.x,t.z+(t.depth-1)/2]} depth={t.depth}/><Chair at={[tableSeat(i,0)[0],0,tableSeat(i,0)[1]]} rotation={Math.PI/2}/><Chair at={[tableSeat(i,1)[0],0,tableSeat(i,1)[1]]} rotation={-Math.PI/2}/></group>)}
 </group>;}
/** Smooth heading changes, hinged walking legs, and a seated sipping pose share replay time. */
function Character({at,color='#c28563',robot=false,label,animate=false,walking=false,phase=0,reduced=false,sit=0,facing=0,drinking=false,tea=false,reach=0}:{at:Point;color?:string;robot?:boolean;label?:string;animate?:boolean;walking?:boolean;phase?:number;reduced?:boolean;sit?:number;facing?:number;drinking?:boolean;tea?:boolean;reach?:number}){
  const ref=useRef<Group>(null),initialFacing=useRef(facing);
  useFrame((_,delta)=>{
    if(!ref.current)return;
    const difference=Math.atan2(Math.sin(facing-ref.current.rotation.y),Math.cos(facing-ref.current.rotation.y));
    ref.current.rotation.y+=difference*(reduced||!animate?1:1-Math.exp(-delta*18));
  });
  const stride=walking&&!reduced?Math.sin(phase*10):0;
  const bob=walking&&!reduced?Math.abs(stride)*.035:0;
  const sip=drinking&&!reduced?(1-Math.cos(phase*1.6))/2:0;
  const hip=.51+sit*.21;
  return <group position={[at[0],bob,at[1]]}><group ref={ref} rotation-y={initialFacing.current}>
    {robot?<RobotModel color={color} stride={stride} reach={reduced?0:reach}/>:<>
      <Cylinder at={[0,.76+sit*.26,0]} size={[.24,.31,.64]} color={color}/>
      <group position={[0,1.37+sit*.26,0]} rotation-x={sip*.12}>
        <mesh castShadow><sphereGeometry args={[.3,10,8]}/><meshStandardMaterial color="#deb28b"/></mesh>
        <mesh position={[0,.15,-.04]} castShadow><sphereGeometry args={[.3,10,6,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#664d38"/></mesh>
      </group>
      <Box at={[0,.74+sit*.26,.25]} size={[.34,.46,.05]} color="#e7d7af"/>
      {[-1,1].map(side=><group key={side}>
        <group position={[side*.17,hip,0]} rotation-x={-sit*Math.PI/2+stride*side*.5*(1-sit)}>
          <Box at={[0,-.12,0]} size={[.17,.25,.19]} color="#4b5543"/>
          <group position={[0,-.25,0]} rotation-x={sit*Math.PI/2+Math.max(0,-stride*side)*.35*(1-sit)}>
            <Box at={[0,-.12,0]} size={[.17,.25,.17]} color="#4b5543"/>
            <Box at={[0,-.2,.09]} size={[.23,.14,.35]} color="#394538"/>
          </group>
        </group>
        <group position={[side*.36,1+sit*.26,0]} rotation-x={drinking&&side===1?-1.05-sip*.7:-sit*.75-stride*side*.4}>
          <Box at={[0,-.2,0]} size={[.14,.44,.17]} color={color}/>
          <mesh position={[0,-.43,0]}><sphereGeometry args={[.09,8,6]}/><meshStandardMaterial color="#deb28b"/></mesh>
        </group>
      </group>)}
      {drinking&&<group position={[.22,1.26+sip*.27,.43-sip*.19]} rotation-x={-sip*.3} scale={.72}><Cup tea={tea}/></group>}
    </>}
  </group>{label&&<Html position={[0,2.1,0]} center zIndexRange={[6,0]}><span className="actor-label">{label}</span></Html>}</group>;
}
/** Frame each robot's work area, including its reachable counters or dining tables. */
const robotViews = {
 query: { target: [-5, .7, 4.4], width: 8, depth: 5.5 },
 prep: { target: [2.5, .7, 4.3], width: 12, depth: 5.5 },
 floor: { target: [0, .7, -1], width: 17, depth: 11.5 },
} satisfies Record<RobotRole, { target: number[]; width: number; depth: number }>;

/** Pan and zoom together when the code editor switches robots. */
function CameraFit({serviceView,reduced,focusRole}:{serviceView:boolean;reduced:boolean;focusRole?:RobotRole}){
 const {size,camera}=useThree();
 const angle=useRef(0),center=useRef<number[]>([...CAMERA_TARGET]),zoom=useRef(cameraZoom(size.width,size.height));
 useFrame((_,delta)=>{
  const blend=reduced?1:1-Math.exp(-delta*5);
  const view=focusRole?robotViews[focusRole]:undefined;
  const target=view?.target??CAMERA_TARGET;
  angle.current+=((serviceView?10*Math.PI/180:0)-angle.current)*blend;
  center.current=center.current.map((value,index)=>value+(target[index]-value)*blend);
  const cos=Math.cos(angle.current),sin=Math.abs(Math.sin(angle.current));
  const targetZoom=view?Math.max(1,Math.min(
   size.width/(view.width*cos+view.depth*sin+1),
   size.height/((view.depth*cos+view.width*sin)*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+1),
  )):cameraZoom(size.width,size.height)*(serviceView?.8:1);
  zoom.current+=(targetZoom-zoom.current)*blend;
  const radius=CAMERA_POSITION[2]-CAMERA_TARGET[2];
  camera.position.set(center.current[0]+Math.sin(angle.current)*radius,center.current[1]+CAMERA_POSITION[1]-CAMERA_TARGET[1],center.current[2]+cos*radius);
  camera.zoom=zoom.current;
  camera.lookAt(center.current[0],center.current[1],center.current[2]);camera.updateProjectionMatrix();
 });return null;
}
function World({evening,result,time,reduced,moving,level,showLabels,serviceView,focusRole}:{evening:boolean;result?:RunResult;time:number;reduced:boolean;moving:boolean;level:number;showLabels:boolean;serviceView:boolean;focusRole?:RobotRole}){
 const state=result?sampleReplay(result,time):undefined;
 const actors:Partial<Record<ActorId,ActorSnapshot>>=state?.actors??{...(level>=3?{query:{position:STARTS.query,inventory:[],role:'query' as const}}:{niko:{position:STARTS.query,inventory:[],role:'query' as const}}),prep:{position:STARTS.prep,inventory:[],role:'prep' as const},floor:{position:STARTS.floor,inventory:[],role:'floor' as const}};

 const gateOpen=!!state?.seed?.events.some(e=>e.actor==='niko'&&e.from[0]===STAFF_ENTRY[0]&&e.to[0]===STAFF_ENTRY[0]&&e.from[1]!==e.to[1]&&(e.from[1]===STAFF_ENTRY[1]||e.to[1]===STAFF_ENTRY[1])&&state.local>=e.start-.3&&state.local<=e.end+.2);
 return <><OrthographicCamera makeDefault position={CAMERA_POSITION} near={.1} far={150}/><CameraFit serviceView={serviceView} reduced={reduced} focusRole={focusRole}/><ambientLight intensity={evening?.65:1.1} color={evening?'#c6c9e4':'#f4f4ed'}/><hemisphereLight args={['#f1f3ed','#607477',1.1]}/><directionalLight position={[-8,18,8]} intensity={2} color="#ffe7ca" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.04}/><Room evening={evening} gateOpen={gateOpen} showLabels={showLabels}/>
 {Object.entries(actors).map(([id,actor])=>actor&&<group key={id}><Character at={actor.position} robot={id==='query'||id==='prep'&&level>=15||id==='floor'&&level>=23} label={id==='prep'&&level<15?'Moka · Auto':id==='floor'&&level<23?'Pip · Auto':undefined} facing={actor.facing??(id==='query'?-Math.PI/2:0)} walking={moving&&actor.walking} reach={actor.reach} color={id==='floor'?'#d4ac6b':id==='prep'?'#7d9eae':'#80a889'} animate={moving} phase={time} reduced={reduced}/>{serviceView&&state&&(id==='query'||id==='prep'&&level>=15||id==='floor'&&level>=23)&&(actor.heldPaper||actor.inventory.length>0)&&<Html position={[actor.position[0],2.8,actor.position[1]]} center zIndexRange={[10,0]} style={{pointerEvents:'none'}}><RobotHolding name={id==='query'?'Query':id==='prep'?'Brew':'Porter'} inventory={actor.inventory} paper={actor.heldPaper}/></Html>}{actor.inventory.map((item,i)=><Cup key={item.ticketId} at={[actor.position[0]-.2+i*.4,1.2,actor.position[1]+.3]} tea={item.item==='tea'}/>)}</group>)}
 {state&&<Html position={[STATIONS.orders.cell[0],2.7,STATIONS.orders.cell[1]]} center zIndexRange={[11,0]}><OrderQueueBubble tickets={state.waitingTickets}/></Html>}
 {state?.waitingTickets.slice(0,4).map((ticket,i)=><group key={ticket.ticket_id} position={[STATIONS.orders.cell[0]+.2,1.12+i*.015,STATIONS.orders.cell[1]+.18]}>
  <Box size={[.32,.012,.4]} color="#fff3d5"/>
  <Box at={[0,.009,-.08]} size={[.2,.006,.025]} color="#405d61"/>
  <Box at={[-.035,.009,.02]} size={[.13,.006,.025]} color="#b77959"/>
 </group>)}
 {state?.pickup.slice(0,2).map(([id,item],i)=><Cup key={id} at={[STATIONS.pickup.cell[0]-.2+i*.4,1.16,STATIONS.pickup.cell[1]]} tea={item==='tea'}/>)}
 {state?.tableDrinks.map((drink,index)=><Cup key={drink.id} at={[TABLE_LAYOUT[drink.table-1].x-.2+(index%2)*.4,1.33,TABLE_LAYOUT[drink.table-1].z]} tea={drink.item==='tea'}/>)}
 <Street evening={evening} paused={!!result&&!moving} reduced={reduced}/>
 <StreetClip>{state?.customers.map((c,i)=>{
  const event=result?.events.find(event=>event.seed_id===state.seed?.seed_id&&event.customer.customer_id===c.id);
  const clarified=!!state.seed?.events.some(log=>log.role==='query'&&log.command==='HELP'&&log.customerId===c.id&&log.end<=state.local);
  return <group key={c.id}>
  <Character at={c.position} color={['#af7e67','#79929c','#b29c66'][i%3]} sit={c.sit} walking={moving&&c.walking} animate={moving} phase={time} reduced={reduced} facing={c.facing} drinking={c.drinking} tea={c.drink==='tea'}/>
  {event&&c.showOrder&&<Html position={[c.position[0],2.2,c.position[1]]} center zIndexRange={[12,0]} style={{pointerEvents:'none'}}><CustomerSpeech customer={event.customer} clarified={clarified}/></Html>}
 </group>})}</StreetClip>
 <mesh rotation-x={-Math.PI/2} position={[0,-.81,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.12}/></mesh></>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="webgl-fallback"><strong>The café is still open.</strong><p>3D graphics are unavailable on this device. You can still program Query, run service, and follow each customer’s order.</p></div>:this.props.children;}}
export function Cafe({evening=false,result,time=0,reduced=false,pixelArt=true,moving=false,level=32,showLabels=false,serviceView=false,focusRole}:{evening?:boolean;result?:RunResult;time?:number;reduced?:boolean;pixelArt?:boolean;moving?:boolean;level?:number;showLabels?:boolean;serviceView?:boolean;focusRole?:RobotRole}){
 const [lost,setLost]=useState(false);
 return <div className="cafe-canvas" aria-label="Nearly overhead café: grid-aligned kitchen, order counter and dining room">{lost?<div className="webgl-fallback">The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.</div>:<SceneBoundary><Suspense fallback={<div className="scene-loading">Warming up the café…</div>}><Canvas key={pixelArt?'pixelated':'smooth'} shadows dpr={[1,1.5]} gl={{antialias:!pixelArt,alpha:true,localClippingEnabled:true}} onCreated={({gl})=>gl.domElement.addEventListener('webglcontextlost',()=>setLost(true))}><World evening={evening} result={result} time={time} reduced={reduced} moving={moving} level={level} showLabels={showLabels} serviceView={serviceView} focusRole={focusRole}/>{pixelArt&&<PixelArtEffect/>}</Canvas></Suspense></SceneBoundary>}</div>;
}
