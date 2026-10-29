import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {Park} from './reference';
import {stateNames} from './reference';
import {areaBounds,boundaries,boundaryByCode,collisionClusters,isTerritory,jurisdictions,outlines,projectedPoint,territories,withinBounds,zoomBounds} from './atlas-geometry';

type Pointer={x:number;y:number};
export function Atlas({parks,selectedId,onSelect,visitedIds=new Set<string>(),stateFilter='',onStateChange,profileHref}:{
 parks:Park[];selectedId?:string;onSelect:(id:string)=>void;visitedIds?:Set<string>;stateFilter?:string;onStateChange?:(code:string)=>void;profileHref?:(id:string)=>string;
}){
 const [area,setArea]=useState(stateFilter||'us');
 const previousFilter=useRef(stateFilter);
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
 const [groupIds,setGroupIds]=useState<string[]>([]),[groupCenter,setGroupCenter]=useState<{x:number;y:number}|null>(null);
 const [expanded,setExpanded]=useState(false),[listQuery,setListQuery]=useState(''),[fullChain,setFullChain]=useState(false);
 const [size,setSize]=useState({width:1000,height:540});
 const stageRef=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,Pointer>()),pinchDistance=useRef(0);
 useEffect(()=>{if(previousFilter.current!==stateFilter){previousFilter.current=stateFilter;setArea(stateFilter||'us');setZoom(1);setPan({x:0,y:0});setGroupIds([]);setFullChain(false)}},[stateFilter]);
 useEffect(()=>{
  const el=stageRef.current;if(!el)return;
  const measure=()=>{const width=el.clientWidth,height=el.clientHeight;if(width>0&&height>0)setSize(s=>s.width===width&&s.height===height?s:{width,height})};
  measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(el);window.addEventListener('resize',measure);
  const wheel=(e:WheelEvent)=>{if((e.target as Element).closest('button'))return;e.preventDefault();setZoom(z=>Math.max(1,Math.min(16,z*(e.deltaY<0?1.2:1/1.2))));setGroupIds([])};
  el.addEventListener('wheel',wheel,{passive:false});return()=>{observer?.disconnect();window.removeEventListener('resize',measure);el.removeEventListener('wheel',wheel)};
 },[area,expanded]);
 useEffect(()=>{if(!expanded)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[expanded]);
 const regionParks=useMemo(()=>area==='us'||area==='world'?parks:parks.filter(p=>p.states.includes(area)),[parks,area]);
 const points=useMemo(()=>regionParks.map(p=>projectedPoint(p,area)).filter((p):p is NonNullable<typeof p>=>!!p),[regionParks,area]);
 const base=useMemo(()=>areaBounds(area,regionParks,size.width/size.height,fullChain),[area,regionParks,size,fullChain]);
 const viewport=useMemo(()=>zoomBounds(base,zoom,pan),[base,zoom,pan]);
 const clusters=useMemo(()=>collisionClusters(points,viewport,size.width,size.height),[points,viewport,size]);
 const visible=points.filter(p=>withinBounds(p,viewport)).length;
 const title=area==='us'?'United States · Alaska and Hawaii insets':area==='world'?'World and territories':stateNames[area]??area;
 const selected=regionParks.find(p=>p.id===selectedId);
 const visitedCount=regionParks.filter(p=>visitedIds.has(p.id)).length;
 const listed=regionParks.filter(p=>`${p.name} ${p.designation} ${p.states.join(' ')}`.toLowerCase().includes(listQuery.toLowerCase())).slice().sort((a,b)=>a.name.localeCompare(b.name));
 function changeArea(next:string){setArea(next);setZoom(1);setPan({x:0,y:0});setGroupIds([]);setListQuery('');setFullChain(false);onStateChange?.(next==='us'||next==='world'?'':next)}
 function move(dx:number,dy:number){if(zoom<=1)return;setPan(p=>({x:Math.max(-1,Math.min(1,p.x+dx/zoom)),y:Math.max(-1,Math.min(1,p.y+dy/zoom))}))}
 function reset(){setZoom(1);setPan({x:0,y:0});setGroupIds([])}
 function zoomGroup(){if(groupCenter){setPan({x:2*(groupCenter.x-(base.x+base.width/2))/base.width,y:2*(groupCenter.y-(base.y+base.height/2))/base.height})}setZoom(z=>Math.min(16,z*2));setGroupIds([])}
 const countByTerritory=(code:string)=>parks.filter(p=>p.states.includes(code)).length;
 const choose=(id:string)=>{onSelect(id);setGroupIds([])};
 const handlePointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
  if((e.target as Element).closest('button')||((e.target as Element).closest('path[data-state]')&&area==='us'&&zoom===1))return;
  if(e.pointerType==='mouse'&&zoom<=1)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture?.(e.pointerId);
  const values=[...pointers.current.values()];if(values.length===2)pinchDistance.current=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);
 };
 const handlePointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  const prev=pointers.current.get(e.pointerId);if(!prev)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const vals=[...pointers.current.values()];
  if(vals.length===2){const distance=Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y);if(pinchDistance.current>0&&distance>0)setZoom(z=>Math.max(1,Math.min(16,z*distance/pinchDistance.current)));pinchDistance.current=distance;setGroupIds([])}
  else if(vals.length===1&&zoom>1)setPan(p=>({x:Math.max(-1,Math.min(1,p.x-(e.clientX-prev.x)*2/(size.width*zoom))),y:Math.max(-1,Math.min(1,p.y-(e.clientY-prev.y)*2/(size.height*zoom)))}));
 };
 const handlePointerEnd=(e:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(e.pointerId);pinchDistance.current=0};
 return <section className={'np-atlas'+(expanded?' np-atlas-expanded':'')} aria-label="Interactive park atlas">
  <div className="np-atlas-heading"><div><h3>Explore the national park atlas</h3><p className="muted">Choose a state or territory, zoom the map, and select a marker or list entry.</p></div><div className="np-atlas-summary" aria-live="polite"><strong>{regionParks.length}</strong><span>matching places in {title}<br/>{visitedCount} visited · {regionParks.length-visitedCount} not recorded visited</span></div></div>
  <div className="np-atlas-toolbar">
   <label className="np-atlas-area">Map area<select aria-label="Map area" value={area} onChange={e=>changeArea(e.target.value)}>
    <option value="us">United States · mainland, Alaska and Hawaii</option><option value="world">World · all locations</option>
    <optgroup label="States and District of Columbia">{jurisdictions.filter(([c])=>!isTerritory(c)).map(([c,n])=><option value={c} key={c}>{n}</option>)}</optgroup>
    <optgroup label="U.S. territories">{jurisdictions.filter(([c])=>isTerritory(c)).map(([c,n])=><option value={c} key={c}>{n}</option>)}</optgroup>
   </select></label>
   <div className="np-atlas-controls" role="group" aria-label="Map controls">
    <button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>{setZoom(z=>Math.max(1,z/1.65));setGroupIds([])}}>−</button><span aria-live="polite" aria-label={'Zoom '+zoom.toFixed(1)+' times'}>{zoom.toFixed(1)}×</span><button type="button" aria-label="Zoom in" disabled={zoom>=16} onClick={()=>{setZoom(z=>Math.min(16,z*1.65));setGroupIds([])}}>+</button>
    <button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?'Close map':'Expand map'}</button><button type="button" onClick={()=>changeArea('us')}>National view</button><button type="button" onClick={reset}>Reset map</button>{['HI','MP','AS'].includes(area)&&<button type="button" onClick={()=>{setFullChain(x=>!x);reset()}}>{fullChain?'Focus main islands':'Show entire island chain'}</button>}
   </div>
  </div>
  {area==='us'&&!expanded&&<div className="np-atlas-territories" aria-label="Territory navigation"><p><strong>Explore beyond the mainland</strong><span>Select a territory for its own detailed map</span></p><div className="np-atlas-territory-grid">{territories.map(code=><button type="button" key={code} onClick={()=>changeArea(code)}><span className="np-atlas-territory-code">{code}</span><span>{stateNames[code]}</span><small>{countByTerritory(code)} places in current filters</small></button>)}</div></div>}
  <div className="np-atlas-map-shell" role="region" aria-label={'Map of '+title}>
   <div ref={stageRef} className={'np-atlas-stage '+(area==='us'?'np-atlas-stage-us':area==='world'?'np-atlas-stage-world':'np-atlas-stage-focus')}
    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd}>
    <svg viewBox={[viewport.x,viewport.y,viewport.width,viewport.height].join(' ')} preserveAspectRatio="none" className="np-atlas-land" aria-label={'Geographic outlines for '+title}>
     {area==='us'?outlines.states.map(s=><path key={s.code} data-state={s.code} d={s.path} className="np-atlas-outline np-atlas-state-hit" role="button" tabIndex={0} aria-label={'Explore '+(stateNames[s.code]??s.name)} onClick={()=>changeArea(s.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();changeArea(s.code)}}}/>):area==='world'?outlines.countries.map(s=><path key={s.code} d={s.path} className="np-atlas-outline"/>):boundaryByCode[area]?<path d={boundaryByCode[area].path} fillRule="evenodd" className="np-atlas-outline np-atlas-outline-active"/>:null}
    </svg>
    <div className="np-atlas-marker-layer">{clusters.map(c=>{const ids=c.points.map(p=>p.park.id),selected=ids.includes(selectedId??''),visited=c.points.every(p=>visitedIds.has(p.park.id));const label=ids.length===1?c.points[0].park.name:ids.length+' nearby park units: open list';const activate=()=>{if(ids.length===1)choose(ids[0]);else{setGroupIds(ids);setGroupCenter({x:c.x,y:c.y})}};return <button type="button" key={ids.slice().sort().join(':')} aria-label={label} aria-pressed={selected} title={label} onPointerDown={e=>{e.stopPropagation();activate()}} onPointerUp={e=>e.stopPropagation()} className={'np-atlas-pin '+(selected?'np-atlas-pin-selected':visited?'np-atlas-pin-visited':'np-atlas-pin-default')} style={{left:(c.x-viewport.x)/viewport.width*100+'%',top:(c.y-viewport.y)/viewport.height*100+'%'}} onClick={e=>{if(e.detail===0)activate()}}><span>{ids.length>1?ids.length:''}</span></button>})}</div>
    <div className="np-atlas-map-caption"><span>{title}{['HI','MP','AS'].includes(area)?fullChain?' · entire island chain':' · main islands':''}</span><span>{visible} visible reference points</span></div>
   </div>
  </div>
  <div className="np-atlas-bottom-bar"><p>Drag or pinch the map; use the buttons to zoom and pan. Markers show administrative reference points, not park boundaries or entrances.</p><div className="np-atlas-pan" role="group" aria-label="Pan zoomed map">{([['←',-.45,0,'Pan left'],['↑',0,-.45,'Pan up'],['↓',0,.45,'Pan down'],['→',.45,0,'Pan right']] as const).map(([label,dx,dy,name])=><button type="button" key={name} aria-label={name} disabled={zoom<=1} onClick={()=>move(dx,dy)}>{label}</button>)}</div></div>
  <div className="np-atlas-legend" aria-label="Map legend"><span><i className="np-atlas-key np-atlas-key-default"/>Unvisited or mixed</span><span><i className="np-atlas-key np-atlas-key-visited"/>All visited</span><span><i className="np-atlas-key np-atlas-key-selected"/>Selected</span><span><i className="np-atlas-key np-atlas-key-cluster">3</i>Group: select to list</span></div>
  {groupIds.length>1&&<section className="np-atlas-group" aria-label="Overlapping park units"><div className="np-atlas-group-head"><h4>{groupIds.length} parks at this map marker</h4><button type="button" onClick={()=>setGroupIds([])}>Close list</button></div>{zoom<16&&<button type="button" onClick={zoomGroup}>Zoom closer to separate markers</button>}<ul>{regionParks.filter(p=>groupIds.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><li key={p.id}><button type="button" onClick={()=>choose(p.id)}>{p.name}</button><small>{p.designation} · {visitedIds.has(p.id)?'Visited':'Not recorded visited'}</small></li>)}</ul></section>}
  {selected&&<article className="np-atlas-selected" aria-label="Selected park"><p className="eyebrow">{selected.designation} · {selected.states.join(', ')}</p><h4>{selected.name}</h4><p>{selected.description||'Description unavailable in this snapshot.'}</p><p>{visitedIds.has(selected.id)?'Visited':'Not recorded visited'} · {selected.classification==='system-unit'?'Official system unit':'Affiliated area'}</p><a href={profileHref?.(selected.id)??'#/apps/national-parks/park/'+selected.id}>Open park profile →</a></article>}
  <div className="np-atlas-selector"><label>Accessible location selector<select aria-label="Accessible location selector" value={selected?.id??''} onChange={e=>{if(e.target.value)choose(e.target.value)}}><option value="">Select a park in {title}</option>{regionParks.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.id}>{p.name}{p.location?'':' · location unknown'}</option>)}</select></label><p aria-live="polite">{regionParks.filter(p=>p.location).length} of {regionParks.length} matching places have reference coordinates; {visible} are in this map window. Locations outside the focused area and places without coordinates remain in the list.</p></div>
  <details className="np-atlas-list"><summary>Browse all {regionParks.length} matching places in {title}</summary><label>Search this area's places<input aria-label="Search area's places" type="search" value={listQuery} onChange={e=>setListQuery(e.target.value)}/></label><p role="status">{listed.length} listed</p><ul>{listed.map(p=><li key={p.id}><button type="button" onClick={()=>choose(p.id)}>{p.name}</button><span>{p.designation} · {visitedIds.has(p.id)?'Visited':'Not recorded visited'}{p.location?'':' · location unknown'}</span> <a href={profileHref?.(p.id)??'#/apps/national-parks/park/'+p.id}>Open profile</a></li>)}</ul>{!listed.length&&<p>No places match this search.</p>}</details>
  <small className="np-atlas-credit">Focused state and territory coastlines: <a href={boundaries.url} target="_blank" rel="noreferrer">U.S. Census Bureau 2025 cartographic boundaries, public domain</a>, generalized for display. National and world outlines: <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth, public domain</a>. Park points: <a href="https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220" target="_blank" rel="noreferrer">NPS Land Resources Division, CC BY 4.0</a>. Offline reference, not live conditions.</small>
 </section>;
}
