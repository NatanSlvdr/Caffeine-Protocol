import { Component, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, RoundedBox } from '@react-three/drei';
import { Group } from 'three';
import type { ReplayEvent } from '../domain/types';
import { actorState, cameraZoom, QUERY, TABLES } from '../domain/routes';
import type { Point } from '../domain/routes';

type Vec3=[number,number,number];
function Box({at=[0,0,0],size=[1,1,1],color='#d8b38b',rotation=0}:{at?:Vec3;size?:Vec3;color?:string;rotation?:number}){return <mesh position={at} rotation-y={rotation} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.82}/></mesh>;}
function Cylinder({at,size=[.3,.3,1],color='#d3b690'}:{at:Vec3;size?:Vec3;color?:string}){return <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[...size,12]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
function Plant({at,scale=1}:{at:Vec3;scale?:number}){return <group position={at} scale={scale}><Cylinder at={[0,.32,0]} size={[.35,.25,.62]} color="#b37151"/><Cylinder at={[0,.65,0]} size={[.29,.29,.04]} color="#514439"/><Cylinder at={[0,1.08,0]} size={[.035,.045,.9]} color="#5f6c43"/>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.26,.9+i*.11,Math.cos(i*2.4)*.24]} rotation={[i*.2,i*2.4,.6]} scale={[.22,.55,.11]} castShadow><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%2?'#6a895b':'#93a86d'}/></mesh>)}</group>;}
function Cup({at=[0,0,0],tea=false}:{at?:Vec3;tea?:boolean}){return <group position={at}><Cylinder at={[0,.025,0]} size={[.24,.24,.045]} color="#ece3ce"/><Cylinder at={[0,.15,0]} size={[.16,.13,.24]} color="#f9ebd2"/><Cylinder at={[0,.277,0]} size={[.13,.13,.012]} color={tea?'#af8045':'#573528'}/><mesh position={[.17,.16,0]} rotation-x={Math.PI/2}><torusGeometry args={[.09,.027,5,10]}/><meshStandardMaterial color="#f9ebd2"/></mesh></group>;}
function Chair({at,rotation=0}:{at:Vec3;rotation?:number}){return <group position={at} rotation-y={rotation}><Box at={[0,.59,0]} size={[.65,.14,.65]} color="#7c9272"/><Box at={[0,1.04,-.29]} size={[.65,.78,.12]} color="#758d6b"/>{[-.24,.24].flatMap(x=>[-.23,.23].map(z=><Box key={`${x}-${z}`} at={[x,.27,z]} size={[.09,.55,.09]} color="#825d40"/>))}</group>;}
function Table({point,index}:{point:Point;index:number}){return <group position={[point[0],0,point[1]]}><Cylinder at={[0,.6,0]} size={[.09,.14,1.2]} color="#644a37"/><Cylinder at={[0,.07,0]} size={[.38,.38,.12]} color="#644a37"/><Cylinder at={[0,1.23,0]} size={[.71,.71,.16]} color="#d2a36d"/><Plant at={[-.22,1.32,-.19]} scale={.25}/><Box at={[.27,1.43,.02]} size={[.19,.24,.07]} color="#f4e5c7"/><Chair at={[index%2?.97:-.97,0,0]} rotation={index%2?Math.PI/2:-Math.PI/2}/><Chair at={[0,0,-.9]}/></group>;}
function Label({at,children}:{at:Vec3;children:ReactNode}){return <Html position={at} center style={{pointerEvents:'none'}} zIndexRange={[5,0]}><span className="world-label">{children}</span></Html>;}
function Room({tables,evening}:{tables:number;evening:boolean}){return <group>
  <Box at={[0,-.42,0]} size={[14.5,.7,19.5]} color="#987a58"/>
  {Array.from({length:19},(_,z)=>Array.from({length:14},(_,x)=><Box key={`${x}-${z}`} at={[x-6.5,-.035,z-9]} size={[.985,.12,.985]} color={z<6?((x+z)%2?'#a4b4a4':'#c3cebd'):['#d2b489','#ddc298','#cfaf84','#dcc099'][(x*3+z)%4]}/>))}
  <Box at={[0,1.65,-9.48]} size={[14.25,3.4,.22]} color="#d8c9aa"/><Box at={[-7,1.65,0]} size={[.22,3.4,19]} color="#c8c4a5"/>
  <Box at={[0,.16,-9.28]} size={[14,.28,.12]} color="#798d73"/><Box at={[-6.82,.16,0]} size={[.13,.28,19]} color="#798d73"/>
  {[.5,5.5].map(z=><group key={z}><Box at={[-6.84,2,z]} size={[.14,1.8,2.8]} color="#7d997e"/><Box at={[-6.74,2,z]} size={[.06,1.55,2.55]} color={evening?'#aa99a2':'#cee0c2'}/><Box at={[-6.65,2,z]} size={[.12,1.65,.08]} color="#e9dabb"/><Box at={[-6.65,2,z]} size={[.12,.08,2.6]} color="#e9dabb"/><Box at={[-6.55,1.15,z]} size={[.62,.15,3]} color="#d6b98b"/></group>)}
  <Box at={[-3,1.05,-3.2]} size={[8,2.1,.25]} color="#9bac92"/><Box at={[-3,2.12,-3.2]} size={[8.15,.12,.42]} color="#e6d7b7"/>
  <Box at={[6.65,1.05,-3.2]} size={[.7,2.1,.25]} color="#9bac92"/>
  <Box at={[4.55,.62,-3.6]} size={[3.65,1.2,1.05]} color="#487466"/><Box at={[4.55,1.27,-3.6]} size={[3.85,.16,1.22]} color="#e0c7a0"/>
  <Box at={[-.8,.58,-8.45]} size={[11.2,1.12,1.2]} color="#718f7a"/><Box at={[-.8,1.2,-8.45]} size={[11.35,.14,1.35]} color="#eee0bf"/>
  <group position={[-4.75,1.29,-8.35]}><Box at={[0,.48,0]} size={[1.9,.95,.85]} color="#d9cdbc"/><Box at={[0,.45,.44]} size={[1.55,.49,.04]} color="#40534c"/><Box at={[0,.12,.63]} size={[1.7,.12,.58]} color="#b4bdb0"/>{[-.48,.48].map(x=><group key={x}><Cylinder at={[x,.82,.01]} size={[.16,.16,.3]} color="#bd8151"/><Box at={[x,.37,.62]} size={[.13,.2,.14]} color="#c0c4b6"/><Cup at={[x,.2,.6]}/></group>)}<Box at={[.76,.69,.46]} size={[.12,.12,.03]} color="#b5dba1"/></group>
  <group position={[-1.85,1.32,-8.4]}><Cylinder at={[0,.35,0]} size={[.35,.45,.65]} color="#e0b260"/><Cylinder at={[0,.72,0]} size={[.22,.3,.1]} color="#987247"/><Box at={[.38,.5,0]} size={[.35,.09,.14]} color="#a98251"/></group>
  <Box at={[5.3,1.12,-8.45]} size={[1.45,2.2,1.3]} color="#e2dec8"/><Box at={[5.8,1.36,-7.77]} size={[.09,.65,.07]} color="#9b927c"/>
  <Box at={[1.3,2.1,-9.12]} size={[3.5,.13,.55]} color="#b59266"/>{[0,1,2].map(i=><Cylinder key={i} at={[.2+i,2.4,-9.1]} size={[.21,.21,.5]} color={['#c4a16e','#b77951','#8c9b76'][i]}/>)}
  <Box at={[-3.9,.65,6]} size={[3.9,1.3,1.3]} color="#527868"/><Box at={[-3.9,1.36,6]} size={[4.15,.16,1.5]} color="#e2c69c"/>
  <Box at={[-3.7,1.65,5.9]} size={[.8,.45,.5]} color="#46554a"/><Box at={[-3.7,1.85,6.08]} size={[.6,.3,.07]} color="#b9d6b1"/><Cup at={[-5,1.45,6]}/>
  <Box at={[-5.9,.6,-.7]} size={[1.45,1.2,2.1]} color="#aa8a60"/><Box at={[-5.9,1.26,-.7]} size={[1.6,.15,2.25]} color="#e6d2ad"/><Plant at={[-6,1.33,-1.2]} scale={.65}/>
  <Box at={[-5.5,1.9,-3.03]} size={[1.8,1.3,.12]} color="#b59a70"/><Box at={[-5.5,1.9,-2.95]} size={[1.59,1.09,.05]} color="#354f43"/>
  <Label at={[-5.5,1.9,-2.85]}>TODAY'S BREW<br/>coffee · tea · kindness</Label>
  <Plant at={[-6,0,8.3]} scale={1.2}/><Plant at={[5.9,0,-5.4]} scale={.85}/>
  {TABLES.slice(0,tables).map((point,i)=><Table key={i} point={point} index={i}/>)}
  {[[-2,4],[-3,0]].map(([x,z],i)=><group key={i}><Cylinder at={[x,3.4,z]} size={[.025,.025,1.2]} color="#625b45"/><mesh position={[x,2.75,z]} castShadow><coneGeometry args={[.65,.4,12,1,true]}/><meshStandardMaterial color="#e2b775" side={2}/></mesh><Cylinder at={[x,2.56,z]} size={[.5,.5,.04]} color="#ffe1a0"/></group>)}
  <Box at={[1.5,.055,8.65]} size={[2.5,.04,1.1]} color="#7f977b"/>
  <Label at={[-1.8,2.8,-7.3]}>02 / KITCHEN</Label><Label at={[4.7,1.7,-3.1]}>03 / PICKUP</Label><Label at={[-4.5,.55,7]}>01 / ORDERS</Label>
</group>;}
function Character({at,color='#c28563',robot=false,label,animate=false,phase=0,reduced=false}:{at:Point;color?:string;robot?:boolean;label?:string;animate?:boolean;phase?:number;reduced?:boolean}){
  const ref=useRef<Group>(null);const last=useRef<Point>(at);
  useFrame(()=>{if(!ref.current)return;const dx=at[0]-last.current[0],dz=at[1]-last.current[1];if(Math.hypot(dx,dz)>.00001)ref.current.rotation.y=Math.atan2(dx,dz);last.current=at;});
  const bob=animate&&!reduced?Math.sin(phase*150)*.035:0;
  return <group position={[at[0],bob,at[1]]}><group ref={ref}>
    {robot?<><RoundedBox args={[.62,.55,.46]} radius={.09} position={[0,.74,0]} castShadow><meshStandardMaterial color={color}/></RoundedBox><RoundedBox args={[.75,.55,.57]} radius={.1} position={[0,1.29,0]} castShadow><meshStandardMaterial color="#f1dfb5"/></RoundedBox><Box at={[0,1.3,.29]} size={[.58,.28,.04]} color="#263f37"/>{[-.16,.16].map(x=><Box key={x} at={[x,1.32,.32]} size={[.07,.08,.025]} color="#b6e4bc"/>)}<Cylinder at={[0,1.69,0]} size={[.025,.025,.25]} color="#728774"/><mesh position={[0,1.84,0]}><sphereGeometry args={[.075,8,6]}/><meshStandardMaterial color="#e1a251"/></mesh><Box at={[0,.93,.25]} size={[.25,.08,.02]} color="#f1db9f"/></>:<><Cylinder at={[0,.76,0]} size={[.24,.31,.64]} color={color}/><mesh position={[0,1.37,0]} castShadow><sphereGeometry args={[.3,10,8]}/><meshStandardMaterial color="#deb28b"/></mesh><mesh position={[0,1.52,-.04]} castShadow><sphereGeometry args={[.3,10,6,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#664d38"/></mesh><Box at={[0,.74,.25]} size={[.34,.46,.05]} color="#e7d7af"/></>}
    {[-1,1].map(i=><group key={i}><Box at={[i*.17,.23,0]} size={[.17,.4,.19]} color="#4b5543"/><Box at={[i*.18,.07,.09]} size={[.23,.14,.35]} color="#394538"/><Box at={[i*.4,.78,0]} size={[.14,.44,.17]} color={color}/></group>)}
  </group>{label&&<Html position={[0,2.1,0]} center zIndexRange={[6,0]}><span className="actor-label">{label}</span></Html>}</group>;
}
function CameraFit(){const {size,camera}=useThree();useEffect(()=>{if('zoom' in camera){camera.zoom=cameraZoom(size.width,size.height);camera.lookAt(0,.2,0);camera.updateProjectionMatrix();}},[size,camera]);return null;}
function World({tables,evening,event,phase,reduced,moving,manual,previousTea,queueCount}:{tables:number;evening:boolean;event?:ReplayEvent;phase:number;reduced:boolean;moving:boolean;manual:boolean;previousTea?:boolean;queueCount:number}){
  const state=actorState(event?phase:0,Math.max(0,(event?.table??1)-1),manual,event?event.passed&&event.tickets.length>0:true,event?.tickets[0]?.item==='tea',previousTea);
  return <><OrthographicCamera makeDefault position={[26,31,34]} near={.1} far={150}/><CameraFit/><ambientLight intensity={evening?.65:1.1} color={evening?'#d4c5e7':'#fff0d1'}/><hemisphereLight args={['#f5e7c7','#718977',1.1]}/><directionalLight position={[-8,18,8]} intensity={evening?2:2.5} color="#ffddb0" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.04}/><Room tables={tables} evening={evening}/>
  <Character at={state.niko} label="NIKO" animate={moving} phase={phase} reduced={reduced}/><Character at={manual?[-5.75,2.17]:QUERY} robot color={manual?"#9d9f87":"#80a889"} label={manual?"QUERY / OFFLINE":"QUERY"}/>
  {!manual&&<Character at={state.server} robot color="#d4ac6b" animate={moving} phase={phase} reduced={reduced}/>}
  {event&&state.customerVisible&&<Character at={state.customer} color={['#af7e67','#79929c','#b29c66'][Number(event.customer.customer_id.slice(1))%3]} animate={moving} phase={phase} reduced={reduced}/>}
  {event&&Array.from({length:Math.min(2,queueCount)},(_,i)=><Character key={i} at={[-.833+i*1.08,9.08]} color={i?'#b09a75':'#8d929e'}/>)}
  {event?.passed&&phase>=.43&&phase<.9&&<Cup at={phase<.5?[state.niko[0]+.35,1.15,state.niko[1]+.2]:phase<.58?[4,1.36,-3.7]:phase<.7?[state.server[0]+.3,1.16,state.server[1]+.25]:[state.table[0]+.2,1.34,state.table[1]+.1]} tea={event.tickets[0]?.item==='tea'}/>}
  <group position={[-5.8,.25,8.5]}><mesh scale={[.36,.25,.55]} castShadow><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#bf9364"/></mesh><mesh position={[0,.18,.4]}><sphereGeometry args={[.24,8,6]}/><meshStandardMaterial color="#c69b6a"/></mesh>{[-.14,.14].map(x=><mesh key={x} position={[x,.42,.43]}><coneGeometry args={[.09,.19,4]}/><meshStandardMaterial color="#ac8059"/></mesh>)}</group>
  <mesh rotation-x={-Math.PI/2} position={[0,-.81,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.12}/></mesh>
  </>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="webgl-fallback"><strong>The café is still open.</strong><p>3D graphics are unavailable on this device. You can still program Query, run service, and inspect every order using the panels.</p></div>:this.props.children;}}
export function Cafe({tables=4,evening=false,event,phase=0,reduced=false,moving=false,manual=false,previousTea,queueCount=0}:{tables?:number;evening?:boolean;event?:ReplayEvent;phase?:number;reduced?:boolean;moving?:boolean;manual?:boolean;previousTea?:boolean;queueCount?:number}){
  const [lost,setLost]=useState(false);
  return <div className="cafe-canvas" aria-label="Isometric café: kitchen, pickup counter, order till and dining tables">{lost?<div className="webgl-fallback">The graphics context was interrupted. Your program and service results are safe. Reload to restore the café.</div>:<SceneBoundary><Suspense fallback={<div className="scene-loading">Warming up the café…</div>}><Canvas shadows dpr={[1,1.5]} gl={{antialias:true,alpha:true}} onCreated={({gl})=>gl.domElement.addEventListener('webglcontextlost',()=>setLost(true))}><World tables={tables} evening={evening} event={event} phase={phase} reduced={reduced} moving={moving} manual={manual} previousTea={previousTea} queueCount={queueCount}/></Canvas></Suspense></SceneBoundary>}</div>;
}
