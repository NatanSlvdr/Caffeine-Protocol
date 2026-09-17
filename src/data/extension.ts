import type { Customer, LevelDefinition, RobotPrograms, ServiceConfig } from '@/domain/types';
import { preparationSource, floorSource } from '@/domain/defaultPrograms';
import { TABLE_LAYOUT } from '@/domain/layout';
import campaign from './campaign.json' with {type:'json'};
import targets from './service-targets.json' with {type:'json'};
/** Query reference solution for extension shifts (Act I finale), keyed by LessonSeed id in Phase 3. */
const queryReference=campaign.lessons[13].solution;
const titles=['A second pair of hands','Count the tiles','From bean to cup','Time for tea','A spoonful of precision','A recipe worth keeping','Two cups in hand','The kitchen is yours','Meet Porter','A path to the table','There and back','A clean table','Keep the room moving','A clear route','A tray for two','The floor is yours','Three routines, one café','The whole café is yours'];
const notes=[
 'Brew claims tickets from Query at the shared order counter. Read the supplied recipe and complete the missing drink deposit at pickup. Niko still serves the room.',
 'MOVE uses screen directions and whole tile counts. A blocked move stops early and the next instruction runs. Fix the route to the ingredients.',
 'Coffee needs beans, grinding, water, then brewing. Every action happens beside its labeled station.',
 'Tea uses leaves, water, and steeping. Branch on the current ticket to choose the recipe.',
 'After brewing, visit sugar and apply the ticket’s requested amount, including zero.',
 'Move a repeated recipe into FUNCTION recipe. CALL recipe handles the oldest unfinished ticket.',
 'Brew now holds two cups. Claim two tickets before preparing them. Finished drinks leave in pickup order.',
 'Keep Query and Brew working through mixed tickets and sugar requests. Niko owns delivery until Porter arrives.',
 'Porter owns floor work now. WAIT DRINK claims a delivery; TAKE down collects it from the outside of the kitchen counter.',
 'Read the assigned TABLE, count the route, and SERVE beside that table. Furniture blocks movement; customers do not.',
 'Return to pickup before the next delivery. The same floor plan and tile coordinates remain across every shift.',
 'WAIT DIRTY selects a used cup. COLLECT at its table, then RETURN CUPS at the return station.',
 'Keep Porter moving between pickup and the tables. Finish each delivery and return for the next drink.',
 'Plan the complete delivery and clearing route. Return used cups before starting the next round.',
 'Porter now holds two items. Take two drinks before serving, then clear both tables. FIFO keeps the tray predictable.',
 'Combine routes, clearing, and batching. Each robot works in its own area.',
 'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing.',
];
export function referencePrograms(level:number):RobotPrograms{return {query:queryReference,prep:preparationSource(level,level>=21?2:1),floor:floorSource(level,level>=29?2:1,level>=31?TABLE_LAYOUT.length:level>=29?4:level>=24?2:1)};}
export const extensionLevels:LevelDefinition[]=titles.map((title,i)=>{
 const level=i+15,batch=level>=21?2:1;
 const service:ServiceConfig={prepCapacity:batch,floorCapacity:level>=29?2:1,clearing:true,objective:'serve',minLoad:level===21||level===29?2:0};
 const active_tables=level>=31?TABLE_LAYOUT.length:level>=29?4:level>=24?2:1;
 const seeds=Array.from({length:3},(_,seed)=>{
  const count=level>=31?12:level>=29?8:level>=21?4:2;
  const customers:Customer[]=Array.from({length:count},(_,n)=>{
   const drink=level>=18&&(n+seed)%2?'tea' as const:'coffee' as const,sugar_count=level>=19?(n+seed)%3:0;
   const intent={confidence:'clear' as const,drink,sugar_count};
   if(level===32&&n%4===0)return {customer_id:`C${n+1}`,arrival:n*4,phrase:'Our usual, please',intent:{confidence:'ambiguous'},heard_orders:[{tokens:['ambiguous']}],clarification_heard_orders:[{tokens:[drink,'sugar','number'],number:sugar_count}],clarification:`${drink}, ${sugar_count} sugars`,clarification_intent:intent,expected:{item:drink,sugar_count,ask_help:true}};
   if(level===32&&n%4===1)return {customer_id:`C${n+1}`,arrival:n*4,phrase:'Coffee with 0 sugar and tea with 2 sugars, please',heard_orders:[{tokens:['coffee','sugar','number'],number:0},{tokens:['tea','sugar','number'],number:2}],intent:{orders:[{drink:'coffee',sugar_count:0},{drink:'tea',sugar_count:2}]},expected:{tickets:[{item:'coffee',sugar_count:0},{item:'tea',sugar_count:2}]}};
   return {customer_id:`C${n+1}`,arrival:n*(level>=31?4:10),phrase:`${drink}, ${sugar_count} sugars`,heard_orders:[{tokens:[drink,'sugar','number'],number:sugar_count}],intent,expected:{item:drink,sugar_count}};
  });
  // Batch lessons have an even number of tickets, including grouped final orders.
  if(customers.reduce((n,c)=>n+(c.expected.tickets?.length??1),0)%2)customers.push({customer_id:`C${count+1}`,arrival:count*4,phrase:'Coffee with 0 sugar',heard_orders:[{tokens:['coffee','sugar','number'],number:0}],intent:{drink:'coffee',sugar_count:0},expected:{item:'coffee',sugar_count:0}});
  return {id:`L${level}_${String.fromCharCode(65+seed)}`,customers};
 });
 const target=targets[i];
 return {id:`L${level}`,title:`Level ${level}: ${title}`,summary:notes[i],programming_enabled:true,block_target:target.blocks,instruction_target:target.instructions,reference_block_count:target.blocks,seeds,active_tables,service,act:level<23?2:level<31?3:4};
});
export const extensionLessons=extensionLevels.map((_,i)=>{
 const level=i+15,role=level<23?'prep':'floor',programs=referencePrograms(level),starter={...programs};
 const omissions=['DEPOSIT','MOVE UP','GRIND','STEEP','ADD SUGAR','CALL recipe','WAIT TICKET','DEPOSIT','TAKE','SERVE','MOVE UP','COLLECT','SERVE','RETURN CUPS','TAKE','RETURN CUPS','ADD SUGAR','SERVE'];
 const needle=omissions[i];starter[role]=starter[role].replace(new RegExp(`^${needle}[^\\n]*$`,'m'),`# TODO: ${needle}`);
 if(level>=31){starter.query=campaign.lessons[2].solution;starter.prep=programs.prep.replace('ADD SUGAR','# TODO: apply requested sugar');}
 return {note:notes[i],starter:starter.query,solution:programs.query,robotStarter:starter,robotSolution:programs};
});
