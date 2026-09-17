import { Component, memo, useEffect, useLayoutEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Object3D, Vector3 } from 'three';
import { levels } from '../data';
import { landmarkPoint, trailLandmarks, trailPoint, trailWorld, TRAIL_ELEVATION, TRAIL_HEIGHT, TRAIL_STOP_HEIGHT, TRAIL_UNITS, TRAIL_WIDTH } from '../domain/campaignTrail';
import type { TrailLandmarkKind } from '../domain/campaignTrail';
import type { ProgressSave } from '../domain/types';
import { Appliance, Box, Cup, Cylinder, RobotModel, SugarCubes } from './CafeModels';
import { PixelArtEffect } from './PixelArtEffect';

type View = { width: number; height: number; scrollTop: number };
const clay = '#b78268', wood = '#775b43', cream = '#e7d6ad';

/** Native scrolling moves an orthographic camera, keeping a single viewport-sized canvas. */
function TrailCamera({ width, height, scrollTop }: View) {
  const { camera } = useThree();
  const zoom = width / (TRAIL_WIDTH / TRAIL_UNITS);
  const center = (scrollTop + height / 2) / (zoom * TRAIL_ELEVATION);
  const target = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if ('isOrthographicCamera' in camera) {
      camera.zoom = zoom;
      camera.position.set(0, 20, center + 15);
      camera.lookAt(0, 0, center);
      camera.updateProjectionMatrix();
    }
    target.position.set(0, 0, center);
    target.updateMatrixWorld();
  }, [camera, zoom, center, target]);
  return <><primitive object={target}/><ambientLight intensity={1.25}/><hemisphereLight args={['#fff3dd', '#6f7c59', 1.2]}/><directionalLight position={[-9, 20, center + 8]} target={target} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={60} shadow-normalBias={.045}/></>;
}

function Tree({ seed = 0, scale = 1 }: { seed?: number; scale?: number }) {
  return <group scale={scale}><Cylinder at={[0, .7, 0]} size={[.11, .17, 1.4]} color={wood}/>{[-1, 0, 1].map((n) => <mesh key={n} position={[n * .38, 1.5 + (n === 0 ? .48 : 0), n * .2]} scale={[.72, .83, .65]} castShadow><icosahedronGeometry args={[1, 1]}/><meshStandardMaterial color={['#7e9c6d', '#94ac79', '#a8b684'][(seed + n + 3) % 3]} roughness={1}/></mesh>)}</group>;
}
function FlowerBed({ seed = 0 }: { seed?: number }) {
  return <group><Box at={[0, .12, 0]} size={[1.6, .24, .65]} color={clay}/><Box at={[0, .25, 0]} size={[1.43, .035, .5]} color="#6c6850"/>{[-.52, -.17, .17, .52].map((x, i) => <group key={x}><Cylinder at={[x, .42, 0]} size={[.025, .03, .35]} color="#70855c"/><mesh position={[x, .61 + i % 2 * .1, 0]} castShadow><icosahedronGeometry args={[.15, 0]}/><meshStandardMaterial color={['#dbb369', '#d18c78', '#e9d7a4'][(i + seed) % 3]}/></mesh></group>)}</group>;
}
function Bench() {
  return <group>{[-.55, .55].map(x => <Box key={x} at={[x, .28, 0]} size={[.12, .55, .55]} color={wood}/>)}{[-.22, 0, .22].map(z => <Box key={z} at={[0, .59, z]} size={[1.7, .12, .18]} color="#bc966a"/>)}<Box at={[0, .94, -.28]} size={[1.7, .5, .09]} color="#bc966a"/></group>;
}
function Lamp() {
  return <group><Cylinder at={[0, .1, 0]} size={[.23, .3, .2]} color="#5b695b"/><Cylinder at={[0, 1.3, 0]} size={[.045, .07, 2.5]} color="#536353"/><Box at={[0, 2.55, 0]} size={[.4, .48, .4]} color="#eadaae"/><Box at={[0, 2.82, 0]} size={[.57, .1, .57]} color="#536353"/></group>;
}
function PatioTable({ tea = false }: { tea?: boolean }) {
  return <group><Cylinder at={[0, .52, 0]} size={[.09, .13, 1.04]} color={wood}/><Cylinder at={[0, 1.07, 0]} size={[.66, .66, .12]} color={cream}/><Cup at={[.1, 1.14, 0]} tea={tea}/>{[-1, 1].map(side => <group key={side} position={[side * .96, 0, 0]}><Box at={[0, .52, 0]} size={[.52, .12, .53]} color={clay}/><Box at={[side * .24, .87, 0]} size={[.09, .62, .53]} color={clay}/>{[-.18, .18].map(z => <Box key={z} at={[0, .25, z]} size={[.37, .5, .065]} color={wood}/>)}</group>)}</group>;
}
function MarketCounter({ kind }: { kind: TrailLandmarkKind }) {
  const appliance = kind === 'register' ? 'orders' : kind === 'machine' ? 'brewer' : kind === 'sink' ? 'water' : undefined;
  return <group><Box at={[0, .52, 0]} size={[2.5, 1.04, 1.05]} color={wood}/><Box at={[0, 1.08, 0]} size={[2.65, .13, 1.17]} color={cream}/>
    {appliance ? <Appliance id={appliance}/> : <><Cup at={[-.62, 1.16, .12]} tea={kind === 'tea'}/><Cup at={[.1, 1.16, .16]}/><group position={[.65, 1.3, .12]}><SugarCubes/></group></>}
    {[-1.19, 1.19].map(x => <Box key={x} at={[x, 1.75, -.45]} size={[.08, 3.5, .08]} color={wood}/>)}
    <group position={[0, 3.35, -.15]} rotation-x={.12}>{Array.from({ length: 7 }, (_, i) => <Box key={i} at={[-1.2 + i * .4, 0, 0]} size={[.4, .13, 1.6]} color={i % 2 ? '#eddfb6' : kind === 'machine' ? '#7b9da0' : '#a1ae88'}/>)}</group>
    <Box at={[-1.72, .34, .13]} size={[.65, .68, .72]} color="#b08f63"/><Cup at={[-1.72, .7, .13]}/>
  </group>;
}

/** Landmarks are small furnished terraces made from the same geometry as the café. */
function Landmark({ kind, unlocked }: { kind: TrailLandmarkKind; unlocked: boolean }) {
  const robot = kind === 'query' || kind === 'brew' || kind === 'porter';
  return <group>
    <Box at={[0, .04, 0]} size={[4.3, .15, 3.15]} color={unlocked ? '#d5c7a7' : '#c5c7ab'}/>
    {[-1.25, -.62, 0, .62, 1.25].map(z => <Box key={z} at={[0, .123, z]} size={[4.18, .014, .025]} color="#b7b195"/>)}
    <group position={[0, .13, -.15]}>
      {robot ? <><group position={[-.45, 0, 0]} rotation-y={.25}><RobotModel color={kind === 'brew' ? '#7d9eae' : kind === 'porter' ? '#d4ac6b' : '#80a889'}/></group><group position={[1.05, 0, -.35]} scale={.65}><PatioTable tea={kind === 'brew'}/></group><group position={[-1.45, 0, -.7]} scale={.65}><Tree/></group></> : kind === 'crew' ? <>{['#80a889', '#7d9eae', '#d4ac6b'].map((color, i) => <group key={color} position={[(i - 1) * 1.15, 0, i === 1 ? -.5 : 0]}><RobotModel color={color}/></group>)}</> : kind === 'tables' || kind === 'cups' ? <><PatioTable tea={kind === 'cups'}/><group position={[1.4, 0, -1]} scale={.65}><FlowerBed/></group></> : <MarketCounter kind={kind}/>}
    </group>
    <group position={[-1.85, .13, 1]} scale={.6}><FlowerBed/></group><group position={[1.9, .13, -.9]} scale={.6}><Tree seed={2}/></group>
  </group>;
}

/** A flat curved ribbon forms the road; its raised edges and stones catch real shadows. */
function Road() {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(levels.map((_, index) => new Vector3(...trailWorld(trailPoint(index)))));
    const points = curve.getPoints(500), vertices: number[] = [], indices: number[] = [];
    points.forEach((point, index) => {
      const tangent = points[Math.min(index + 1, points.length - 1)].clone().sub(points[Math.max(0, index - 1)]).normalize();
      const normal = new Vector3(tangent.z, 0, -tangent.x).multiplyScalar(.58);
      vertices.push(point.x + normal.x, .025, point.z + normal.z, point.x - normal.x, .025, point.z - normal.z);
      if (index < points.length - 1) { const n = index * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    });
    const ribbon = new BufferGeometry();
    ribbon.setAttribute('position', new Float32BufferAttribute(vertices, 3));ribbon.setIndex(indices);ribbon.computeVertexNormals();
    return ribbon;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#d8c39c" roughness={1}/></mesh>;
}

const Scenery = memo(function Scenery({ first, last, unlocked }: { first: number; last: number; unlocked: number }) {
  return <>
    {Array.from({ length: last - first + 1 }, (_, n) => n + first).map(index => {
      const point = trailPoint(index), [, , z] = trailWorld(point);
      return <group key={index}>
        {[-1, 1].map(side => <group key={side} position={[side * 8, 0, z]}>
          <group position={[side * .6, 0, -.5]} scale={.85 + (index % 3) * .12}><Tree seed={index}/></group>
          <group position={[-side * .65, 0, .6]} scale={.65}><Tree seed={index + 1}/></group>
          <group position={[-side * .2, 0, 1.3]} rotation-y={side * .2} scale={.85}><FlowerBed seed={index}/></group>
          {index % 3 === 0 && <group position={[-side * 1.4, 0, -.8]} rotation-y={side * .3}><Bench/></group>}
          {index % 3 === 1 && <group position={[-side * 1.5, 0, -.8]}><Lamp/></group>}
          <Box at={[0, .45, -1.4]} size={[1.9, .1, .08]} color="#a99e76"/>{[-.85, .85].map(x => <Box key={x} at={[x, .35, -1.4]} size={[.08, .7, .08]} color="#a99e76"/>)}
        </group>)}
        {[-1, 1].map(side => <group key={`verge-${side}`} position={trailWorld({ x: point.x + side * 45, y: point.y + 33 })}><mesh rotation={[.2, index, .1]} scale={[.22, .14, .32]} castShadow><dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#b0b394"/></mesh><group position={[side * .2, 0, -.5]} scale={.28}><Tree seed={index}/></group></group>)}
      </group>;
    })}
    {trailLandmarks.filter(landmark => landmark.level - 1 >= first - 1 && landmark.level - 1 <= last + 1).map(landmark => <group key={landmark.level} position={trailWorld(landmarkPoint(landmark))}><Landmark kind={landmark.kind} unlocked={unlocked >= landmark.level - 1}/></group>)}
  </>;
});

function TrailWorld({ view, save }: { view: View; save: ProgressSave }) {
  const scale = view.width / TRAIL_WIDTH;
  const first = Math.max(0, Math.floor((view.scrollTop / scale - 130) / 94) - 3);
  const last = Math.min(levels.length - 1, Math.ceil(((view.scrollTop + view.height) / scale - 130) / 94) + 3);
  const length = TRAIL_HEIGHT / (TRAIL_UNITS * TRAIL_ELEVATION);
  return <><color attach="background" args={['#c5d0af']}/><TrailCamera {...view}/>
    <Box at={[0, -.28, length / 2]} size={[22, .5, length + 8]} color="#b8c69c"/>
    <Road/><Scenery first={Math.min(first, last)} last={last} unlocked={save.unlocked}/>
    {levels.map((level, index) => <group key={level.id} position={trailWorld(trailPoint(index))}>
      <Cylinder at={[0, TRAIL_STOP_HEIGHT / 2, 0]} size={[.49, .57, TRAIL_STOP_HEIGHT]} color={save.selected === index ? '#936d44' : save.stars[index] !== undefined ? '#759565' : index <= save.unlocked ? '#e6d9b8' : '#b5b69a'}/>
      {save.selected === index && <mesh position={[0, .035, 0]} rotation-x={-Math.PI / 2}><torusGeometry args={[.7, .035, 5, 32]}/><meshStandardMaterial color="#f5e1a9"/></mesh>}
    </group>)}
  </>;
}

/** The diorama is static between scrolls and selections, so the canvas renders
 * on demand instead of every frame. Note: R3F mounts `fallback` content into
 * the canvas element unconditionally, so it must never carry side effects —
 * a fallback that reports unavailability unmounts the scene on every load. */
function TrailInvalidator({ view, save }: { view: View; save: ProgressSave }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { invalidate(); }, [invalidate, view, save]);
  return null;
}

class TrailBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function TrailScene({ view, save, onUnavailable }: { view: View; save: ProgressSave; onUnavailable: () => void }) {
  return <div className="trail-scene" style={{ width: view.width }} aria-hidden="true"><TrailBoundary onUnavailable={onUnavailable}><Canvas orthographic frameloop="demand" shadows dpr={[1, 1.5]} camera={{ position: [0, 20, 15], near: .1, far: 250 }} gl={{ antialias: !save.settings.pixel_art, alpha: false }} onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', onUnavailable, { once: true })}>
    <TrailWorld view={view} save={save}/><TrailInvalidator view={view} save={save}/>{save.settings.pixel_art && <PixelArtEffect/>}
  </Canvas></TrailBoundary></div>;
}
