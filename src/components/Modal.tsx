import { useEffect,useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,onClose,children,wide=false,className=''}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog?.showModal();return ()=>{dialog?.close();if(previous instanceof HTMLElement)previous.focus();};},[]);
 return <dialog className={`modal ${wide?'wide':''} ${className}`} ref={ref} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-top"><h2>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
