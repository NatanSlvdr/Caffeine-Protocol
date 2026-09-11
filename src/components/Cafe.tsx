import { Component, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, RoundedBox } from '@react-three/drei';
import { Group } from 'three';
import type { RunResult } from '../domain/types';
import { sampleReplay } from '../domain/replay';
import { cameraZoom, TABLE_LAYOUT, FURNITURE, STATIONS, STARTS, CAMERA_POSITION, CAMERA_TARGET, zoneAt, ROOM, BOUNDS, tableFront, tableSeat } from '../domain/layout';
import type { Point } from '../domain/layout';

type Vec3=[number,number,number];
function Box({at=[0,0,0],size=[1,1,1],color='#d8b38b',rotation=0}:{at?:Vec3;size?:Vec3;color?:string;rotation?:number}){return <mesh position={at} rotation-y={rotation} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.82}/></mesh>;}
function Cylinder({at,size=[.3,.3,1],color='#d3b690'}:{at:Vec3;size?:Vec3;color?:string}){return <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[...size,12]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
function Plant({at,scale=1}:{at:Vec3;scale?:number}){return <group position={at} scale={scale}><Cylinder at={[0,.32,0]} size={[.35,.25,.62]} color="#b37151"/><Cylinder at={[0,.65,0]} size={[.29,.29,.04]} color="#514439"/><Cylinder at={[0,1.08,0]} size={[.035,.045,.9]} color="#5f6c43"/>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.26,.9+i*.11,Math.cos(i*2.4)*.24]} rotation={[i*.2,i*2.4,.6]} scale={[.22,.55,.11]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#6a895b':'#93a86d'}/></mesh>)}</group>;}
function Cup({at=[0,0,0],tea=false}:{at?:Vec3;tea?:boolean}){return <group position={at}><Cylinder at={[0,.025,0]} size={[.24,.24,.045]} color="#ece3ce"/><Cylinder at={[0,.15,0]} size={[.16,.13,.24]} color="#f9ebd2"/><Cylinder at={[0,.277,0]} size={[.13,.13,.012]} color={tea?'#af8045':'#573528'}/><mesh position={[.17,.16,0]} rotation-x={Math.PI/2}><torusGeometry args={[.09,.027,5,10]}/><meshStandardMaterial color="#f9ebd2"/></mesh></group>;}
function Chair({at,rotation=0}:{at:Vec3;rotation?:number}){return <group position={at} rotation-y={rotation}><Box at={[0,.59,0]} size={[.65,.14,.65]} color="#7c9272"/><Box at={[0,1.04,-.29]} size={[.65,.78,.12]} color="#758d6b"/>{[-.24,.24].flatMap(x=>[-.23,.23].map(z=><Box key={`${x}-${z}`} at={[x,.27,z]} size={[.09,.55,.09]} color="#825d40"/>))}</group>;}
function Table({point,depth=1}:{point:Point;depth?:number}){return <group position={[point[0],0,point[1]]}><Cylinder at={[0,.6,0]} size={[.09,.14,1.2]} color="#644a37"/><Box at={[0,1.23,0]} size={[1,.16,depth]} color="#d2a36d"/><Plant at={[-.2,1.32,-.2]} scale={.25}/></group>;}
/** Floor zones, furniture, and station positions share the simulation's tile model. */
function Room({tables,evening}:{tables:number;evening:boolean}){return <group>
 <Box at={[-.5,-.42,-.5]} size={[16,.7,12]} color="#987a58"/>
 {Array.from({length:ROOM[1]},(_,z)=>Array.from({length:ROOM[0]},(_,x)=>{
  const zone=zoneAt([x+BOUNDS.minX,z+BOUNDS.minZ]);return <Box key={`${x}-${z}`} at={[x+BOUNDS.minX,-.035,z+BOUNDS.minZ]} size={[1,.12,1]} color={zone==='prep'?((x+z)%2?'#8fa998':'#c3cebd'):zone==='query'?'#c3a579':(x+z)%2?'#ddc298':'#cfaf84'}/>;
 }))}
 {Array.from({length:17},(_,i)=><Box key={`x${i}`} at={[i-8.5,.029,-.5]} size={[.018,.008,12]} color="#9e8c6c"/>)}
 {Array.from({length:13},(_,i)=><Box key={`z${i}`} at={[-.5,.029,i-6.5]} size={[16,.008,.018]} color="#9e8c6c"/>)}
 <Box at={[-.5,1.3,-6.6]} size={[16,2.7,.2]} color="#d8c9aa"/><Box at={[-8.6,1.3,-.5]} size={[.2,2.7,12]} color="#c8c4a5"/>
 {[-4,0,4].map(z=><group key={z}><Box at={[-8.48,1.7,z]} size={[.1,1.8,2]} color="#7d997e"/><Box at={[-8.41,1.7,z]} size={[.04,1.5,1.7]} color={evening?'#aa99a2':'#cee0c2'}/></group>)}
 {FURNITURE.filter(f=>f.kind!=='table'&&f.kind!=='chair').map(f=><group key={f.id} position={[f.x+(f.width-1)/2,0,f.z+(f.depth-1)/2]}>{f.kind==='plant'?<Plant at={[0,0,0]}/>:<><Box at={[0,.5,0]} size={[f.width,1,f.depth]} color={f.id==='equipment'?'#687b69':'#527868'}/><Box at={[0,1.05,0]} size={[f.width,.1,f.depth]} color={f.id==='equipment'?'#d9b27d':'#e2c69c'}/></>}</group>)}
 {Object.entries(STATIONS).map(([id,station])=><group key={id} position={[station.cell[0],0,station.cell[1]]}>
  <Html position={[0,2.2,0]} center zIndexRange={[5,0]}><span className="world-label">{station.label}</span></Html>
  {id==='brewer'?<><Box at={[0,1.45,0]} size={[.85,.7,.85]} color="#cb644c"/><Box at={[.44,1.42,0]} size={[.03,.35,.65]} color="#34453f"/><Cup at={[.3,1.1,.2]}/><Cylinder at={[0,1.87,0]} size={[.13,.13,.15]} color="#e6c78e"/></>
  :id==='ingredients'?<>{[-.24,.24].map(x=><group key={x}><Cylinder at={[x,1.4,0]} size={[.2,.2,.6]} color={x<0?'#80523b':'#75a45c'}/><Cylinder at={[x,1.72,0]} size={[.21,.21,.08]} color="#e2c585"/><Box at={[x,1.42,.21]} size={[.22,.18,.02]} color="#f0e2bd"/></group>)}</>
  :id==='grinder'?<><Box at={[0,1.3,0]} size={[.6,.4,.6]} color="#b39065"/><Cylinder at={[0,1.7,0]} size={[.27,.13,.4]} color="#4c372b"/><Box at={[.32,1.72,0]} size={[.35,.05,.05]} color="#2f352f"/><Cylinder at={[.5,1.72,0]} size={[.07,.07,.14]} color="#d4b170"/></>
  :id==='water'?<><Box at={[0,1.12,0]} size={[.8,.06,.8]} color="#5b9fc1"/><Box at={[0,1.4,-.2]} size={[.09,.6,.09]} color="#bbd4d9"/><Box at={[.17,1.68,-.2]} size={[.4,.09,.09]} color="#bbd4d9"/><Cylinder at={[.35,1.53,-.2]} size={[.07,.07,.22]} color="#bbd4d9"/></>
  :id==='sugar'?<><Cylinder at={[0,1.4,0]} size={[.32,.32,.6]} color="#f4e9d0"/><Cylinder at={[0,1.73,0]} size={[.34,.34,.07]} color="#e4b865"/></>
  :id==='pickup'?<><Box at={[0,1.12,0]} size={[.9,.08,.85]} color="#edb548"/><Box at={[0,1.2,-.38]} size={[.9,.12,.07]} color="#b77d2c"/></>
  :id==='returns'?<><Box at={[0,1.2,0]} size={[.9,.25,.85]} color="#7994b0"/>{[-.2,.2].map(x=><Cylinder key={x} at={[x,1.36,0]} size={[.16,.16,.2]} color="#e5dfce"/>)}</>
  :id==='dock'?<><Box at={[.32,.16,0]} size={[.3,.3,.9]} color="#466d62"/><Box at={[.49,.25,0]} size={[.03,.12,.65]} color="#96df98"/></>
  :<><Box at={[0,1.3,0]} size={[.7,.4,.6]} color="#496a65"/><Box at={[.36,1.45,0]} size={[.03,.28,.5]} color="#99d9c0"/><Box at={[.22,1.13,.25]} size={[.35,.04,.18]} color="#e4ca83"/></>}
 </group>)}
 <mesh rotation-x={-Math.PI/2} position={[STATIONS.dock.floor[0],.04,STATIONS.dock.floor[1]]}><ringGeometry args={[.27,.39,4]}/><meshBasicMaterial color="#548c66"/></mesh>
 {TABLE_LAYOUT.map((t,i)=><group key={t.id}><Table point={[t.x,t.z+(t.depth-1)/2]} depth={t.depth}/><Chair at={[tableSeat(i,0)[0],0,tableSeat(i,0)[1]]} rotation={Math.PI/2}/><Chair at={[tableSeat(i,1)[0],0,tableSeat(i,1)[1]]} rotation={-Math.PI/2}/><Box at={[tableFront(i)[0],.06,tableFront(i)[1]]} size={[.25,.035,.25]} color={i<tables?'#88a978':'#bba886'}/></group>)}
 {[-4,-1,2,5].map((x,i)=><group key={x}><Box at={[x,1.7,-6.45]} size={[1,.9,.08]} color="#87664c"/><Box at={[x,1.7,-6.39]} size={[.8,.7,.03]} color={['#d9b16f','#90a17f','#d4bcb3','#a4bdba'][i]}/></group>)}
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
 const actors=state?.actors??{...(level>=3?{query:{position:STARTS.query,inventory:[],battery:80,role:'query' as const}}:{}),...(level>=15?{prep:{position:STARTS.prep,inventory:[],battery:80,role:'prep' as const}}:{}),...(level>=23?{floor:{position:STARTS.floor,inventory:[],battery:80,role:'floor' as const}}:{niko:{position:level>=15?STARTS.floor:STARTS.prep,inventory:[],battery:80,role:level>=15?'floor' as const:'prep' as const}})};
 return <><OrthographicCamera makeDefault position={CAMERA_POSITION} near={.1} far={150}/><CameraFit/><ambientLight intensity={evening?.65:1.1} color={evening?'#d4c5e7':'#fff0d1'}/><hemisphereLight args={['#f5e7c7','#718977',1.1]}/><directionalLight position={[-8,18,8]} intensity={2} color="#ffddb0" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.04}/><Room tables={tables} evening={evening}/>
 {Object.entries(actors).map(([id,actor])=>actor&&<group key={id}><Character at={actor.position} robot={id!=='niko'}  color={id==='floor'?'#d4ac6b':id==='prep'?'#7d9eae':'#80a889'} animate={moving} phase={time} reduced={reduced}/>{actor.inventory.map((item,i)=><Cup key={item.ticketId} at={[actor.position[0]-.2+i*.4,1.2,actor.position[1]+.3]} tea={item.item==='tea'}/>)}</group>)}
 {state?.pickup.slice(0,2).map(([id,item],i)=><Cup key={id} at={[STATIONS.pickup.cell[0]-.2+i*.4,1.16,STATIONS.pickup.cell[1]]} tea={item==='tea'}/>)}
 {state?.customers.map((c,i)=><Character key={c.id} at={c.position} color={['#af7e67','#79929c','#b29c66'][i%3]} seated={c.seated} facing={c.side===0?Math.PI/2:-Math.PI/2}/>)}
 <mesh rotation-x={-Math.PI/2} position={[0,-.81,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.12}/></mesh></>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="webgl-fallback"><strong>The café is still open.</strong><p>3D graphics are unavailable on this device. You can still program Query, run service, and inspect every order using the panels.</p></div>:this.props.children;}}
export function Cafe({tables=4,evening=false,result,time=0,reduced=false,moving=false,level=32}:{tables?:number;evening?:boolean;result?:RunResult;time?:number;reduced?:boolean;moving?:boolean;level?:number}){
 const [lost,setLost]=useState(false);
 return <div className="cafe-canvas" aria-label="Nearly overhead café: grid-aligned kitchen, order counter and dining room">{lost?<div className="webgl-fallback">The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.</div>:<SceneBoundary><Suspense fallback={<div className="scene-loading">Warming up the café…</div>}><Canvas shadows dpr={[1,1.5]} gl={{antialias:true,alpha:true}} onCreated={({gl})=>gl.domElement.addEventListener('webglcontextlost',()=>setLost(true))}><World tables={tables} evening={evening} result={result} time={time} reduced={reduced} moving={moving} level={level}/></Canvas></Suspense></SceneBoundary>}</div>;
}
