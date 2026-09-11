export type Point = readonly [number,number];
export const ROOM = [14,19] as const;
const point=(x:number,y:number):Point=>[x/24-7,y/24-9.5];
export const ENTRANCE=point(204,450),ORDER=point(100,416),QUERY=point(76,371),MACHINE=point(54,101),DOOR=point(216,162),PASS_IN=point(264,128),PASS_OUT=point(264,181);
export const TABLES:Point[]=Array.from({length:10},(_,i)=>point(i%2?288:168,220+Math.floor(i/2)*48));
export function along(points:Point[],progress:number):Point{
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
  for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=remaining/Math.max(lengths[i],.00001);return [points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];}remaining-=lengths[i];}return points.at(-1)!;
}
/** Logical routes share the original 14 × 19 footprint and staff doorway. */
export function actorState(phase:number,tableIndex=0,manual=false,successful=true,tea=false,previousTea=tea){
  const p=Math.max(0,Math.min(1,phase)),table=TABLES[Math.max(0,Math.min(9,tableIndex))],machine=tea?point(120,101):MACHINE;
  const seat:Point=[table[0]+(tableIndex%2?-.83:.83),table[1]+.375],front:Point=[table[0],table[1]+.9167];
  const toSeat=[ORDER,point(120,440),point(216,440),[2,table[1]+1] as Point,[seat[0],table[1]+1] as Point,seat];
  const toKitchen=[QUERY,point(120,339),point(120,181),point(216,181),DOOR,point(216,111),machine];
  const toPass=[machine,point(180,111),point(264,111),PASS_IN],throughDoor=[PASS_IN,point(264,111),point(216,111),DOOR,point(216,181),PASS_OUT];
  const toTable=[PASS_OUT,point(216,181),[2,front[1]] as Point,front];
  let customer=along([ENTRANCE,point(128,440),ORDER],p/.12);
  if(p>=.2&&successful)customer=along(toSeat,(p-.2)/.14);
  if(p>=.76&&successful)customer=along([seat,[seat[0],table[1]+1],[2,table[1]+1],point(216,442),ENTRANCE],(p-.76)/.11);
  let niko=manual?QUERY:machine;
  if(!manual&&p<.2&&previousTea!==tea)niko=along([previousTea?point(120,101):MACHINE,machine],p/.2);
  if(successful){
    if(manual&&p>=.2)niko=along(toKitchen,(p-.2)/.14);
    if(p>=.43)niko=along(toPass,(p-.43)/.07);
    if(!manual&&p>=.58)niko=along([...toPass].reverse(),(p-.58)/.12);
    if(manual&&p>=.5)niko=along(throughDoor,(p-.5)/.08);
    if(manual&&p>=.58)niko=along(toTable,(p-.58)/.12);
    if(manual&&p>=.9)niko=along([front,[2,front[1]],point(216,339),point(72,339),QUERY],(p-.9)/.1);
  }
  let server=PASS_OUT;
  if(successful&&p>=.58)server=along(toTable,(p-.58)/.12);
  if(successful&&p>=.9)server=along([...toTable].reverse(),(p-.9)/.1);
  return {niko,server,customer,table,customerVisible:p<.87||!successful};
}
export function cameraZoom(width:number,height:number){return Math.min(width/25.5,height/21.5);}
