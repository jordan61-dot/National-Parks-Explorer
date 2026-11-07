import React,{useEffect,useState} from 'react';
import {stateNames} from './reference';
import {boundaries,boundaryByCode,outlines,projectedPoint,withinBounds,type Bounds} from './atlas-geometry';
import {choroplethColor,type Layers,type MapStyle} from './atlas-layers';
import {metricValue,type GeoMetric,type GeoSummary} from './atlas-data';
import terrainManifest from './terrain/manifest.json';

type TerrainAsset={bounds:number[];width:number;height:number;bytes:number;sha256:string};
export const terrainInfo=terrainManifest as Omit<typeof terrainManifest,'assets'|'unavailable'>&{assets:Record<string,TerrainAsset>;unavailable:Record<string,string>};
export function terrainAvailability(area:string){return terrainInfo.assets[area]?undefined:terrainInfo.unavailable[area]??'Relief is unavailable for this area. Standard geography remains available.'}

function Terrain({area,clipId,onStatus}:{area:string;clipId:string;onStatus:(v:string)=>void}){
 const [src,setSrc]=useState('');
 const asset=terrainInfo.assets[area];
 useEffect(()=>{let active=true;setSrc('');const unavailable=terrainAvailability(area);onStatus(unavailable??'Loading offline relief…');
  if(!unavailable)import('./terrain/assets').then(m=>{if(active){if(m.terrainAssets[area])setSrc(m.terrainAssets[area]);else onStatus('Relief asset missing. Standard map shown.')}}).catch(()=>{if(active)onStatus('Relief could not load. Standard map shown; retry the terrain style when online or after an offline update.')});return()=>{active=false};
 },[area,onStatus]);
 if(!asset||!src)return null;
 const [x,y,width,height]=asset.bounds;
 return <image href={src} x={x} y={y} width={width} height={height} preserveAspectRatio="none" clipPath={`url(#${clipId})`} className="np-atlas-relief" aria-hidden="true" onLoad={()=>onStatus('Natural Earth · generalized SRTM Plus relief · 1/30° source grid')} onError={()=>{setSrc('');onStatus('Relief image unavailable. Standard geographic map shown.')}}/>;
}
const nationalTransform=(code:string)=>{const feature=boundaryByCode[code];return feature?`translate(${(feature.center[0]+126)*10} ${(50-feature.center[1])*10}) scale(${10/Math.cos(feature.center[1]*Math.PI/180)} 10)`:undefined};

export function AtlasCartography({area,viewport,size,layers,mapStyle,summaries,metric,max,onArea,onTerrainStatus,selectedRegion}:{area:string;viewport:Bounds;size:{width:number;height:number};layers:Layers;mapStyle:MapStyle;summaries:GeoSummary[];metric:GeoMetric;max:number;onArea:(c:string)=>void;onTerrainStatus:(s:string)=>void;selectedRegion:readonly string[]}){
 const clipId=React.useId().replace(/:/g,'')+'-land';
 const shapes=area==='us'?outlines.states.map(s=>({code:s.code,path:s.code==='MI'?boundaryByCode.MI.path:s.path,transform:s.code==='MI'?nationalTransform('MI'):undefined})):area==='world'?outlines.countries.map(s=>({code:s.code,path:s.path,transform:undefined})):boundaryByCode[area]?[{code:area,path:boundaryByCode[area].path,transform:undefined}]:[];
 const summaryByCode=Object.fromEntries(summaries.map(s=>[s.code,s]));
 const candidates=area==='world'?[]:area==='us'?boundaries.features.filter(f=>!['AS','GU','MP','PR','VI'].includes(f.code)).map(f=>{
  const point=projectedPoint({states:[f.code],location:{latitude:f.center[1],longitude:f.center[0]}} as never,'us');return {...point!,code:f.code};
 }):boundaryByCode[area]?[{code:area,x:(boundaryByCode[area].bounds[0]+boundaryByCode[area].bounds[2]/2),y:(boundaryByCode[area].bounds[1]+boundaryByCode[area].bounds[3]/2)}]:[];
 const labels:{code:string;x:number;y:number}[]=[];
 for(const l of candidates){if(!withinBounds(l as never,viewport))continue;const near=labels.some(p=>Math.abs((p.x-l.x)/viewport.width*size.width)<48&&Math.abs((p.y-l.y)/viewport.height*size.height)<26);if(!near)labels.push(l)}
 return <svg viewBox={[viewport.x,viewport.y,viewport.width,viewport.height].join(' ')} preserveAspectRatio="none" className={'np-atlas-land np-atlas-style-'+mapStyle} aria-label={'Geographic outlines for '+(area==='us'?'United States · Alaska and Hawaii insets':area==='world'?'World and territories':stateNames[area])}>
  <defs><clipPath id={clipId}>{shapes.map(s=><path key={s.code} d={s.path} transform={s.transform} fillRule="evenodd"/>)}</clipPath><pattern id="atlas-missing" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e8e5dc"/><path d="M0 0L6 6" stroke="#8a8b7d" strokeWidth=".6"/></pattern></defs>
  {shapes.map(s=><path key={s.code} data-state={s.code} d={s.path} transform={s.transform} fillRule="evenodd" className={'np-atlas-outline'+(area!=='us'&&area!=='world'?' np-atlas-outline-active':'')+(area==='us'?' np-atlas-state-hit':'')+(selectedRegion.includes(s.code)?' np-atlas-region-active':'')} style={{stroke:layers.boundaries?undefined:'none',fill:layers.choropleth&&summaryByCode[s.code]?choroplethColor(metricValue(summaryByCode[s.code],metric),max):undefined}}
   role={area==='us'?'button':undefined} tabIndex={area==='us'?0:undefined} aria-label={area==='us'?'Explore '+stateNames[s.code]:undefined} onClick={area==='us'?()=>onArea(s.code):undefined} onKeyDown={area==='us'?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onArea(s.code)}}:undefined}><title>{stateNames[s.code]??s.code}{summaryByCode[s.code]?`: ${summaryByCode[s.code].total} associated records`:''}</title></path>)}
  {mapStyle==='terrain'&&<Terrain area={area} clipId={clipId} onStatus={onTerrainStatus}/>}
  {mapStyle==='terrain'&&shapes.map(s=><path key={s.code} d={s.path} transform={s.transform} fillRule="evenodd" className="np-atlas-relief-border" style={{stroke:layers.boundaries?undefined:'none',fill:layers.choropleth&&summaryByCode[s.code]?choroplethColor(metricValue(summaryByCode[s.code],metric),max):'none',fillOpacity:layers.choropleth?.55:0}}/>)}
  {layers.labels&&<g className="np-atlas-labels" aria-hidden="true">{labels.map(l=><text key={l.code} x={l.x} y={l.y} fontSize={viewport.width/size.width*11} textAnchor="middle">{area==='us'?l.code:stateNames[l.code]}</text>)}{area==='us'&&<><text x="80" y="335" fontSize={viewport.width/size.width*11}>ALASKA · INSET</text><text x="220" y="318" fontSize={viewport.width/size.width*11}>HAWAII · INSET</text></>}{area==='world'&&<><text x="110" y="180" fontSize={viewport.width/size.width*12}>PACIFIC OCEAN</text><text x="300" y="170" fontSize={viewport.width/size.width*12}>ATLANTIC OCEAN</text></>}</g>}
 </svg>;
}
