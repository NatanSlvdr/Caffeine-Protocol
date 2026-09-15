import { OrthographicCamera, Vector3 } from 'three';
import { describe,it,expect } from 'vitest';
import { CAMERA_POSITION,CAMERA_TARGET,CAMERA_ELEVATION,CAMERA_AZIMUTH,cameraZoom,ENTRANCE,FURNITURE,isWalkable,gridRoute,ROOM,BOUNDS,QUERY_TILES,MANUAL_INTAKE,STAFF_ENTRY,STATIONS,STARTS,TABLE_LAYOUT,tableFront,tableSeat,zoneAt,samePoint } from '../src/domain/layout';
import type { Point } from '../src/domain/layout';

describe('shared café geometry',()=>{
 it('matches the room plan and integer non-overlapping footprints',()=>{
  expect(ROOM).toEqual([16,12]);expect(TABLE_LAYOUT).toHaveLength(16);expect(TABLE_LAYOUT.every(t=>t.depth===1)).toBe(true);expect(new Set(TABLE_LAYOUT.map(t=>t.x))).toEqual(new Set([-6,-2,2,6]));
  for(const z of [-5,-3,-1,1])expect(TABLE_LAYOUT.filter(table=>table.z===z)).toHaveLength(4);
  const occupied=new Set<string>();
  for(const f of FURNITURE){for(const v of [f.x,f.z,f.width,f.depth])expect(Number.isInteger(v)).toBe(true);for(let x=f.x;x<f.x+f.width;x++)for(let z=f.z;z<f.z+f.depth;z++){expect(x>=BOUNDS.minX&&x<=BOUNDS.maxX&&z>=BOUNDS.minZ&&z<=BOUNDS.maxZ).toBe(true);expect(occupied.has(`${x},${z}`)).toBe(false);occupied.add(`${x},${z}`);}}
  expect(zoneAt([-4,5])).toBe('query');expect(zoneAt([-5,5])).toBe('query');expect(zoneAt([-2,5])).toBe('prep');expect(zoneAt([-8,5])).toBe('room');expect(zoneAt([0,-4])).toBe('room');
  expect(ENTRANCE).toEqual([BOUNDS.minX,BOUNDS.maxZ]);expect(FURNITURE.find(f=>f.id==='storage')).toMatchObject({x:-1,z:4,width:2,depth:1});expect(FURNITURE.find(f=>f.id==='equipment')).toMatchObject({x:1,z:4,width:7,depth:1});
  for(const station of Object.values(STATIONS))if('prep' in station){expect(station.prep[1]).toBe(BOUNDS.maxZ);expect(isWalkable(station.prep,'prep')).toBe(true);}
  expect(STATIONS.grinder.cell).toEqual(STATIONS.brewer.cell);
  expect(STATIONS.grinder.prep).toEqual(STATIONS.brewer.prep);
  expect(STATIONS.returns.cell).toEqual(STATIONS.water.cell);
  expect(STATIONS.returns.floor).toEqual([STATIONS.water.cell[0],STATIONS.water.cell[1]-1]);
  expect(Math.abs(STATIONS.pickup.cell[0]-STATIONS.water.cell[0])).toBe(1);
  expect(FURNITURE).toEqual(expect.arrayContaining([expect.objectContaining({id:'register-corner'}),expect.objectContaining({id:'handoff-corner'})]));
  expect(isWalkable(STAFF_ENTRY)).toBe(true);
  for(let i=0;i<TABLE_LAYOUT.length;i++){expect(tableSeat(i,0)[0]).toBe(TABLE_LAYOUT[i].x-1);expect(tableSeat(i,1)[0]).toBe(TABLE_LAYOUT[i].x+1);}
  for(let z=BOUNDS.minZ;z<=3;z++)expect(isWalkable([4,z],'floor')).toBe(true);
 });
 it('connects every station and table within its worker area with cardinal steps',()=>{
  const prep:Point[]=Object.values(STATIONS).flatMap(s=>'prep' in s?[s.prep]:[]),floor:Point[]=[STATIONS.pickup.floor,STATIONS.returns.floor,...TABLE_LAYOUT.map((_,i)=>tableFront(i))];
  for(const [role,points] of [['prep',prep],['floor',floor]] as const)for(const target of points){const path=gridRoute(STARTS[role],target,role);expect(path.at(-1)).toEqual(target);path.forEach((p,i)=>{expect(isWalkable(p,role)).toBe(true);if(i)expect(Math.abs(p[0]-path[i-1][0])+Math.abs(p[1]-path[i-1][1])).toBe(1);});}
 });
 it('keeps customer access open through the furnished lounge',()=>{
  for(const target of [STATIONS.orders.floor,...TABLE_LAYOUT.map((_,i)=>tableFront(i))]){
   const path=gridRoute(ENTRANCE,target);
   expect(path.at(-1)).toEqual(target);
   expect(path.every(p=>isWalkable(p))).toBe(true);
  }
 });
 it('encloses exactly two Query tiles with counters and shares the handoff with prep',()=>{
  const {orders}=STATIONS;
  expect(isWalkable(orders.cell)).toBe(false);
  expect(orders.query).toEqual(QUERY_TILES[0]);
  expect(orders.prep).toEqual([orders.cell[0]+1,orders.cell[1]]);
  expect(isWalkable(orders.prep,'query')).toBe(false);
  expect(isWalkable(orders.query,'prep')).toBe(false);
  const query:Point[]=[];
  for(let x=BOUNDS.minX;x<=BOUNDS.maxX;x++)for(let z=BOUNDS.minZ;z<=BOUNDS.maxZ;z++)if(isWalkable([x,z],'query'))query.push([x,z]);
  expect(query).toEqual(QUERY_TILES);
  expect(query.every(([,z])=>z===BOUNDS.maxZ)).toBe(true);
  for(const [x,z] of query)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const neighbor:Point=[x+dx,z+dz];
   if(neighbor[1]<=BOUNDS.maxZ&&!isWalkable(neighbor,'query'))expect(FURNITURE.some(f=>f.kind==='counter'&&neighbor[0]>=f.x&&neighbor[0]<f.x+f.width&&neighbor[1]>=f.z&&neighbor[1]<f.z+f.depth)).toBe(true);
  }
  expect(()=>gridRoute(STARTS.query,STARTS.prep)).toThrow('No human route');
 });
 it('has one straight prep aisle and an accessible staff opening',()=>{
  const prep:Point[]=[];
  for(let x=BOUNDS.minX;x<=BOUNDS.maxX;x++)for(let z=BOUNDS.minZ;z<=BOUNDS.maxZ;z++)if(isWalkable([x,z],'prep'))prep.push([x,z]);
  expect(prep).toEqual(Array.from({length:10},(_,i)=>[i-2,BOUNDS.maxZ]));
  const staffRoute=gridRoute(MANUAL_INTAKE,STARTS.prep);
  expect(staffRoute).toContainEqual(STAFF_ENTRY);
  expect(staffRoute.at(-1)).toEqual(STARTS.prep);
 });
 it('brings customers from the bottom-left corner to the counter’s left side',()=>{
  expect(gridRoute(ENTRANCE,STATIONS.orders.floor)).toEqual([[-8,5],[-7,5]]);
  expect(STATIONS.orders.floor).toEqual([STATIONS.orders.customerCounter[0]-1,STATIONS.orders.customerCounter[1]]);
  for(let i=0;i<TABLE_LAYOUT.length;i++){
   const outbound=gridRoute(STATIONS.orders.floor,tableFront(i));
   const inbound=gridRoute(tableFront(i),STATIONS.orders.floor);
   expect(outbound.every(p=>zoneAt(p)==='room'||samePoint(p,STATIONS.orders.floor))).toBe(true);
   expect(inbound).toHaveLength(outbound.length);
   expect(inbound.every(point=>isWalkable(point))).toBe(true);
   expect(inbound.at(-1)).toEqual(STATIONS.orders.floor);
  }
 });
 it('gives workers disjoint areas',()=>{for(let x=-8;x<=7;x++)for(let z=-6;z<=BOUNDS.maxZ;z++){const roles=['query','prep','floor'] as const;expect(roles.filter(r=>isWalkable([x,z],r)).length).toBeLessThanOrEqual(1);}});
 it('reveals the side wall while keeping the complete diorama inside the camera',()=>{
  const dx=CAMERA_POSITION[0]-CAMERA_TARGET[0],dy=CAMERA_POSITION[1]-CAMERA_TARGET[1],dz=CAMERA_POSITION[2]-CAMERA_TARGET[2];
  expect(Math.atan2(dx,dz)).toBeCloseTo(CAMERA_AZIMUTH);
  expect(Math.atan2(dy,Math.hypot(dx,dz))).toBeCloseTo(CAMERA_ELEVATION);
  expect(dx).toBeGreaterThan(0);
  for(const [width,height] of [[660,440],[490,440],[340,300]]){
   const camera=new OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,150);
   camera.position.set(...CAMERA_POSITION);camera.lookAt(...CAMERA_TARGET);camera.zoom=cameraZoom(width,height);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   for(const x of [-15.3,7.5])for(const z of [-6.7,5.5])for(const y of [-.8,3.1]){
    const projected=new Vector3(x,y,z).project(camera);
    expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
   }
  }
 });
});
