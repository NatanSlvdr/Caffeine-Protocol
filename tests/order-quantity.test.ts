import {describe,it,expect} from 'vitest';
import {levels} from '../src/data';
import {compileProgram,executeCustomerEvent,migrateQuerySource} from '../src/domain/program';
import {runLevel,validate} from '../src/domain/simulation';
import {createLiveRun} from '../src/domain/liveSimulation';
import {sampleReplay} from '../src/domain/replay';

const customer={...levels[8].seeds[0].customers[0],heard_orders:[{tokens:['coffee']},{tokens:['coffee']}],expected:{tickets:[{item:'coffee' as const},{item:'coffee' as const}]}};
const level={...levels[8],seeds:[{id:'quantity',customers:[customer]}]};
const source='LISTEN\nTAKE UP\nITEM 2 coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
describe('quantity on one paper',()=>{
 it('validates two cups on one ticket and charges for both',()=>{
  const result=executeCustomerEvent(compileProgram(source,9),customer,'quantity');
  expect(validate(customer,result)).toBe('');expect(result.tickets).toHaveLength(1);
  expect(result.tickets[0].quantity).toBe(2);expect(result.payment?.amount).toBe(6);
  expect(result.trace.filter(step=>step.command==='TAKE UP')).toHaveLength(1);
  expect(validate(customer,executeCustomerEvent(compileProgram(source.replace('2 coffee','1 coffee')),customer,'wrong'))).toContain('ticket count');
 });
 it.each(['offline','live'])('prepares and serves every cup in %s service',mode=>{
  let result=runLevel(level,compileProgram(source,9));
  if(mode==='live'){
   const run=createLiveRun(level,{query:source,prep:'',floor:''});let frame=run.snapshot();
   for(let n=0;n<1000&&!frame.done;n++)frame=run.advance(1);
   expect(frame.done).toBe(true);result=frame.result;
  }
  expect(result.first_failure).toBeNull();expect(result.passed).toBe(true);
  const serves=result.execution![0].events.filter(event=>event.command==='SERVE'&&event.end>event.start);
  expect(serves).toHaveLength(2);expect(new Set(serves.map(event=>event.ticketId)).size).toBe(2);
  expect(result.tickets).toHaveLength(1);
  expect(sampleReplay(result,serves[1].end).waitingTickets).toHaveLength(0);
 });
 it.each(['0','-1','1.5','20'])('rejects invalid quantity %s',quantity=>expect(compileProgram(source.replace('2 coffee',`${quantity} coffee`)).compile_error).not.toBe(''));
});
describe('condition source scope',()=>{
 it('allows speech everywhere and item only inside FOR',()=>{
  expect(compileProgram('LISTEN\nIF coffee IN CUSTOMER SPEECH\nEND',4).compile_error).toBe('');
  expect(compileProgram('LISTEN\nIF coffee IN item\nEND',14).compile_error).toContain('only inside FOR');
  expect(compileProgram('LISTEN\nFOR item IN heard orders\nIF coffee IN item\nEND\nEND',9).compile_error).toBe('');
 });
 it('migrates implicit item conditions without changing scoped item tests',()=>{
  const old='LISTEN\nIF ambiguous IN item\nHELP\nEND\nFOR item IN heard orders\nIF coffee IN item\nEND\nEND';
  expect(migrateQuerySource(old)).toBe(old.replace('ambiguous IN item','ambiguous IN CUSTOMER SPEECH'));
 });
});
