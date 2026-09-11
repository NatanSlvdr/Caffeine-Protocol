import type { RobotRole } from './types';
export type Point = readonly [number, number];
export const ROOM = [16,12] as const;
export const BOUNDS={minX:-8,maxX:7,minZ:-6,maxZ:5} as const;
export const CAMERA_ELEVATION = 65*Math.PI/180;
export const CAMERA_TARGET = [-.5,.2,-.5] as const;
export const CAMERA_POSITION: [number,number,number]=[-.5,CAMERA_TARGET[1]+40,-.5+40/Math.tan(CAMERA_ELEVATION)];
export type Furniture = {id:string;kind:'counter'|'table'|'chair'|'plant';x:number;z:number;width:number;depth:number};
export const TABLE_LAYOUT=Array.from({length:10},(_,i)=>({id:`T${String(i+1).padStart(2,'0')}`,x:[1,5][i%2],z:-6+Math.floor(i/2)*2,width:1,depth:1}));
/** Extra lounge seating fills the west side without changing numbered service tables. */
export const LOUNGE_TABLES = [-5,-2,1].flatMap(z=>[-6,-3].map(x=>({id:`lounge-${x}-${z}`,x,z,width:1,depth:1})));
export const DECOR_PLANTS = [{x:-8,z:-3},{x:-8,z:0},{x:-1,z:-6},{x:7,z:-6}];
export const TABLES:Point[]=TABLE_LAYOUT.map(t=>[t.x,t.z]);
export const tableFront=(index:number):Point=>{const t=TABLE_LAYOUT[index];return [t.x,t.z+1];};
export const tableSeat=(index:number,side:0|1):Point=>{const t=TABLE_LAYOUT[index];return [t.x+(side===0?-1:1),t.z+(t.depth-1)/2];};
/** Intake and prep share a counter; ingredients, brewing, pickup and washing have distinct stations. */
export const STATIONS = {
 orders:{cell:[-4,5],customerCounter:[-7,5],query:[-5,5],prep:[-3,5],floor:[-8,5],label:'ORDER HANDOFF'},
 ingredients:{cell:[-2,4],prep:[-2,5],label:'DRY + COLD'},
 grinder:{cell:[1,4],prep:[1,5],label:'GRIND'},
 water:{cell:[6,4],prep:[6,5],label:'WASH + RETURNS'},
 brewer:{cell:[3,4],prep:[3,5],label:'BREW'},
 sugar:{cell:[-1,4],prep:[-1,5],label:'SUGAR'},
 pickup:{cell:[5,4],prep:[5,5],floor:[5,3],label:'DRINK PICKUP'},
 returns:{cell:[7,4],prep:[7,5],floor:[7,3],label:'RETURNS'},
 dock:{cell:[-7,2],floor:[-7,3],label:'CHARGE'},
} as const;
export type StationId=keyof typeof STATIONS;
export const STARTS:Record<RobotRole,Point>={query:STATIONS.orders.query,prep:STATIONS.orders.prep,floor:STATIONS.pickup.floor};
export const ENTRANCE:Point=[BOUNDS.minX,BOUNDS.maxZ];
export const QUERY_TILES:readonly Point[]=[[-6,5],[-5,5]];
/** Before Query arrives, Niko serves the public counter without entering the enclosed booth. */
export const MANUAL_INTAKE:Point=[-8,4];
export const STAFF_ENTRY:Point=[-3,4];
export const FURNITURE:Furniture[]=[
 {id:'equipment',kind:'counter',x:1,z:4,width:7,depth:1},
 {id:'query-customer',kind:'counter',x:-7,z:4,width:1,depth:2},
 {id:'handoff',kind:'counter',x:-4,z:4,width:1,depth:2},
 {id:'query-back',kind:'counter',x:-6,z:4,width:2,depth:1},
 {id:'storage',kind:'counter',x:-2,z:4,width:2,depth:1},
 {id:'fridge',kind:'counter',x:0,z:4,width:1,depth:1},
 {id:'plant',kind:'plant',x:-8,z:-6,width:1,depth:1},
 ...DECOR_PLANTS.map((p,i)=>({id:`decor-plant-${i}`,kind:'plant' as const,...p,width:1,depth:1})),
 ...LOUNGE_TABLES.flatMap(t=>[{...t,kind:'table' as const},...[-1,1].map(side=>({id:`${t.id}-chair-${side}`,kind:'chair' as const,x:t.x+side,z:t.z,width:1,depth:1}))]),
 ...TABLE_LAYOUT.flatMap(t=>[{...t,kind:'table' as const},{id:`${t.id}-chair`,kind:'chair' as const,x:t.x+1,z:t.z,width:1,depth:1}]),
];
export function zoneAt([x,z]:Point):RobotRole|'room'{return z===BOUNDS.maxZ&&(x===-6||x===-5)?'query':z===BOUNDS.maxZ&&x>=-3?'prep':'room';}
export const samePoint=(a:Point,b:Point)=>a[0]===b[0]&&a[1]===b[1];
export function isWalkable([x,z]:Point,role?:RobotRole){return Number.isInteger(x)&&Number.isInteger(z)&&x>=BOUNDS.minX&&x<=BOUNDS.maxX&&z>=BOUNDS.minZ&&z<=BOUNDS.maxZ&&!FURNITURE.some(f=>x>=f.x&&x<f.x+f.width&&z>=f.z&&z<f.z+f.depth)&&(!role||(role==='floor'?zoneAt([x,z])==='room':zoneAt([x,z])===role));}
const cache=new Map<string,Point[]>();
/** Scripted humans and reference programs use cardinal routes; MOVE itself never pathfinds. */
export function gridRoute(start:Point,end:Point,role?:RobotRole):Point[]{
 const key=(p:Point)=>p.join(','),id=`${key(start)}:${key(end)}:${role??'human'}`;const found=cache.get(id);if(found)return found;
 const queue:Point[][]=[[start]],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){const path=queue[i],p=path[path.length-1];if(samePoint(p,end)){cache.set(id,path);return path;}for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const next:Point=[p[0]+dx,p[1]+dz];if(!seen.has(key(next))&&isWalkable(next,role)){seen.add(key(next));queue.push([...path,next]);}}}
 throw new Error(`No ${role??'human'} route from ${start} to ${end}`);
}
/** Fit the complete room, walls, and actors with a small edge-safe gutter. */
export function cameraZoom(width:number,height:number){return Math.max(1,Math.min(width/(ROOM[0]+1),height/(ROOM[1]*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+1)));}
