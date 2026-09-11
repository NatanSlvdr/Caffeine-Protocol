import { Component, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, RoundedBox } from '@react-three/drei';
import { Group } from 'three';
import { PixelArtEffect } from './PixelArtEffect';
import { Appliance, Box, Cylinder, Cup, Fridge, DryStorage, TicketTray } from './CafeModels';
import type { Vec3 } from './CafeModels';
import type { StationId } from '../domain/layout';
import type { RunResult } from '../domain/types';
import { sampleReplay } from '../domain/replay';
import { cameraZoom, TABLE_LAYOUT, LOUNGE_TABLES, FURNITURE, STATIONS, STARTS, CAMERA_POSITION, CAMERA_TARGET, ENTRANCE, MANUAL_INTAKE, STAFF_ENTRY, zoneAt, ROOM, BOUNDS, tableFront, tableSeat } from '../domain/layout';
import type { Point } from '../domain/layout';

function Plant({at,scale=1}:{at:Vec3;scale?:number}){return <group position={at} scale={scale}><Cylinder at={[0,.32,0]} size={[.35,.25,.62]} color="#c26b50"/><Cylinder at={[0,.65,0]} size={[.29,.29,.04]} color="#514439"/><Cylinder at={[0,1.08,0]} size={[.035,.045,.9]} color="#5f6c43"/>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.26,.9+i*.11,Math.cos(i*2.4)*.24]} rotation={[i*.2,i*2.4,.6]} scale={[.22,.55,.11]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#6a895b':'#93a86d'}/></mesh>)}</group>;}
function Chair({at,rotation=0}:{at:Vec3;rotation?:number}){return <group position={at} rotation-y={rotation}><Box at={[0,.59,0]} size={[.65,.14,.65]} color="#bd674f"/><Box at={[0,1.04,-.29]} size={[.65,.78,.12]} color="#a85343"/><Box at={[0,1.34,-.21]} size={[.52,.065,.045]} color="#d58a6e"/><Box at={[0,.62,.02]} size={[.53,.09,.53]} color="#d18a6b"/><Box at={[0,.26,-.23]} size={[.5,.07,.07]} color="#303b3b"/>{[-.24,.24].flatMap(x=>[-.23,.23].map(z=><Box key={`${x}-${z}`} at={[x,.27,z]} size={[.09,.55,.09]} color="#303b3b"/>))}</group>;}
function Table({point,depth=1}:{point:Point;depth?:number}){return <group position={[point[0],0,point[1]]}><Cylinder at={[0,.6,0]} size={[.09,.14,1.2]} color="#303b3b"/><Box at={[0,1.23,0]} size={[1,.16,depth]} color="#b88864"/><Plant at={[-.2,1.32,-.2]} scale={.25}/></group>;}
/** Wall-mounted décor and flat rugs add density without occupying service aisles. */
function LoungeDecor(){return <group>
 {[-5,-2,1].map(z=><group key={z}>
  <Box at={[-4.5,.035,z]} size={[6.65,.012,1.8]} color="#738d88"/>
  {[-.78,.78].map(offset=><Box key={offset} at={[-4.5,.043,z+offset]} size={[6.4,.006,.04]} color="#d9d5be"/>)}
 </group>)}
 {[-5.7,-2.8].map((x,i)=><group key={x}>
  <Box at={[x,1.8,-6.36]} size={[2.3,.09,.4]} color="#a97a57"/>
  {[-.8,-.55,-.3].map((dx,j)=><Box key={dx} at={[x+dx,2.03,-6.35]} size={[.16,.38+j*.05,.23]} color={['#bd674f','#45666b','#d4c4a0'][j]}/>)}
  <Plant at={[x+.65,1.85,-6.35]} scale={.5}/>
  <Cylinder at={[x+.2,2.05,-6.35]} size={[.12,.08,.37]} color={i?'#b96b50':'#e9e4d6'}/>
 </group>)}
 {[-6.6,-3.6,-.6,2.4,5.4].map(x=><group key={x}>
  <Box at={[x,2.24,-6.38]} size={[.08,.3,.15]} color="#c7ab78"/>
  <mesh position={[x,2.1,-6.27]} rotation-x={Math.PI/2}><planeGeometry args={[.35,.16]}/><meshBasicMaterial color="#ffe2a0"/></mesh>
 </group>)}
 {Array.from({length:ROOM[1]+1},(_,i)=><Box key={i} at={[-8.44,.38,-5.7+i*.67]} size={[.08,.6,.055]} color="#b98b65"/>)}
 <Box at={[4,.89,4.555]} size={[7,.025,.025]} color="#d6bd85"/>
 </group>;}
/** Floor zones, furniture, and station positions share the simulation's tile model. */
function Room({tables,evening}:{tables:number;evening:boolean}){return <group>
 <Box at={[-.5,-.42,-.5]} size={[16,.7,ROOM[1]]} color="#394448"/>
 {Array.from({length:ROOM[1]},(_,z)=>Array.from({length:ROOM[0]},(_,x)=>{
  const zone=zoneAt([x+BOUNDS.minX,z+BOUNDS.minZ]);return <Box key={`${x}-${z}`} at={[x+BOUNDS.minX,-.035,z+BOUNDS.minZ]} size={[1,.12,1]} color={zone==='prep'?((x+z)%2?'#7c9493':'#8da4a1'):zone==='query'?'#a0b3ad':(x+z)%2?'#dddcd3':'#d2d3cd'}/>;
 }))}
 {Array.from({length:17},(_,i)=><Box key={`x${i}`} at={[i-8.5,.029,-.5]} size={[.018,.008,ROOM[1]]} color="#bfc3be"/>)}
 {Array.from({length:ROOM[1]+1},(_,i)=><Box key={`z${i}`} at={[-.5,.029,i-6.5]} size={[16,.008,.018]} color="#bfc3be"/>)}
 <Box at={[-.5,1.3,-6.6]} size={[16,2.7,.2]} color="#eee9df"/><Box at={[-8.6,1.3,-.5]} size={[.2,2.7,ROOM[1]]} color="#26484b"/>
 {[-4,0,4].map(z=><group key={z}><Box at={[-8.48,1.7,z]} size={[.1,1.8,2]} color="#273a3e"/><Box at={[-8.41,1.7,z]} size={[.04,1.5,1.7]} color={evening?'#aa99a2':'#c7e3df'}/><Box at={[-8.37,1.7,z]} size={[.06,1.55,.055]} color="#33494a"/><Box at={[-8.37,1.7,z]} size={[.06,.055,1.7]} color="#33494a"/><Box at={[-8.28,.88,z]} size={[.35,.09,2.12]} color="#b88c69"/></group>)}
 {FURNITURE.filter(f=>f.kind!=='table'&&f.kind!=='chair').map(f=><group key={f.id} position={[f.x+(f.width-1)/2,0,f.z+(f.depth-1)/2]}>{f.kind==='plant'?<Plant at={[0,0,0]}/>:f.id==='fridge'?<group rotation-y={Math.PI}><Fridge/></group>:<><Box at={[0,.5,0]} size={[f.width,1,f.depth]} color={f.id==='equipment'?'#273e42':'#273e42'}/><Box at={[0,1.05,0]} size={[f.width,.1,f.depth]} color={f.id==='equipment'?'#ece9df':'#ece9df'}/>
  <Box at={[0,.1,f.depth/2+.015]} size={[f.width,.12,.03]} color="#1e2e32"/>
  {Array.from({length:f.width},(_,i)=><group key={i} position={[i-(f.width-1)/2,0,f.depth/2]}>
   <Box at={[0,.56,.018]} size={[.88,.72,.035]} color={f.id==='equipment'?'#365257':'#365257'}/>
   <Box at={[0,.78,.045]} size={[.26,.045,.055]} color="#caab71"/>
  </group>)}</>}</group>)}
 {Object.entries(STATIONS).map(([id,station])=><group key={id} position={[station.cell[0],0,station.cell[1]]}>
  {id!=='sugar'&&id!=='returns'&&<Html position={id==='dock'?[.32,.18,.7]:id==='ingredients'?[1,.6,.7]:id==='water'?[.5,.6,.7]:[0,.6,.7]} center zIndexRange={[5,0]} style={{pointerEvents:'none'}}><span className="counter-label">{station.label}</span></Html>}
  {id==='orders'?<TicketTray/>:<Appliance id={id as StationId}/>}
 </group>)}
 <mesh rotation-x={-Math.PI/2} position={[STATIONS.dock.floor[0],.04,STATIONS.dock.floor[1]]}><ringGeometry args={[.27,.39,4]}/><meshBasicMaterial color="#548c66"/></mesh>
 <group position={[STATIONS.orders.customerCounter[0],0,STATIONS.orders.customerCounter[1]]} rotation-y={Math.PI/2}><Appliance id="orders"/></group>
 <Box at={[STAFF_ENTRY[0]-.44,1.4,STAFF_ENTRY[1]]} size={[.09,.7,.9]} color="#ece9df"/>
 <Box at={[ENTRANCE[0],.04,ENTRANCE[1]]} size={[.8,.015,.8]} color="#45666b"/>
 <Html position={[ENTRANCE[0],.1,ENTRANCE[1]+.3]} center zIndexRange={[5,0]} style={{pointerEvents:'none'}}><span className="counter-label">ENTER ↑</span></Html>
 <LoungeDecor/>
 <group position={[STATIONS.ingredients.cell[0],0,STATIONS.ingredients.cell[1]]}><DryStorage/></group>
 {LOUNGE_TABLES.map(t=><group key={t.id}>
  <Table point={[t.x,t.z]}/>
  <Chair at={[t.x-1,0,t.z]} rotation={Math.PI/2}/><Chair at={[t.x+1,0,t.z]} rotation={-Math.PI/2}/>
  <group position={[t.x+.22,1.33,t.z+.15]} scale={.65}><Cup/></group>
  <Box at={[t.x+.2,1.325,t.z-.23]} size={[.3,.025,.24]} rotation={.2} color="#eee9df"/>
 </group>)}
 {TABLE_LAYOUT.map((t,i)=><group key={t.id}><Table point={[t.x,t.z+(t.depth-1)/2]} depth={t.depth}/><Chair at={[tableSeat(i,0)[0],0,tableSeat(i,0)[1]]} rotation={Math.PI/2}/><Chair at={[tableSeat(i,1)[0],0,tableSeat(i,1)[1]]} rotation={-Math.PI/2}/><Box at={[tableFront(i)[0],.06,tableFront(i)[1]]} size={[.25,.035,.25]} color={i<tables?'#88a978':'#bba886'}/></group>)}
 {[1,3,5,7].map((x,i)=><group key={x}><Box at={[x,1.7,-6.45]} size={[1,.9,.08]} color="#303b3b"/><Box at={[x,1.7,-6.39]} size={[.8,.7,.03]} color={['#d9b16f','#90a17f','#d4bcb3','#a4bdba'][i]}/></group>)}
 </group>;}
function Character({at,color='#c28563',robot=false,label,animate=false,phase=0,reduced=false,seated=false,facing=0}:{at:Point;color?:string;robot?:boolean;label?:string;animate?:boolean;phase?:number;reduced?:boolean;seated?:boolean;facing?:number}){
  const ref=useRef<Group>(null);const last=useRef<Point>(at);
  useFrame(()=>{if(!ref.current||seated)return;const dx=at[0]-last.current[0],dz=at[1]-last.current[1];if(Math.hypot(dx,dz)>.00001)ref.current.rotation.y=Math.atan2(dx,dz);last.current=at;});
  const bob=animate&&!reduced?Math.sin(phase*150)*.035:0;
  return <group position={[at[0],seated?0:bob,at[1]]}><group ref={ref} rotation-y={facing}>
    {robot?<><RoundedBox args={[.62,.55,.46]} radius={.09} position={[0,.74,0]} castShadow><meshStandardMaterial color={color}/></RoundedBox><RoundedBox args={[.75,.55,.57]} radius={.1} position={[0,1.29,0]} castShadow><meshStandardMaterial color="#f1dfb5"/></RoundedBox><Box at={[0,1.3,.29]} size={[.58,.28,.04]} color="#263f37"/>{[-.16,.16].map(x=><Box key={x} at={[x,1.32,.32]} size={[.07,.08,.025]} color="#b6e4bc"/>)}<Cylinder at={[0,1.69,0]} size={[.025,.025,.25]} color="#728774"/><mesh position={[0,1.84,0]}><sphereGeometry args={[.075,8,6]}/><meshStandardMaterial color="#e1a251"/></mesh><Box at={[0,.93,.25]} size={[.25,.08,.02]} color="#f1db9f"/></>:<><Cylinder at={[0,seated?1.02:.76,0]} size={[.24,.31,.64]} color={color}/><mesh position={[0,seated?1.63:1.37,0]} castShadow><sphereGeometry args={[.3,10,8]}/><meshStandardMaterial color="#deb28b"/></mesh><mesh position={[0,seated?1.78:1.52,-.04]} castShadow><sphereGeometry args={[.3,10,6,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#664d38"/></mesh><Box at={[0,seated?1:.74,.25]} size={[.34,.46,.05]} color="#e7d7af"/></>}
    {[-1,1].map(i=>seated?<group key={i}><Box at={[i*.17,.62,.2]} size={[.17,.17,.48]} color="#4b5543"/><Box at={[i*.17,.38,.42]} size={[.17,.45,.17]} color="#4b5543"/><Box at={[i*.18,.13,.51]} size={[.23,.14,.35]} color="#394538"/><Box at={[i*.4,1.03,0]} size={[.14,.44,.17]} color={color}/></group>:<group key={i}><Box at={[i*.17,.23,0]} size={[.17,.4,.19]} color="#4b5543"/><Box at={[i*.18,.07,.09]} size={[.23,.14,.35]} color="#394538"/><Box at={[i*.4,.78,0]} size={[.14,.44,.17]} color={color}/></group>)}
  </group>{label&&<Html position={[0,2.1,0]} center zIndexRange={[6,0]}><span className="actor-label">{label}</span></Html>}</group>;
}
function CameraFit(){const {size,camera}=useThree();useEffect(()=>{if('zoom' in camera){camera.zoom=cameraZoom(size.width,size.height);camera.lookAt(...CAMERA_TARGET);camera.updateProjectionMatrix();}},[size,camera]);return null;}
function World({tables,evening,result,time,reduced,moving,level}:{tables:number;evening:boolean;result?:RunResult;time:number;reduced:boolean;moving:boolean;level:number}){
 const state=result?sampleReplay(result,time):undefined;
 const actors=state?.actors??{...(level>=3?{query:{position:STARTS.query,inventory:[],battery:80,role:'query' as const}}:{}),...(level>=15?{prep:{position:STARTS.prep,inventory:[],battery:80,role:'prep' as const}}:{}),...(level>=23?{floor:{position:STARTS.floor,inventory:[],battery:80,role:'floor' as const}}:{niko:{position:level>=15?STARTS.floor:level>=3?STARTS.prep:MANUAL_INTAKE,inventory:[],battery:80,role:level>=15?'floor' as const:'prep' as const}})};
 return <><OrthographicCamera makeDefault position={CAMERA_POSITION} near={.1} far={150}/><CameraFit/><ambientLight intensity={evening?.65:1.1} color={evening?'#c6c9e4':'#f4f4ed'}/><hemisphereLight args={['#f1f3ed','#607477',1.1]}/><directionalLight position={[-8,18,8]} intensity={2} color="#ffe7ca" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.04}/><Room tables={tables} evening={evening}/>
 {Object.entries(actors).map(([id,actor])=>actor&&<group key={id}><Character at={actor.position} robot={id!=='niko'} facing={id==='query'?-Math.PI/2:0} color={id==='floor'?'#d4ac6b':id==='prep'?'#7d9eae':'#80a889'} animate={moving} phase={time} reduced={reduced}/>{actor.inventory.map((item,i)=><Cup key={item.ticketId} at={[actor.position[0]-.2+i*.4,1.2,actor.position[1]+.3]} tea={item.item==='tea'}/>)}</group>)}
 {state?.waitingTickets.slice(0,4).map((ticket,i)=><group key={ticket.ticket_id} position={[STATIONS.orders.cell[0]+.2,1.12+i*.015,STATIONS.orders.cell[1]+.18]}>
  <Box size={[.32,.012,.4]} color="#fff3d5"/>
  <Box at={[0,.009,-.08]} size={[.2,.006,.025]} color="#405d61"/>
  <Box at={[-.035,.009,.02]} size={[.13,.006,.025]} color="#b77959"/>
 </group>)}
 {state?.pickup.slice(0,2).map(([id,item],i)=><Cup key={id} at={[STATIONS.pickup.cell[0]-.2+i*.4,1.16,STATIONS.pickup.cell[1]]} tea={item==='tea'}/>)}
 {state?.customers.map((c,i)=><Character key={c.id} at={c.position} color={['#af7e67','#79929c','#b29c66'][i%3]} seated={c.seated} facing={c.side===0?Math.PI/2:-Math.PI/2}/>)}
 <mesh rotation-x={-Math.PI/2} position={[0,-.81,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.12}/></mesh></>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="webgl-fallback"><strong>The café is still open.</strong><p>3D graphics are unavailable on this device. You can still program Query, run service, and inspect every order using the panels.</p></div>:this.props.children;}}
export function Cafe({tables=4,evening=false,result,time=0,reduced=false,moving=false,level=32}:{tables?:number;evening?:boolean;result?:RunResult;time?:number;reduced?:boolean;moving?:boolean;level?:number}){
 const [lost,setLost]=useState(false);
 return <div className="cafe-canvas" aria-label="Nearly overhead café: grid-aligned kitchen, order counter and dining room">{lost?<div className="webgl-fallback">The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.</div>:<SceneBoundary><Suspense fallback={<div className="scene-loading">Warming up the café…</div>}><Canvas shadows dpr={[1,1.5]} gl={{antialias:false,alpha:true}} onCreated={({gl})=>gl.domElement.addEventListener('webglcontextlost',()=>setLost(true))}><World tables={tables} evening={evening} result={result} time={time} reduced={reduced} moving={moving} level={level}/><PixelArtEffect/></Canvas></Suspense></SceneBoundary>}</div>;
}
