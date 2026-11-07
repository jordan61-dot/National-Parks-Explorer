import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {Park} from './reference';
import {stateNames} from './reference';
import {areaBounds,boundaries,boundaryByCode,collisionClusters,isTerritory,jurisdictions,outlines,projectedPoint,territories,withinBounds,zoomBounds} from './atlas-geometry';
import {atlasRegions,defaultFilters,designationGroup,filterAtlas,metricValue,summarize,validLocation,type AtlasFilters,type GeoMetric} from './atlas-data';
import {defaultLayers,markerColor,type Layers,type MarkerMode,type MapStyle} from './atlas-layers';
import {AtlasCartography} from './AtlasCartography';
import {AtlasFiltersPanel,AtlasLayerPanel,AtlasLegend,AtlasParkPreview,ComparisonStudio,GeoSummaryPanel,JurisdictionTable} from './AtlasPanels';

type Session={area:string;zoom:number;pan:{x:number;y:number};filters:AtlasFilters;layers:Layers;mapStyle:MapStyle;mode:MarkerMode;metric:GeoMetric;coverage:string;compare:string[];comparison:boolean};
let remembered:Session|undefined;

type Pointer={x:number;y:number;startX:number;startY:number};
export function Atlas({parks,selectedId,onSelect,visitedIds=new Set<string>(),savedIds=new Set<string>(),stateFilter='',onStateChange,profileHref,rememberSession=false}:{
 parks:Park[];selectedId?:string;onSelect:(id:string)=>void;visitedIds?:Set<string>;savedIds?:Set<string>;stateFilter?:string;onStateChange?:(code:string)=>void;profileHref?:(id:string)=>string;rememberSession?:boolean;
}){
 const previousSession=rememberSession?remembered:undefined;
 const session=previousSession&&stateFilter&&previousSession.area!==stateFilter?{...previousSession,area:stateFilter,zoom:1,pan:{x:0,y:0}}:previousSession;
 const [area,setArea]=useState(stateFilter||session?.area||'us');
 const previousFilter=useRef(stateFilter);
 const [zoom,setZoom]=useState(session?.zoom??1),[pan,setPan]=useState(session?.pan??{x:0,y:0});
 const [filters,setFilters]=useState<AtlasFilters>(session?.filters??{...defaultFilters});
 const [layers,setLayers]=useState<Layers>(session?.layers??{...defaultLayers});
 const [mapStyle,setMapStyle]=useState<MapStyle>(session?.mapStyle??'standard'),[mode,setMode]=useState<MarkerMode>(session?.mode??'locations');
 const [metric,setMetric]=useState<GeoMetric>(session?.metric??'total'),[coverage,setCoverage]=useState(session?.coverage??'trails');
 const [compare,setCompare]=useState(session?.compare??['OH','CA']),[comparison,setComparison]=useState(session?.comparison??false);
 const [previewId,setPreviewId]=useState(selectedId??''),[terrainStatus,setTerrainStatus]=useState('');
 const sectionRef=useRef<HTMLElement>(null),expandRef=useRef<HTMLButtonElement>(null),previewReturn=useRef<HTMLElement|null>(null);
 const terrainStatusChange=React.useCallback((s:string)=>setTerrainStatus(s),[]);
 useEffect(()=>{if(rememberSession)remembered={area,zoom,pan,filters,layers,mapStyle,mode,metric,coverage,compare,comparison}},[rememberSession,area,zoom,pan,filters,layers,mapStyle,mode,metric,coverage,compare,comparison]);
 useEffect(()=>{if(selectedId!==undefined)setPreviewId(selectedId)},[selectedId]);
 const [groupIds,setGroupIds]=useState<string[]>([]),[groupCenter,setGroupCenter]=useState<{x:number;y:number}|null>(null);
 const [expanded,setExpanded]=useState(false),[listQuery,setListQuery]=useState(''),[fullChain,setFullChain]=useState(false);
 const [size,setSize]=useState({width:1000,height:540});
 const stageRef=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,Pointer>()),pinchDistance=useRef(0),gestureMoved=useRef(false);
 useEffect(()=>{if(previousFilter.current!==stateFilter){previousFilter.current=stateFilter;setArea(stateFilter||'us');setZoom(1);setPan({x:0,y:0});setGroupIds([]);setFullChain(false)}},[stateFilter]);
 useEffect(()=>{
  const el=stageRef.current;if(!el)return;
  const measure=()=>{const width=el.clientWidth,height=el.clientHeight;if(width>0&&height>0)setSize(s=>s.width===width&&s.height===height?s:{width,height})};
  measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(el);window.addEventListener('resize',measure);
  const wheel=(e:WheelEvent)=>{if((e.target as Element).closest('button'))return;e.preventDefault();setZoom(z=>Math.max(1,Math.min(16,z*(e.deltaY<0?1.2:1/1.2))));setGroupIds([])};
  el.addEventListener('wheel',wheel,{passive:false});return()=>{observer?.disconnect();window.removeEventListener('resize',measure);el.removeEventListener('wheel',wheel)};
 },[area,expanded]);
 useEffect(()=>{if(!expanded)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';expandRef.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);if(e.key==='Tab'){const focusable=[...(sectionRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select,input,summary,[tabindex="0"]')??[])].filter(el=>el.getClientRects().length>0);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',key);expandRef.current?.focus()}},[expanded]);
 const filtered=useMemo(()=>filterAtlas(parks,filters,visitedIds,savedIds),[parks,filters,visitedIds,savedIds]);
 const regionParks=useMemo(()=>area==='us'||area==='world'?filtered:filtered.filter(p=>p.states.includes(area)),[filtered,area]);
 const summaries=useMemo(()=>jurisdictions.map(([c])=>summarize(filtered,c,visitedIds,savedIds)),[filtered,visitedIds,savedIds]);
 const summary=useMemo(()=>summarize(regionParks,'all',visitedIds,savedIds),[regionParks,visitedIds,savedIds]);
 const max=metric==='visitPercent'?100:Math.max(1,...summaries.map(s=>metricValue(s,metric)??0));
 const points=useMemo(()=>regionParks.map(p=>projectedPoint(p,area)).filter((p):p is NonNullable<typeof p>=>!!p),[regionParks,area]);
 const base=useMemo(()=>areaBounds(area,regionParks,size.width/size.height,fullChain),[area,regionParks,size,fullChain]);
 const viewport=useMemo(()=>zoomBounds(base,zoom,pan),[base,zoom,pan]);
 const clusters=useMemo(()=>collisionClusters(points,viewport,size.width,size.height),[points,viewport,size]);
 const visible=points.filter(p=>withinBounds(p,viewport)).length;
 const title=area==='us'?'United States · Alaska and Hawaii insets':area==='world'?'World and territories':stateNames[area]??area;
 const selected=regionParks.find(p=>p.id===previewId);
 const visitedCount=regionParks.filter(p=>visitedIds.has(p.id)).length;
 const listed=regionParks.filter(p=>`${p.name} ${p.designation} ${p.states.join(' ')}`.toLowerCase().includes(listQuery.toLowerCase())).slice().sort((a,b)=>a.name.localeCompare(b.name));
 function changeArea(next:string){setArea(next);setZoom(1);setPan({x:0,y:0});setGroupIds([]);setPreviewId('');setFullChain(false);onStateChange?.(next==='us'||next==='world'?'':next)}
 function move(dx:number,dy:number){if(zoom<=1)return;setPan(p=>({x:Math.max(-1,Math.min(1,p.x+dx/zoom)),y:Math.max(-1,Math.min(1,p.y+dy/zoom))}))}
 function reset(){setZoom(1);setPan({x:0,y:0});setGroupIds([])}
 function zoomGroup(){if(groupCenter){setPan({x:2*(groupCenter.x-(base.x+base.width/2))/base.width,y:2*(groupCenter.y-(base.y+base.height/2))/base.height})}setZoom(z=>Math.min(16,z*2));setGroupIds([])}
 const countByTerritory=(code:string)=>filtered.filter(p=>p.states.includes(code)).length;
 const choose=(id:string)=>{previewReturn.current=document.activeElement as HTMLElement;setPreviewId(id);onSelect(id);setGroupIds([])};
 const closePreview=()=>{setPreviewId('');onSelect('');previewReturn.current?.focus()};
 function locate(id:string){const p=regionParks.find(p=>p.id===id),pt=p&&projectedPoint(p,area);if(pt){setPan({x:2*(pt.x-(base.x+base.width/2))/base.width,y:2*(pt.y-(base.y+base.height/2))/base.height});setZoom(4)}}
 function discoveryHref(code:string){const query=new URLSearchParams();if(stateNames[code])query.set('state',code);for(const k of ['query','designation','classification','theme','region','attribute','visit'] as const)if(filters[k])query.set(k,filters[k]);return '#/apps/national-parks/explore'+(query.size?'?'+query.toString():'')}
 const handlePointerDown=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(!pointers.current.size)gestureMoved.current=false;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
  const values=[...pointers.current.values()];if(values.length===2){pinchDistance.current=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);gestureMoved.current=true}
 };
 const handlePointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  const prev=pointers.current.get(e.pointerId);if(!prev)return;
  const current={...prev,x:e.clientX,y:e.clientY};pointers.current.set(e.pointerId,current);
  const vals=[...pointers.current.values()];
  if(Math.hypot(current.x-current.startX,current.y-current.startY)>5)gestureMoved.current=true;
  if(gestureMoved.current){try{e.currentTarget.setPointerCapture?.(e.pointerId)}catch{/* capture may already have ended */}}
  if(vals.length>=2){const distance=Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y);if(pinchDistance.current>0&&distance>0)setZoom(z=>Math.max(1,Math.min(16,z*distance/pinchDistance.current)));pinchDistance.current=distance;setGroupIds([])}
  else if(gestureMoved.current&&zoom>1)setPan(p=>({x:Math.max(-1,Math.min(1,p.x-(e.clientX-prev.x)*2/(size.width*zoom))),y:Math.max(-1,Math.min(1,p.y-(e.clientY-prev.y)*2/(size.height*zoom)))}));
 };
 const handlePointerEnd=(e:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(e.pointerId);pinchDistance.current=0};
 const suppressGestureClick=(e:React.MouseEvent<HTMLDivElement>)=>{if(gestureMoved.current){e.preventDefault();e.stopPropagation();gestureMoved.current=false}};

 return <section ref={sectionRef} className={'np-atlas np-atlas3'+(expanded?' np-atlas-expanded':'')} aria-label="Interactive park atlas" role={expanded?'dialog':undefined} aria-modal={expanded?true:undefined}>
  <div className="np-atlas-heading"><div><p className="eyebrow">ATLAS 3.0 · THE GEOGRAPHY OF DISCOVERY</p><h3>A wider perspective.</h3><p>Read the landscape. Follow a subject. Find your next place.</p></div><div className="np-atlas-summary" aria-live="polite"><strong>{regionParks.length}</strong><span>matching associated records<br/>{summary.official} official · {summary.affiliated} affiliated</span></div></div>
  <div className="np-atlas-toolbar">
   <label className="np-atlas-area">Map area<select aria-label="Map area" value={area} onChange={e=>changeArea(e.target.value)}>
    <option value="us">United States · mainland, Alaska and Hawaii</option><option value="world">World · all locations</option>
    <optgroup label="States and District of Columbia">{jurisdictions.filter(([c])=>!isTerritory(c)).map(([c,n])=><option value={c} key={c}>{n}</option>)}</optgroup>
    <optgroup label="U.S. territories">{jurisdictions.filter(([c])=>isTerritory(c)).map(([c,n])=><option value={c} key={c}>{n}</option>)}</optgroup>
   </select></label>
   <div className="np-atlas-controls" role="group" aria-label="Map controls">
    <button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>{setZoom(z=>Math.max(1,z/1.65));setGroupIds([])}}>−</button><span aria-live="polite" aria-label={'Zoom '+zoom.toFixed(1)+' times'}>{zoom.toFixed(1)}×</span><button type="button" aria-label="Zoom in" disabled={zoom>=16} onClick={()=>{setZoom(z=>Math.min(16,z*1.65));setGroupIds([])}}>+</button>
    <button ref={expandRef} type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?'Close map':'Expand map'}</button><button type="button" onClick={()=>changeArea('us')}>National view</button><button type="button" onClick={reset}>Reset map</button>{['HI','MP','AS'].includes(area)&&<button type="button" onClick={()=>{setFullChain(x=>!x);reset()}}>{fullChain?'Focus main islands':'Show entire island chain'}</button>}
   </div>
  </div>
  <div className="np-atlas-tools"><AtlasLayerPanel layers={layers} onLayers={setLayers} style={mapStyle} onStyle={setMapStyle} mode={mode} onMode={setMode} metric={metric} onMetric={setMetric} coverage={coverage} onCoverage={setCoverage} onReset={()=>{setLayers({...defaultLayers});setMapStyle('standard');setMode('locations');setMetric('total');setCoverage('trails')}}/><AtlasFiltersPanel filters={filters} onChange={f=>{setFilters(f);setGroupIds([])}} parks={parks}/></div>
  <div className="np-atlas-context"><span role="status">{filtered.length} unique records across matching jurisdictions · {regionParks.length} in this inventory</span><div><button type="button" aria-pressed={comparison} onClick={()=>setComparison(v=>!v)}>{comparison?'Hide comparison':'Compare jurisdictions'}</button>{Object.values(filters).some(Boolean)&&<button type="button" onClick={()=>{setFilters({...defaultFilters});setGroupIds([])}}>Clear atlas filters</button>}<a href={discoveryHref(area)}>Discovery cards →</a></div></div>
  <div className={'np-atlas-workspace'+(selected?' has-preview':'')}>
  <div className="np-atlas-map-shell" role="region" aria-label={'Map of '+title}>
   <div ref={stageRef} className={'np-atlas-stage '+(area==='us'?'np-atlas-stage-us':area==='world'?'np-atlas-stage-world':'np-atlas-stage-focus')+(mapStyle==='contrast'?' np-atlas-contrast':'')}
    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onClickCapture={suppressGestureClick}>
    <AtlasCartography area={area} viewport={viewport} size={size} layers={layers} mapStyle={mapStyle} summaries={summaries} metric={metric} max={max} onArea={changeArea} onTerrainStatus={terrainStatusChange} selectedRegion={atlasRegions[filters.region]??[]}/>
    {layers.markers&&<div className="np-atlas-marker-layer">{clusters.map(c=>{const ids=c.points.map(p=>p.park.id),active=ids.includes(previewId),groups=c.points.map(p=>designationGroup(p.park.designation)),allVisited=c.points.every(p=>visitedIds.has(p.park.id)),someVisited=c.points.some(p=>visitedIds.has(p.park.id));const label=ids.length===1?c.points[0].park.name:ids.length+' nearby park units: open list';const hasCoverage=c.points.every(p=>coverage==='coordinates'?validLocation(p.park):p.park.attractions.some(a=>coverage==='trails'?a.kind==='trail':a.kind!=='trail'));const color=markerColor(mode,{selected:active,allVisited,someVisited,designation:groups[0],coverage:hasCoverage,mixed:new Set(groups).size>1});const activate=()=>{if(ids.length===1)choose(ids[0]);else{setGroupIds(ids);setGroupCenter({x:c.x,y:c.y})}};return <button type="button" key={ids.slice().sort().join(':')} aria-label={label} aria-pressed={active} title={label+(mode==='designation'?' · '+[...new Set(groups)].join(', '):'')} className={'np-atlas-pin '+(active?'np-atlas-pin-selected':'np-atlas-pin-default')} style={{left:(c.x-viewport.x)/viewport.width*100+'%',top:(c.y-viewport.y)/viewport.height*100+'%','--pin-color':color} as React.CSSProperties} onClick={activate}><span>{ids.length>1?ids.length:mode==='visitation'?(allVisited?'✓':'○'):mode==='designation'?groups[0].slice(0,1):mode==='coverage'?(hasCoverage?'✓':'?'):''}</span></button>})}</div>}
    <div className="np-atlas-map-caption"><span>{title}{['HI','MP','AS'].includes(area)?fullChain?' · entire island chain':' · main islands':''}</span><span>{visible} visible reference points</span></div>
   </div>
  </div>
  {selected&&<aside className="np-atlas-preview-pane" aria-label="Park context"><AtlasParkPreview park={selected} visited={visitedIds.has(selected.id)} saved={savedIds.has(selected.id)} onClose={closePreview} profileHref={profileHref?.(selected.id)??'#/apps/national-parks/park/'+selected.id} discoveryHref={discoveryHref(selected.states[0])}/><button type="button" onClick={()=>locate(selected.id)} disabled={!validLocation(selected)}>Locate selected reference point</button></aside>}
  </div>
  {mapStyle==='terrain'&&<p className="np-atlas-terrain-status" role="status">{terrainStatus} <a href="https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/" target="_blank" rel="noreferrer">Terrain source</a></p>}
  {layers.choropleth&&area==='world'&&<p>World context retains country outlines. Jurisdiction shading is available in the U.S. overview, focused maps, and exact statistics table.</p>}
  <div className="np-atlas-bottom-bar"><p>Drag or pinch the map; use the buttons to zoom and pan. Markers show administrative reference points, not park boundaries or entrances.</p><div className="np-atlas-pan" role="group" aria-label="Pan zoomed map">{([['←',-.45,0,'Pan left'],['↑',0,-.45,'Pan up'],['↓',0,.45,'Pan down'],['→',.45,0,'Pan right']] as const).map(([label,dx,dy,name])=><button type="button" key={name} aria-label={name} disabled={zoom<=1} onClick={()=>move(dx,dy)}>{label}</button>)}</div></div>
  <AtlasLegend mode={mode} choropleth={layers.choropleth} metric={metric} max={max} coverage={coverage}/>
  {groupIds.length>1&&<section className="np-atlas-group" aria-label="Overlapping park units"><div className="np-atlas-group-head"><h4>{groupIds.length} parks at this map marker</h4><button type="button" onClick={()=>setGroupIds([])}>Close list</button></div>{zoom<16&&<button type="button" onClick={zoomGroup}>Zoom closer to separate markers</button>}<ul>{regionParks.filter(p=>groupIds.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(p=><li key={p.id}><button type="button" onClick={()=>choose(p.id)}>{p.name}</button><small>{p.designation} · {visitedIds.has(p.id)?'Recorded visited':'No individual visit recorded'}</small></li>)}</ul></section>}
  <div className="np-atlas-selector"><label>Accessible location selector<select aria-label="Accessible location selector" value={selected?.id??''} onChange={e=>{if(e.target.value)choose(e.target.value)}}><option value="">Select a park in {title}</option>{regionParks.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.id}>{p.name}{validLocation(p)?'':' · location unknown'}</option>)}</select></label><p aria-live="polite">{regionParks.filter(validLocation).length} of {regionParks.length} matching places have reference coordinates; {visible} are in this map window. Locations outside the focused area and places without coordinates remain in the list.</p></div>
  {area==='us'&&<details className="np-atlas-panel"><summary>Explore all five territories</summary><div className="np-atlas-territory-grid" aria-label="Territory navigation">{territories.map(code=><button type="button" key={code} onClick={()=>changeArea(code)}><span className="np-atlas-territory-code">{code}</span><span>{stateNames[code]}</span><small>{countByTerritory(code)} places in current filters</small></button>)}</div></details>}
  <GeoSummaryPanel summary={{...summary,code:stateNames[area]?area:'all'}} title={filters.region&&(area==='us'||area==='world')?filters.region:title} onArea={changeArea} discoveryHref={discoveryHref(area)} onCompare={stateNames[area]?()=>{setCompare(old=>[area,...old.filter(c=>c!==area)].slice(0,4));setComparison(true)}:undefined}/>
  {comparison&&<ComparisonStudio codes={compare} onCodes={setCompare} summaries={summaries} metric={metric} onMetric={setMetric} onArea={changeArea} discoveryHref={discoveryHref}/>}
  <JurisdictionTable summaries={summaries} metric={metric} onArea={changeArea}/>
  <details className="np-atlas-list"><summary>Browse all {regionParks.length} matching places in {title}</summary><label>Search this area's places<input aria-label="Search area's places" type="search" value={listQuery} onChange={e=>setListQuery(e.target.value)}/></label><p role="status">{listed.length} listed</p><ul>{listed.map(p=><li key={p.id}><button type="button" onClick={()=>choose(p.id)}>{p.name}</button><span>{p.designation} · {visitedIds.has(p.id)?'Recorded visited':'No individual visit recorded'}{validLocation(p)?'':' · location unknown'}</span> <a href={profileHref?.(p.id)??'#/apps/national-parks/park/'+p.id}>Open profile</a></li>)}</ul>{!listed.length&&<p>No places match this search.</p>}</details>
  <small className="np-atlas-credit">Focused state and territory coastlines: <a href={boundaries.url} target="_blank" rel="noreferrer">U.S. Census Bureau 2025 cartographic boundaries, public domain</a>, generalized for display. National and world outlines: <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth, public domain</a>. Park points: <a href="https://www.arcgis.com/home/item.html?id=e62a2420170b4452b4a334db92130220" target="_blank" rel="noreferrer">NPS Land Resources Division, CC BY 4.0</a>. Offline reference, not live conditions.</small>
 </section>;
}
