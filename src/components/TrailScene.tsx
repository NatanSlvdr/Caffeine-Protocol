import { Component, memo, useEffect, useLayoutEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Object3D, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';
import { levels } from '../data';
import { landmarkPoint, trailLandmarks, trailPoint, trailWorld, TRAIL_ELEVATION, TRAIL_HEIGHT, TRAIL_STOP_HEIGHT, TRAIL_UNITS, TRAIL_WIDTH } from '../domain/campaignTrail';
import type { TrailLandmarkKind } from '../domain/campaignTrail';
import type { ProgressSave } from '../domain/types';
import { Appliance, Box, Cup, Cylinder, RobotModel, SugarCubes } from './CafeModels';
import { PixelArtEffect } from './PixelArtEffect';

type View = { width: number; height: number; scrollTop: number };
const DUSK_SKY = '#5d6f93';
const clay = '#b78268', wood = '#775b43', cream = '#e7d6ad';

/** Deterministic variation so the street looks hand-placed on every visit. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type District = 'row' | 'quarter' | 'promenade';
function district(index: number): District {
  return index >= 22 ? 'promenade' : index >= 14 ? 'quarter' : 'row';
}
const DISTRICT_WALLS: Record<District, string[]> = {
  row: ['#e8d9bd', '#dfc9a8', '#d9bfa0', '#e3cfae'],
  quarter: ['#a5695c', '#96584b', '#b07a5e', '#9c6a58'],
  promenade: ['#7d9eae', '#6e8b99', '#d4ac6b', '#8ba3b5'],
};
const DISTRICT_ROOFS: Record<District, string> = { row: '#7a5c48', quarter: '#4a3f3a', promenade: '#3f4a55' };
const DISTRICT_TRIM: Record<District, string> = { row: '#8a6a4f', quarter: '#5d4438', promenade: '#46525e' };

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
  return <><primitive object={target}/><ambientLight intensity={.75} color="#c3cede"/><hemisphereLight args={['#a8b8d8', '#55584a', .9]}/><directionalLight position={[-8, 16, center + 8]} target={target} intensity={2.4} color="#ffd9a3" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={60} shadow-normalBias={.045}/></>;
}

function Tree({ seed = 0, scale = 1 }: { seed?: number; scale?: number }) {
  return <group scale={scale}><Cylinder at={[0, .7, 0]} size={[.11, .17, 1.4]} color={wood}/>{[-1, 0, 1].map((n) => <mesh key={n} position={[n * .38, 1.5 + (n === 0 ? .48 : 0), n * .2]} scale={[.72, .83, .65]} castShadow><icosahedronGeometry args={[1, 1]}/><meshStandardMaterial color={['#5d7355', '#6b8261', '#77876b'][(seed + n + 3) % 3]} roughness={1}/></mesh>)}</group>;
}
function FlowerBed({ seed = 0 }: { seed?: number }) {
  return <group><Box at={[0, .12, 0]} size={[1.6, .24, .65]} color={clay}/><Box at={[0, .25, 0]} size={[1.43, .035, .5]} color="#4a4638"/>{[-.52, -.17, .17, .52].map((x, i) => <group key={x}><Cylinder at={[x, .42, 0]} size={[.025, .03, .35]} color="#5c7050"/><mesh position={[x, .61 + i % 2 * .1, 0]} castShadow><icosahedronGeometry args={[.15, 0]}/><meshStandardMaterial color={['#e0aa5e', '#d18c78', '#e9d7a4'][(i + seed) % 3]} emissive={['#e0aa5e', '#d18c78', '#e9d7a4'][(i + seed) % 3]} emissiveIntensity={.25}/></mesh></group>)}</group>;
}
function Bench() {
  return <group>{[-.55, .55].map(x => <Box key={x} at={[x, .28, 0]} size={[.12, .55, .55]} color={wood}/>)}{[-.22, 0, .22].map(z => <Box key={z} at={[0, .59, z]} size={[1.7, .12, .18]} color="#bc966a"/>)}<Box at={[0, .94, -.28]} size={[1.7, .5, .09]} color="#bc966a"/></group>;
}
function Lamp() {
  return <group><Cylinder at={[0, .1, 0]} size={[.23, .3, .2]} color="#46505c"/><Cylinder at={[0, 1.3, 0]} size={[.045, .07, 2.5]} color="#3c4450"/><Box at={[0, 2.55, 0]} size={[.4, .48, .4]} color="#ffe3a8" /><mesh position={[0, 2.55, 0]}><boxGeometry args={[.34, .42, .34]}/><meshStandardMaterial color="#ffe3a8" emissive="#ffbe6e" emissiveIntensity={1.6}/></mesh><Box at={[0, 2.82, 0]} size={[.57, .1, .57]} color="#3c4450"/></group>;
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

function Window({ at, lit }: { at: [number, number, number]; lit: boolean }) {
  return <mesh position={at}>
    <boxGeometry args={[.5, .62, .1]}/>
    {lit
      ? <meshStandardMaterial color="#ffd9a0" emissive="#ffbe6e" emissiveIntensity={1.35}/>
      : <meshStandardMaterial color="#232c3a" roughness={.4} metalness={.3}/>}
  </mesh>;
}

type BuildingState = 'complete' | 'open' | 'selected';
/** One shopfront on the street. Locked shifts never reach here — they render as ghost lots. */
function Building({ seed, district: districtName, state, landmark = false, shop = false }: {
  seed: number; district: District; state: BuildingState; landmark?: boolean; shop?: boolean;
}) {
  const walls = DISTRICT_WALLS[districtName];
  const wall = walls[Math.floor(hash(seed * 3 + 1) * walls.length)];
  const width = (landmark ? 3.2 : 2.4) + hash(seed * 5 + 2) * .9;
  const height = (landmark ? 3.6 : 2.4) + hash(seed * 7 + 3) * 1.3 + (districtName === 'quarter' ? .4 : 0);
  const depth = 2.2 + hash(seed * 11 + 4) * .5;
  const floors = landmark ? 3 : 2;
  const lit = state !== 'open' ? true : false;
  const chimney = districtName === 'quarter' || hash(seed * 13 + 5) > .6;
  const awning = shop || landmark;
  return <group>
    <Box at={[0, height / 2, 0]} size={[width, height, depth]} color={wall}/>
    <Box at={[0, height + .12, 0]} size={[width + .25, .24, depth + .25]} color={DISTRICT_ROOFS[districtName]}/>
    <Box at={[0, height + .3, 0]} size={[width + .1, .22, depth + .1]} color={DISTRICT_TRIM[districtName]}/>
    {chimney && <><Box at={[width * .28, height + .7, -.3]} size={[.42, 1.2, .42]} color={DISTRICT_TRIM[districtName]}/><Box at={[width * .28, height + 1.32, -.3]} size={[.54, .14, .54]} color={DISTRICT_ROOFS[districtName]}/></>}
    {Array.from({ length: floors }, (_, floor) => [-1, 1].map(side => {
      const groundLit = state === 'complete' || state === 'selected' || floor === 0;
      return <Window key={`${floor}-${side}`} at={[side * width * .26, 1.15 + floor * ((height - 1.3) / Math.max(1, floors - 1)), depth / 2]} lit={lit || groundLit}/>;
    }))}
    <Box at={[0, .62, depth / 2 + .02]} size={[.72, 1.24, .12]} color={state === 'selected' ? '#ffca7a' : '#3a3230'}/>
    <Box at={[0, 1.98, depth / 2 + .03]} size={[1.15, .3, .1]} color={landmark ? '#ffca7a' : DISTRICT_TRIM[districtName]}/>
    {landmark && <mesh position={[0, 1.98, depth / 2 + .04]}><boxGeometry args={[1.05, .22, .06]}/><meshStandardMaterial color="#ffca7a" emissive="#ff9e4e" emissiveIntensity={.9}/></mesh>}
    <mesh position={[width * .32, 1.1, depth / 2 + .06]}><sphereGeometry args={[.09, 10, 8]}/><meshStandardMaterial color="#ffd9a0" emissive="#ffbe6e" emissiveIntensity={state === 'open' && !lit ? .4 : 1.6}/></mesh>
    {awning && <group position={[0, 2.62, depth / 2 + .55]} rotation-x={.18}>
      {Array.from({ length: 7 }, (_, i) => <Box key={i} at={[-1.2 + i * .4, 0, 0]} size={[.4, .1, 1.3]} color={i % 2 ? '#f2e6c8' : districtName === 'promenade' ? '#7d9eae' : '#a1ae88'}/>)}
    </group>}
  </group>;
}

/** Locked shifts are visibly unfinished: a translucent massing model with scaffolding. */
function GhostLot({ seed }: { seed: number }) {
  const width = 2.4 + hash(seed * 5 + 2) * .9;
  const height = 2.6 + hash(seed * 7 + 3) * 1.2;
  const depth = 2.2;
  return <group>
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[width, height, depth]}/>
      <meshStandardMaterial color="#a9c2dd" transparent opacity={.42} roughness={.9}/>
    </mesh>
    <mesh position={[0, height + .02, 0]}>
      <boxGeometry args={[width, .04, depth]}/>
      <meshStandardMaterial color="#c4d8ea" transparent opacity={.6}/>
    </mesh>
    {[-1, 1].map(side => [-1, 1].map(front => <group key={`${side}${front}`}>
      <Cylinder at={[side * (width / 2 + .35), 1.5, front * (depth / 2 + .35)]} size={[.05, .05, 3]} color="#6b5d4f"/>
      {front > 0 && <Box at={[side * (width / 2 + .35), 1.5 + side, 0]} size={[.08, .08, depth + .7]} color="#7d6c58"/>}
    </group>))}
    <Box at={[0, .5, depth / 2 + .4]} size={[1.5, 1, .08]} color="#5d6b7d"/>
  </group>;
}

function StringLightSpan({ width = 6.8 }: { width?: number }) {
  const curve = useMemo(() => new QuadraticBezierCurve3(
    new Vector3(-width / 2, 3.1, 0), new Vector3(0, 2.15, 0), new Vector3(width / 2, 3.1, 0),
  ), [width]);
  const geometry = useMemo(() => new TubeGeometry(curve, 20, .025, 6), [curve]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const bulbs = useMemo(() => Array.from({ length: 7 }, (_, i) => curve.getPoint((i + 1) / 8)), [curve]);
  return <group>
    {[-1, 1].map(side => <Cylinder key={side} at={[side * width / 2, 1.55, 0]} size={[.06, .08, 3.1]} color="#4a3f36"/>)}
    <mesh geometry={geometry}><meshStandardMaterial color="#3a332c"/></mesh>
    {bulbs.map((p, i) => <group key={i} position={p}>
      <mesh position={[0, -.1, 0]}><sphereGeometry args={[.09, 10, 8]}/><meshStandardMaterial color={i % 2 ? '#ffc7d6' : '#ffd9a0'} emissive={i % 2 ? '#ff9ebb' : '#ffbe6e'} emissiveIntensity={2}/></mesh>
      <Cylinder at={[0, -.02, 0]} size={[.015, .015, .08]} color="#3a332c"/>
    </group>)}
  </group>;
}

function Skyline() {
  const blocks = useMemo(() => {
    const list: { x: number; z: number; w: number; h: number; d: number }[] = [];
    const half = TRAIL_HEIGHT / (TRAIL_UNITS * TRAIL_ELEVATION);
    for (let k = 0; k < 13; k++) {
      const z = -4 + k * (half + 8) / 12;
      for (const side of [-1, 1]) {
        list.push({
          x: side * (17 + hash(k * 2 + (side > 0 ? 1 : 0)) * 7),
          z: z + (hash(k * 5 + side) - .5) * 4,
          w: 4 + hash(k * 7 + side) * 5,
          h: 3.5 + hash(k * 11 + side) * 7,
          d: 4 + hash(k * 13 + side) * 3,
        });
      }
    }
    return list;
  }, []);
  return <group>{blocks.map((b, i) => <group key={i} position={[b.x, 0, b.z]}>
    <mesh position={[0, b.h / 2, 0]}><boxGeometry args={[b.w, b.h, b.d]}/><meshStandardMaterial color="#3d4a63" roughness={1}/></mesh>
    {hash(i * 3) > .5 && <mesh position={[0, b.h + .15, 0]}><boxGeometry args={[.3, .3, .3]}/><meshStandardMaterial color="#ffca7a" emissive="#ff9e4e" emissiveIntensity={1.2}/></mesh>}
  </group>)}</group>;
}

/** Landmarks are the street's anchor shops, with the familiar faces out front. */
function Landmark({ kind, unlocked }: { kind: TrailLandmarkKind; unlocked: boolean }) {
  const robot = kind === 'query' || kind === 'brew' || kind === 'porter';
  const stall = kind === 'register' || kind === 'machine' || kind === 'sink';
  return <group>
    <Box at={[0, .04, 0]} size={[5.2, .15, 3.6]} color={unlocked ? '#c9b795' : '#8b93a5'}/>
    <group position={[0, .13, -1]}>
      <Building seed={kind.length * 17 + 3} district={robot && kind !== 'query' ? (kind === 'brew' ? 'quarter' : 'promenade') : 'row'} state={unlocked ? 'complete' : 'open'} landmark shop />
      <group position={[0, 0, 2.6]}>
        {unlocked ? <>
          {robot && <><group position={[-.5, 0, 0]} rotation-y={.3}><RobotModel color={kind === 'brew' ? '#7d9eae' : kind === 'porter' ? '#d4ac6b' : '#80a889'}/></group><group position={[1.2, 0, -.3]} scale={.65}><PatioTable tea={kind === 'brew'}/></group></>}
          {kind === 'crew' && ['#80a889', '#7d9eae', '#d4ac6b'].map((color, i) => <group key={color} position={[(i - 1) * 1.1, 0, 0]}><RobotModel color={color}/></group>)}
          {stall && <MarketCounter kind={kind}/>}
          {!robot && kind !== 'crew' && !stall && <><PatioTable tea={kind === 'tea' || kind === 'cups'}/><group position={[1.5, 0, -.8]} scale={.7}><FlowerBed/></group>{kind === 'sugar' && <group position={[-1.3, .35, 0]}><SugarCubes/></group>}</>}
        </> : <GhostLot seed={kind.length * 31 + 7}/>}
      </group>
    </group>
  </group>;
}

/** A warm cobbled ribbon forms the street; the stops sit on it like doorstones. */
function Road() {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(levels.map((_, index) => new Vector3(...trailWorld(trailPoint(index)))));
    const points = curve.getPoints(500), vertices: number[] = [], indices: number[] = [];
    points.forEach((point, index) => {
      const tangent = points[Math.min(index + 1, points.length - 1)].clone().sub(points[Math.max(0, index - 1)]).normalize();
      const normal = new Vector3(tangent.z, 0, -tangent.x).multiplyScalar(.72);
      vertices.push(point.x + normal.x, .025, point.z + normal.z, point.x - normal.x, .025, point.z - normal.z);
      if (index < points.length - 1) { const n = index * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    });
    const ribbon = new BufferGeometry();
    ribbon.setAttribute('position', new Float32BufferAttribute(vertices, 3));ribbon.setIndex(indices);ribbon.computeVertexNormals();
    return ribbon;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#c9b18c" roughness={1}/></mesh>;
}

const Scenery = memo(function Scenery({ first, last, unlocked, selected, stars }: { first: number; last: number; unlocked: number; selected: number; stars: Record<number, number> }) {
  return <>
    {Array.from({ length: last - first + 1 }, (_, n) => n + first).map(index => {
      const point = trailPoint(index), [, , z] = trailWorld(point);
      const side = index % 2 === 0 ? -1 : 1;
      const lateral = 3.8 + hash(index * 3 + 1) * 1.2;
      const along = (hash(index * 7 + 2) - .5) * 2;
      const bx = (point.x - TRAIL_WIDTH / 2) / TRAIL_UNITS + side * lateral;
      const locked = index > unlocked;
      const complete = stars[index] !== undefined;
      return <group key={index}>
        <group position={[bx, 0, z + along]} rotation-y={-side * Math.PI / 2 + (hash(index * 13) - .5) * .2}>
          {locked
            ? <GhostLot seed={index}/>
            : <Building seed={index} district={district(index)} state={index === selected ? 'selected' : complete ? 'complete' : 'open'} shop={district(index) === 'row' && index % 3 === 0}/>}
        </group>
        {!locked && <group position={[(bx + (point.x - TRAIL_WIDTH / 2) / TRAIL_UNITS) / 2, 0, z + along / 2]} rotation-y={-side * Math.PI / 2}>
          <Box at={[0, .06, 0]} size={[1.1, .12, 1.5]} color="#b89a72"/>
        </group>}
        {index % 5 === 2 && <group position={trailWorld(point)}><StringLightSpan/></group>}
        {index % 3 === 0 && <group position={trailWorld({ x: point.x - side * 130, y: point.y + 10 })}><Lamp/></group>}
        {index % 2 === 0 && <group position={trailWorld({ x: point.x + side * 105, y: point.y - 22 })} scale={.8}><FlowerBed seed={index}/></group>}
        {index % 4 === 1 && <group position={trailWorld({ x: point.x - side * 150, y: point.y - 30 })} scale={.9}><Tree seed={index}/></group>}
        {index % 6 === 4 && <group position={trailWorld({ x: point.x + side * 120, y: point.y + 26 })} rotation-y={side * .4}><Bench/></group>}
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
  return <><color attach="background" args={[DUSK_SKY]}/><fog attach="fog" args={[DUSK_SKY, 38, 105]}/><TrailCamera {...view}/>
    <Box at={[0, -.28, length / 2]} size={[34, .5, length + 8]} color="#5a6a50"/>
    <Skyline/>
    <mesh position={[15, 27, length * .3]}><sphereGeometry args={[1.6, 20, 20]}/><meshBasicMaterial color="#f7efda"/></mesh>
    <Road/><Scenery first={Math.min(first, last)} last={last} unlocked={save.unlocked} selected={save.selected} stars={save.stars}/>
    {levels.map((level, index) => <group key={level.id} position={trailWorld(trailPoint(index))}>
      <Cylinder at={[0, TRAIL_STOP_HEIGHT / 2, 0]} size={[.49, .57, TRAIL_STOP_HEIGHT]} color={save.selected === index ? '#e8a84c' : save.stars[index] !== undefined ? '#759565' : index <= save.unlocked ? '#e6d9b8' : '#6b7484'}/>
      {save.selected === index && <>
        <mesh position={[0, .035, 0]} rotation-x={-Math.PI / 2}><torusGeometry args={[.7, .035, 5, 32]}/><meshStandardMaterial color="#ffd98a" emissive="#ff9e4e" emissiveIntensity={.8}/></mesh>
        <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[.5, .62, 5.2, 20, 1, true]}/><meshStandardMaterial color="#ffca7a" emissive="#ff9e4e" emissiveIntensity={.5} transparent opacity={.14} depthWrite={false} side={DoubleSide}/></mesh>
      </>}
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
