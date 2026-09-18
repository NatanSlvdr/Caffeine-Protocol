/** Query language: migrate retired instructions without touching comments or layout. */
import { insideScope } from '../scope';
import { VARIABLES, parseStore, parseSugarWrite } from './vars';

export const legacyQueryAction = (command: string) => command === 'TICKET' || command === 'SUBMIT' || /^MOVE (RIGHT|LEFT) 1$/.test(command);

/** Find whether a source row belongs to a FOR body, including nested IF branches. */
export function insideOrderLoop(source: string, line: number) {
  return insideScope(source, line, 'FOR ');
}

/** Rename old actions without removing movement, comments, or formatting. */
export function migrateQuerySource(source: string): string {
  const lines = source.split('\n');
  const used=new Set(lines.flatMap(raw=>raw.match(/\bvar[1-4]\b/g)??[]));
  const aliases=new Map<string,string>();
  for(const raw of lines){
    const command=raw.trim(), name=parseStore(command)?.variable??(command==='READ number'?'number':undefined);
    if(!name||VARIABLES.some(variable=>variable===name)||aliases.has(name))continue;
    const slot=VARIABLES.find(variable=>!used.has(variable));
    if(slot){aliases.set(name,slot);used.add(slot);}
  }
  // Restore the handoff steps in saves from the brief stationary-PICKUP version.
  const stationaryPickup = lines.some(line => line.trim().startsWith('PICKUP ')) && !lines.some(line => line.trim().startsWith('MOVE '));
  return lines.map((raw, line) => {
    const command = raw.trim();
    const indent = raw.slice(0, raw.length - raw.trimStart().length);
    const trailing = raw.slice(raw.trimEnd().length);
    if (command.startsWith('IF ') && !insideOrderLoop(source,line)) return raw.replace(/ IN item\b/g,' IN CUSTOMER SPEECH');
    if (stationaryPickup && command === 'DEPOSIT RIGHT') return `${indent}MOVE RIGHT 1\n${raw}\n${indent}MOVE LEFT 1`;
    if (command === 'READ number') return indent + `STORE ${aliases.get('number')??'var1'} FROM number` + trailing;
    const stored=parseStore(command), written=parseSugarWrite(command);
    if(stored&&aliases.has(stored.variable))return indent+`STORE ${aliases.get(stored.variable)} FROM ${stored.value}`+trailing;
    if(written&&aliases.has(written))return indent+`WRITE ${aliases.get(written)} sugar`+trailing;
    if (/^SUGAR (true|false|number)$/.test(command)) return indent + `WRITE ${{true:'1',false:'0',number:aliases.get('number')??'var1'}[command.slice(6) as 'true'|'false'|'number']} sugar` + trailing;
    if (command === 'TICKET') return indent + 'TAKE UP' + trailing;
    if (command === 'SUBMIT') return indent + 'DEPOSIT RIGHT' + trailing;
    if (command.startsWith('PICKUP ')) return indent + command.replace('PICKUP ', 'TAKE ') + trailing;
    return raw;
  }).join('\n');
}
