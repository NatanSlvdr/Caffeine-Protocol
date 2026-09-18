import { describe, it, expect } from 'vitest';
import { lessons } from '../../../src/data';
import { compileProgram, executeCustomerEvent, evaluateQueryComparison, parseFor } from '../../../src/domain/program';
import { QUERY_INSTRUCTION_LIMIT } from '../../../src/domain/constants';
import { validate } from '../../../src/domain/simulation';
import { execCustomer as exec } from '../../helpers/query';
import { coffeeFixture as coffee, teaFixture as tea, requestFixture as request } from '../../helpers/customers';
import { runCampaignLevel as run } from '../../helpers/run';

describe('token interpreter and physical order handling',()=>{
 it('membership tests use only the selected binding and arbitrary token strings',()=>{
  const bindings={item:{tokens:['coffee','sugar','negation']}};
  expect(evaluateQueryComparison({left:'coffee',operator:'IN',right:'item'},bindings)).toBe(true);
  expect(evaluateQueryComparison({left:'tea',operator:'IN',right:'item'},bindings)).toBe(false);
  expect(evaluateQueryComparison({left:'coffee',operator:'IN',right:'missing'},bindings)).toBe(false);
  expect(evaluateQueryComparison({left:'future_token',operator:'IN',right:'item'},{item:{tokens:['future_token']}})).toBe(true);
 });
 it.each([
  ['sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH', ['sugar'], true],
  ['sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH', ['sugar','negation'], false],
  ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH', ['tea'], true],
  ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH', ['sugar'], false],
  ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH', ['coffee'], true],
  ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH', ['tea'], false],
  ['coffee NOT IN CUSTOMER SPEECH', ['coffee'], false],
  ['coffee NOT IN CUSTOMER SPEECH', ['tea'], true],
 ])('evaluates %s against %j',(condition,tokens,yes)=>{
  const result=exec(`LISTEN\nTAKE UP\nIF ${condition}\nITEM coffee\nELSE\nITEM tea\nEND\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1`,request([{tokens}]));
  expect(result.error).toBe('');expect(result.tickets[0].item).toBe(yes?'coffee':'tea');
 });
 it('rejects incomplete or locked compound clauses',()=>{
  for(const condition of ['coffee IN CUSTOMER SPEECH AND','coffee IN CUSTOMER SPEECH OR OR tea IN CUSTOMER SPEECH','coffee IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH'])expect(compileProgram(`LISTEN\nIF ${condition}\nEND`,4).compile_error).toContain('locked');
 });
 it('does not read solved intent or expected output to choose a drink',()=>{
  const customer={...coffee,intent:{drink:'tea' as const,with_sugar:true},expected:{item:'tea' as const}};
  const result=exec(lessons[3].solution,customer,4);
  expect(result.tickets[0].item).toBe('coffee');expect(result.tickets[0].source_intent).toEqual({});
 });
 it('resumes at the next customer without stale tokens',()=>{
  const p=compileProgram(lessons[4].solution,5),a=executeCustomerEvent(p,coffee,'a'),b=executeCustomerEvent(p,tea,'b',a.state);
  expect(b.error).toBe('');expect(b.tickets[0].item).toBe('tea');
 });
 it('creates exactly two separately taken and deposited tickets for coffee and tea',()=>{
  const customer=request([{tokens:['coffee']},{tokens:['tea']}],{tickets:[{item:'coffee'},{item:'tea'}]});
  const result=exec(lessons[8].solution,customer);
  expect(validate(customer,result)).toBe('');expect(result.tickets.map(t=>t.item)).toEqual(['coffee','tea']);
  for(const command of ['TAKE UP','DEPOSIT RIGHT'])expect(result.trace.filter(t=>t.command===command)).toHaveLength(2);
  expect(new Set(result.tickets.map(t=>t.ticket_id)).size).toBe(2);
 });
 it('plain drinks reject unconditional sugar after modifiers are introduced',()=>{
  const source=lessons[5].solution.replace('IF sugar IN CUSTOMER SPEECH\n  WRITE 1 sugar\nEND','WRITE 1 sugar');
  expect(run(5,source).first_failure?.reason).toContain('sugar');
 });
 it('rejects a sugar-only check on a negated request',()=>{
  const customer=request([{tokens:['coffee','sugar','negation']}],{item:'coffee',with_sugar:false});
  expect(validate(customer,exec(lessons[5].solution,customer))).toContain('sugar');
  expect(validate(customer,exec(lessons[6].solution,customer))).toBe('');
 });
 it.each([0,1,2])('copies explicitly read numeric metadata including %i',number=>{
  const customer=request([{tokens:['tea','sugar','number'],number}],{item:'tea',sugar_count:number});
  const result=exec(lessons[9].solution,customer);expect(validate(customer,result)).toBe('');
 });
 it('does not retain a number from the previous loop item',()=>{
  const customer=request([{tokens:['coffee','sugar','number'],number:2},{tokens:['tea']}]);
  const source='LISTEN\nFOR item IN heard orders\nTAKE UP\nITEM coffee\nIF number IN item\nREAD number\nEND\nSUGAR number\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nEND';
  expect(exec(source,customer).error).toContain('local variable');
 });
 it('requires HELP before taking paper for ambiguity and replaces all heard groups',()=>{
  const customer={...request([{tokens:['ambiguous']}],{ask_help:true,tickets:[{item:'tea'},{item:'coffee'}]}),clarification_heard_orders:[{tokens:['tea']},{tokens:['coffee']}]};
  expect(exec(lessons[9].solution,customer).error).toContain('Ambiguous');
  const result=exec(lessons[10].solution,customer);expect(validate(customer,result)).toBe('');expect(result.tickets.map(t=>t.item)).toEqual(['tea','coffee']);
 });
 it('defers unresolved speech without guessing and resumes service',()=>{
  const customer=request([{tokens:['ambiguous']}],{ask_help:true});const p=compileProgram(lessons[13].solution);
  const result=executeCustomerEvent(p,customer,'a');expect(validate(customer,result)).toBe('');expect(result.tickets).toEqual([]);
  expect(executeCustomerEvent(p,tea,'b',result.state).tickets[0].item).toBe('tea');
 });
 it('skips an empty selected collection',()=>expect(exec('LISTEN\nFOR item IN heard orders\nTAKE UP\nEND',request([])).trace.map(t=>t.command)).toEqual(['LISTEN','FOR item IN heard orders']));
 it('parses loop operands separately and rejects unsupported selectors, variables and nesting',()=>{
  expect(parseFor('FOR item IN heard orders')).toEqual({variable:'item',selector:'heard orders'});
  for(const source of ['FOR ticket IN waiting tickets','FOR item IN occupied tables','FOR other IN heard orders','FOR item IN heard orders\nFOR item IN heard orders\nEND\nEND'])expect(compileProgram('LISTEN\n'+source).compile_error).not.toBe('');
 });
 it('bounds large loops at exactly 1024 executed instructions',()=>{
  const customer=request(Array.from({length:400},()=>({tokens:['coffee']})));
  const result=exec(lessons[8].solution,customer);expect(result.error).toContain('limit');expect(result.executed_instructions).toBe(QUERY_INSTRUCTION_LIMIT);
 });
 for(const source of ['', 'LISTEN\nEND','LISTEN\nFOR item IN heard orders','LISTEN\nREPEAT\nTAKE UP','LISTEN\nBOGUS','TAKE UP\nLISTEN','LISTEN\nELSE','LISTEN\nIF tea IN CUSTOMER SPEECH\nELSE\nELSE\nEND','LISTEN\nJUMP listen','POSITION listen\nLISTEN\nPOSITION listen','LISTEN\nLISTEN'])it(`rejects invalid structure ${JSON.stringify(source)}`,()=>expect(compileProgram(source).compile_error).not.toBe(''));
 it('enforces 128 blocks',()=>{expect(compileProgram('LISTEN\n'+'TAKE UP\n'.repeat(127)).compile_error).toBe('');expect(compileProgram('LISTEN\n'+'TAKE UP\n'.repeat(128)).compile_error).toContain('128');});
 it('rejects reads before speech and missing numeric tokens',()=>{
  expect(exec('POSITION listen\nREAD number\nLISTEN').error).toContain('No customer speech');
  expect(exec('LISTEN\nREAD number').error_line).toBe(1);
  expect(exec('LISTEN\nREAD number').error).toContain('none was heard');
 });
 it('requires held paper for writes and forbids overwriting it',()=>{
  for(const command of ['ITEM coffee','SUGAR true'])expect(exec('LISTEN\n'+command).error).toContain('Take the order paper');
  expect(exec('LISTEN\nTAKE UP\nTAKE UP').error).toContain('Deposit the current paper');
  expect(exec('LISTEN\nTAKE UP\nMOVE RIGHT 1\nDEPOSIT RIGHT').error).toContain('missing an item');
 });
 it('rejects jumping from an active loop',()=>expect(exec('POSITION listen\nLISTEN\nFOR item IN heard orders\nJUMP listen\nEND').error).toContain('Finish the function or FOR'));
 it('rejects carrying an unfinished sheet into the next loop item',()=>expect(exec('LISTEN\nFOR item IN heard orders\nTAKE UP\nITEM coffee\nEND').error).toContain('Deposit one paper'));
 it('fails on first customer mismatch and highlights the item source',()=>{const r=run(3,lessons[2].solution);expect(r.events).toHaveLength(2);expect(r.first_failure?.seed_id).toBe('L04_B');expect(r.first_failure?.error_line).toBe(2);});
});
