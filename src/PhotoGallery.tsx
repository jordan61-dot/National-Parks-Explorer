import React, {useEffect,useRef,useState} from 'react';
import type {Park} from './reference';
import {safeUrl} from './reference';
import {mediaImages} from './data/media';

type Photo=NonNullable<Park['photographs']>[number];
export function availablePhotos(parks:Park[]):{park:Park;photo:Photo;src:string}[]{
 return parks.flatMap(park=>(park.photographs??[]).flatMap(photo=>mediaImages[photo.id]?[{park,photo,src:mediaImages[photo.id]}]:[]));
}
/** A gallery of existing offline reference media, never personal photographs. */
export function PhotoGallery({parks}:{parks:Park[]}) {
 const photos=availablePhotos(parks),[selected,setSelected]=useState<number|null>(null),[broken,setBroken]=useState(false),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=dialog.current;if(!el)return;if(selected!==null&&!el.open)el.showModal();else if(selected===null&&el.open)el.close()},[selected]);
 useEffect(()=>setBroken(false),[selected]);
 const close=()=>{setSelected(null);requestAnimationFrame(()=>trigger.current?.focus())};
 const step=(delta:number)=>setSelected(i=>i===null?null:(i+delta+photos.length)%photos.length);
 const current=selected===null?undefined:photos[selected];
 if(!photos.length)return null;
 const covered=parks.filter(p=>(p.photographs??[]).filter(photo=>!!mediaImages[photo.id]).length>=5).length;
 return <section className="np-gallery-entry" aria-labelledby="np-gallery-entry-title"><div><p className="eyebrow">OFFLINE PHOTO COLLECTION</p><h3 id="np-gallery-entry-title">Explore the field photographs</h3><p>{photos.length} verified reference photograph{photos.length===1?'':'s'}{parks.length===1?' available offline.':<> from {new Set(photos.map(p=>p.park.id)).size} of {parks.length} parks and affiliated areas. {covered} have at least five photographs. {covered<parks.length&&'Coverage is incomplete.'}</>}</p></div><button ref={trigger} onClick={()=>setSelected(0)}>Open photo gallery</button>
 <dialog ref={dialog} className="np-gallery-dialog" aria-labelledby="np-gallery-title" onCancel={e=>{e.preventDefault();close()}} onClose={()=>{if(selected!==null)close()}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}}}>
 {current&&<><div className="np-gallery-header"><div><p className="eyebrow">FIELD PHOTOGRAPH · {selected!+1} OF {photos.length}</p><h2 id="np-gallery-title">{current.park.name}</h2></div><button className="secondary" onClick={close}>Close gallery</button></div><figure>{broken?<div className="np-gallery-fallback" role="status">This photograph could not be displayed. The park profile remains available.</div>:<img src={current.src} alt={current.photo.alt} width={current.photo.width} height={current.photo.height} onError={()=>setBroken(true)}/>}<figcaption>{current.photo.caption}<br/><span>{current.photo.credit} · {current.photo.license}</span>{safeUrl(current.photo.source)&&<> · <a href={safeUrl(current.photo.source)} target="_blank" rel="noreferrer">Image source and rights ↗</a></>}</figcaption></figure><div className="np-gallery-controls"><button className="secondary" onClick={()=>step(-1)} disabled={photos.length<2}>Previous photograph</button><a className="button" href={'#/apps/national-parks/park/'+current.park.id}>Open park profile</a><button className="secondary" onClick={()=>step(1)} disabled={photos.length<2}>Next photograph</button></div><p className="muted">Use the arrow keys to move between photographs, or Escape to close.</p><div className="np-gallery-thumbnails" aria-label="Choose a photograph">{photos.slice(Math.max(0,selected!-4),Math.min(photos.length,selected!+5)).map((item,offset)=>{const i=Math.max(0,selected!-4)+offset;return <button className="secondary" key={item.park.id+item.photo.id} aria-label={'Show photo '+(i+1)+': '+item.photo.caption+' — '+item.park.name} aria-pressed={selected===i} onClick={()=>setSelected(i)}><img src={item.src} alt="" loading="lazy"/></button>})}</div></>}
 </dialog></section>;
}
