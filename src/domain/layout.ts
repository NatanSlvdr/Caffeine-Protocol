import type { RobotRole } from './types';
export type Point = readonly [number, number];
export const ROOM = [16,12] as const;
export const BOUNDS={minX:-8,maxX:7,minZ:-6,maxZ:5} as const;
export const CAMERA_ELEVATION = 65*Math.PI/180;
// Adjust this value in degrees to change the slight sideways view.
export const CAMERA_ANGLE_DEGREES = 0;
export const CAMERA_AZIMUTH = CAMERA_ANGLE_DEGREES*Math.PI/180;
export const SCENE_SIZE=[24,ROOM[1]] as const;
export const CAMERA_TARGET = [-3.6,.2,-.5] as const;
export const CAMERA_POSITION: [number,number,number]=[CAMERA_TARGET[0]+Math.sin(CAMERA_AZIMUTH)*40/Math.tan(CAMERA_ELEVATION),CAMERA_TARGET[1]+40,CAMERA_TARGET[2]+Math.cos(CAMERA_AZIMUTH)*40/Math.tan(CAMERA_ELEVATION)];
export type Furniture = {id:string;kind:'counter'|'table'|'chair'|'plant';x:number;z:number;width:number;depth:number};
/** Four tables on each of four rows, with clear aisles between rows and beside the counter. */
export const TABLE_LAYOUT=[-5,-3,-1,1].flatMap(z=>[-6,-2,2,6].map(x=>[x,z])).map(([x,z],i)=>({id:`T${String(i+1).padStart(2,'0')}`,x,z,width:1,depth:1}));
export const TABLES:Point[]=TABLE_LAYOUT.map(t=>[t.x,t.z]);
export const tableFront=(index:number):Point=>{const t=TABLE_LAYOUT[index];return [t.x,t.z+1];};
export const tableSeat=(index:number,side:0|1):Point=>{const t=TABLE_LAYOUT[index];return [t.x+(side===0?-1:1),t.z+(t.depth-1)/2];};
/** The bottom border is a shared public/prep aisle; all appliance cells sit directly above it. */
export const STATIONS = {
 orders:{cell:[-3,5],customerCounter:[-6,5],query:[-5,5],prep:[-2,5],floor:[-7,5],label:'ORDER HANDOFF'},
 ingredients:{cell:[-1,4],prep:[-1,5],label:'STORAGE'},
 grinder:{cell:[2,4],prep:[2,5],label:'COFFEE MACHINE'},
 water:{cell:[7,4],prep:[7,5],label:'SINK'},
 brewer:{cell:[2,4],prep:[2,5],label:'COFFEE MACHINE'},
 sugar:{cell:[4,4],prep:[4,5],label:'SUGAR'},
 pickup:{cell:[6,4],prep:[6,5],floor:[6,3],label:'DRINK PICKUP'},
 returns:{cell:[7,4],prep:[7,5],floor:[7,3],label:'SINK'},
} as const;
export type StationId=keyof typeof STATIONS;
export const STARTS:Record<RobotRole,Point>={query:STATIONS.orders.query,prep:STATIONS.orders.prep,floor:STATIONS.pickup.floor};
export const ENTRANCE:Point=[BOUNDS.minX,BOUNDS.maxZ];
export const QUERY_TILES:readonly Point[]=[[-5,5],[-4,5]];
/** Before Query arrives, Niko serves the public counter from the same customer tile. */
export const MANUAL_INTAKE:Point=STATIONS.orders.floor;
/** The one opening from the room into the prep aisle is left of the first appliance. */
export const STAFF_ENTRY:Point=[-2,4];
export const FURNITURE:Furniture[]=[
 {id:'storage',kind:'counter',x:-1,z:4,width:2,depth:1},
 {id:'equipment',kind:'counter',x:1,z:4,width:7,depth:1},
 {id:'query-customer',kind:'counter',x:-6,z:5,width:1,depth:1},
 {id:'register-corner',kind:'counter',x:-6,z:4,width:1,depth:1},
 {id:'handoff',kind:'counter',x:-3,z:5,width:1,depth:1},
 {id:'handoff-corner',kind:'counter',x:-3,z:4,width:1,depth:1},
 {id:'query-back',kind:'counter',x:-5,z:4,width:2,depth:1},
 {id:'plant',kind:'plant',x:-8,z:-6,width:1,depth:1},
 ...TABLE_LAYOUT.flatMap(t=>[{...t,kind:'table' as const},...[-1,1].map(side=>({id:`${t.id}-chair-${side}`,kind:'chair' as const,x:t.x+side,z:t.z,width:1,depth:1}))]),
];
export function zoneAt([x,z]:Point):RobotRole|'room'{return z===BOUNDS.maxZ&&(x===-5||x===-4)?'query':z===BOUNDS.maxZ&&x>=-2?'prep':'room';}
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
/** Fit the café, neighboring street, and tallest fixtures with an edge-safe gutter. */
export function cameraZoom(width:number,height:number){return Math.max(1,Math.min(width/(SCENE_SIZE[0]*Math.cos(CAMERA_AZIMUTH)+SCENE_SIZE[1]*Math.sin(CAMERA_AZIMUTH)+1),height/((SCENE_SIZE[1]*Math.cos(CAMERA_AZIMUTH)+SCENE_SIZE[0]*Math.sin(CAMERA_AZIMUTH))*Math.sin(CAMERA_ELEVATION)+3.4*Math.cos(CAMERA_ELEVATION)+1)));}
