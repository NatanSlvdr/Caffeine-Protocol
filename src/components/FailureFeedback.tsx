import { useLayoutEffect, useState } from 'react';
import { variableLabels } from '@/domain/program';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

/** Put the warning outside the scrolling code pane, beside the failing line. */
export function InstructionError({ message, anchor }: { message: string; onEdit?: () => void; anchor?: RefObject<HTMLDivElement | null> }) {
 const [position,setPosition]=useState<{left:number;top:number}>();
 useLayoutEffect(()=>{
  const place=()=>{const row=anchor?.current;if(!row)return;const rect=row.getBoundingClientRect();const pane=row.closest('.editor-panel')?.getBoundingClientRect();setPosition({left:(pane?.left??rect.left)-12,top:rect.top+rect.height/2});};
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[anchor]);
 if(!anchor)return <span className="error-note" role="alert">{variableLabels(message)}</span>;
 return position?createPortal(<div className="line-error-callout" role="alert" style={position}>{variableLabels(message)}</div>,document.body):null;
}
