import { describe, expect, it } from 'vitest';
import { compileProgram, executeCustomerEvent, migrateQuerySource, streamCustomerEvent } from '../src/domain/program';
import type { Customer } from '../src/domain/types';

const customer:Customer={customer_id:'C1',arrival:0,phrase:'coffee with two sugars',intent:{},heard_orders:[{tokens:['coffee','sugar','number'],number:2}],expected:{}};
const source='LISTEN\nTAKE UP\nITEM 2 coffee\nSTORE var2 FROM number\nWRITE var2 sugar\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
const execute=(code=source,guest=customer)=>executeCustomerEvent(compileProgram(code,10),guest,'paper');

describe('stored values and paper writes',()=>{
 it.each([0,1,2])('writes %i sugar on the same paper without changing its drink quantity',number=>{
  const guest={...customer,heard_orders:[{tokens:['coffee','sugar','number'],number}]};
  const result=execute(source,guest);
  expect(result.error).toBe('');
  expect(result.tickets).toHaveLength(1);
  expect(result.tickets[0]).toMatchObject({ticket_id:'paper_01',item:'coffee',quantity:2,sugar_count:number,with_sugar:number>0});
 });
 it('updates the held paper during live execution before deposit',()=>{
  const execution=streamCustomerEvent(compileProgram(source),customer,'live');
  let step=execution.next();
  while(!step.done&&step.value.trace.at(-1)?.command!=='MOVE RIGHT 1')step=execution.next();
  expect(step.value.tickets).toEqual([]);
  expect(step.value.heldPaper).toMatchObject({item:'coffee',quantity:2,sugar_count:2});
 });
 it('requires paper, an assigned variable, and numeric order metadata',()=>{
  expect(execute('LISTEN\nWRITE 1 sugar').error).toContain('Take the order paper');
  expect(execute(source.replace('STORE var2 FROM number\n','')).error).toContain('local variable "var2"');
  expect(execute(source,{...customer,heard_orders:[{tokens:['coffee']}]}).error).toContain('none was heard');
 });
 it('clears variables between order items',()=>{
  const code='LISTEN\nFOR item IN heard orders\nTAKE UP\nITEM coffee\nIF number IN item\nSTORE var2 FROM number\nEND\nWRITE var2 sugar\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nEND';
  const result=execute(code,{...customer,heard_orders:[...customer.heard_orders,{tokens:['coffee']}]});
  expect(result.tickets).toHaveLength(1);
  expect(result.error).toContain('local variable "var2"');
 });
 it('clears variables between customers',()=>{
  const code='POSITION listen\nLISTEN\nTAKE UP\nITEM coffee\nIF number IN CUSTOMER SPEECH\nSTORE var2 FROM number\nEND\nWRITE var2 sugar\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nJUMP listen';
  const program=compileProgram(code),first=executeCustomerEvent(program,customer,'first');
  expect(first.error).toBe('');
  const second=executeCustomerEvent(program,{...customer,heard_orders:[{tokens:['coffee']}]},'second',first.state);
  expect(second.error).toContain('local variable "var2"');
 });
 it('migrates saved sugar and read blocks without changing comments or indentation',()=>{
  const old='# READ number\nLISTEN\n  READ number\n  SUGAR number\nSUGAR true\nSUGAR false';
  const next='# READ number\nLISTEN\n  STORE var1 FROM number\n  WRITE var1 sugar\nWRITE 1 sugar\nWRITE 0 sugar';
  expect(migrateQuerySource(old)).toBe(next);
  expect(migrateQuerySource(next)).toBe(next);
 });
 it('unlocks fixed sugar writes before named variables',()=>{
  expect(compileProgram('LISTEN\nWRITE 1 sugar',5).compile_error).toContain('locked');
  expect(compileProgram('LISTEN\nWRITE 1 sugar',6).compile_error).toBe('');
  expect(compileProgram('LISTEN\nSTORE var2 FROM number',9).compile_error).toContain('locked');
  expect(compileProgram('LISTEN\nWRITE var2 sugar',9).compile_error).toContain('locked');
  expect(compileProgram('LISTEN\nSTORE var2 FROM number\nWRITE var2 sugar',10).compile_error).toBe('');
 });
});

it('assigns constants and copies values between fixed slots',()=>{
 const result=execute(source.replace('STORE var2 FROM number','STORE var1 FROM 3\nSTORE var2 FROM var1'));
 expect(result.error).toBe('');
 expect(result.tickets[0].sugar_count).toBe(3);
 expect(compileProgram('LISTEN\nSTORE custom FROM number',10).compile_error).toContain('locked');
 expect(compileProgram('LISTEN\nWRITE custom sugar',10).compile_error).toContain('locked');
});
it('maps old names to fixed slots without colliding with existing variables',()=>{
 expect(migrateQuerySource('LISTEN\nSTORE var1 FROM 1\nSTORE sugars FROM number\nWRITE sugars sugar')).toBe('LISTEN\nSTORE var1 FROM 1\nSTORE var2 FROM number\nWRITE var2 sugar');
});
