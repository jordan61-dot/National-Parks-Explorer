import type {ComponentType,ReactNode,ButtonHTMLAttributes} from 'react';
export type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export interface Row{id:string;value:Json}
export interface Snapshot{records:Row[];settings:Row[]}
export interface Store{snapshot():Promise<Snapshot>;atomic(change:(data:Snapshot)=>Snapshot,assets?:{put?:{id:string;blob:Blob}[];remove?:string[]}):Promise<void>;asset(id:string):Promise<Blob|undefined>}
export interface ModuleProps{services:{store:Store;report:(error:unknown)=>string;events:{emit:(name:'data-changed')=>void}};route:string}
export interface HistoryOffer{total:number;passThrough:number;context:string;parks:{parkCode:string;notes:string}[]}
export interface Host{apiVersion:1;Button:ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>;Card:ComponentType<{children:ReactNode;className?:string}>;ConfirmDialog:ComponentType<{open:boolean;title:string;children:ReactNode;confirm:string;onCancel:()=>void;onConfirm:()=>void;busy?:boolean}>;optimizeImage:(file:File)=>Promise<Blob>;personalHistory?:HistoryOffer}
