import { describe,it,expect } from 'vitest';
import { CAMERA_POSITION,CAMERA_TARGET,CAMERA_ELEVATION,cameraZoom,ENTRANCE,FURNITURE,isWalkable,gridRoute,ROOM,STATIONS,STARTS,TABLE_LAYOUT,tableFront,tableSeat,zoneAt } from '../src/domain/layout';
import type { Point } from '../src/domain/layout';

describe('shared café geometry',()=>{
 it('matches the room plan and integer non-overlapping footprints',()=>{
  expect(ROOM).toEqual([16,12]);expect(TABLE_LAYOUT).toHaveLength(10);expect(TABLE_LAYOUT.every(t=>t.depth===1)).toBe(true);expect(new Set(TABLE_LAYOUT.map(t=>t.x))).toEqual(new Set([1,5]));
  const occupied=new Set<string>();
  for(const f of FURNITURE){for(const v of [f.x,f.z,f.width,f.depth])expect(Number.isInteger(v)).toBe(true);for(let x=f.x;x<f.x+f.width;x++)for(let z=f.z;z<f.z+f.depth;z++){expect(x>=-8&&x<=7&&z>=-6&&z<=5).toBe(true);expect(occupied.has(`${x},${z}`)).toBe(false);occupied.add(`${x},${z}`);}}
  expect(zoneAt([-6,5])).toBe('query');expect(zoneAt([0,5])).toBe('prep');expect(zoneAt([-8,5])).toBe('room');expect(zoneAt([0,-4])).toBe('room');
  expect(ENTRANCE).toEqual([-8,5]);expect(FURNITURE.find(f=>f.id==='equipment')).toMatchObject({x:-6,z:4,width:14,depth:1});
  for(const station of Object.values(STATIONS))if('prep' in station)expect(station.prep[1]).toBe(5);
  for(let i=0;i<TABLE_LAYOUT.length;i++){expect(tableSeat(i,0)[0]).toBe(TABLE_LAYOUT[i].x-1);expect(tableSeat(i,1)[0]).toBe(TABLE_LAYOUT[i].x+1);}
  for(let z=-6;z<=3;z++)expect(isWalkable([3,z],'floor')).toBe(true);
 });
 it('connects every station and table within its worker area with cardinal steps',()=>{
  const prep:Point[]=Object.values(STATIONS).flatMap(s=>'prep' in s?[s.prep]:[]),floor:Point[]=[STATIONS.pickup.floor,STATIONS.returns.floor,STATIONS.dock.floor,...TABLE_LAYOUT.map((_,i)=>tableFront(i))];
  for(const [role,points] of [['prep',prep],['floor',floor]] as const)for(const target of points){const path=gridRoute(STARTS[role],target,role);expect(path.at(-1)).toEqual(target);path.forEach((p,i)=>{expect(isWalkable(p,role)).toBe(true);if(i)expect(Math.abs(p[0]-path[i-1][0])+Math.abs(p[1]-path[i-1][1])).toBe(1);});}
 });
 it('gives workers disjoint areas',()=>{for(let x=-8;x<=7;x++)for(let z=-6;z<=5;z++){const roles=['query','prep','floor'] as const;expect(roles.filter(r=>isWalkable([x,z],r)).length).toBeLessThanOrEqual(1);}});
 it('aligns the nearly overhead camera with the grid and frames scene bounds',()=>{
  expect(CAMERA_POSITION[0]).toBe(CAMERA_TARGET[0]);expect(Math.atan2(CAMERA_POSITION[1]-CAMERA_TARGET[1],CAMERA_POSITION[2]-CAMERA_TARGET[2])*180/Math.PI).toBeCloseTo(65);
  for(const [w,h] of [[660,440],[490,440],[340,300]]){const zoom=cameraZoom(w,h);expect(zoom*(ROOM[0]+1)).toBeLessThanOrEqual(w);expect(zoom*(ROOM[1]*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+1)).toBeLessThanOrEqual(h);}
 });
});
