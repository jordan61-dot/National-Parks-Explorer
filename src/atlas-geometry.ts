import type { Park } from './reference';
import { stateNames } from './reference';
import outlines from './map-outlines.json';
import boundaries from './atlas-boundaries.json';

export type Bounds = { x:number; y:number; width:number; height:number };
export type AtlasPoint = { park:Park; x:number; y:number };
export type AtlasCluster = { points:AtlasPoint[]; x:number; y:number };
export const territories = ['AS','GU','MP','PR','VI'] as const;
export const isTerritory = (s:string) => (territories as readonly string[]).includes(s);
export const jurisdictions = Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1]));
export const boundaryByCode = Object.fromEntries(boundaries.features.map(f=>[f.code,f]));
export const wrappedLongitude = (value:number,center:number) => ((value-center+540)%360)-180;

export function projectedPoint(park:Park,area:string):AtlasPoint|undefined {
 const loc=park.location;
 if(!loc || !Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude) || Math.abs(loc.latitude)>90 || Math.abs(loc.longitude)>180)return;
 if(area!=='us' && area!=='world' && !park.states.includes(area))return;
 const lat=loc.latitude,lng=loc.longitude;
 if(area==='world')return {park,x:(lng+180)*2,y:(90-lat)*2};
 if(area!=='us'){
  const feature=boundaryByCode[area]; if(!feature)return;
  const [lon,centerLat]=feature.center;
  return {park,x:wrappedLongitude(lng,lon)*Math.cos(centerLat*Math.PI/180),y:centerLat-lat};
 }
 if(park.states.includes('AK'))return {park,x:((lng>0?lng-360:lng)+180)*3,y:(72-lat)*3+240};
 if(park.states.includes('HI'))return {park,x:(lng+161)*7+210,y:(23-lat)*7+245};
 if(park.states.every(isTerritory) || !park.states.length)return;
 return {park,x:(lng+126)*10,y:(50-lat)*10};
}
export function fitBounds(b:Bounds,ratio:number):Bounds {
 const aspect=Number.isFinite(ratio)&&ratio>0?ratio:1.7;
 const midX=b.x+b.width/2,midY=b.y+b.height/2;
 const width=Math.max(b.width,b.height*aspect),height=width/aspect;
 return {x:midX-width/2,y:midY-height/2,width,height};
}
export function areaBounds(area:string,_parks:Park[],ratio:number, fullChain=false):Bounds {
 if(area==='world')return fitBounds({x:0,y:0,width:720,height:360},ratio);
 if(area==='us')return fitBounds({x:0,y:0,width:660,height:360},ratio);
 const feature=boundaryByCode[area];if(!feature)return fitBounds({x:0,y:0,width:660,height:360},ratio);
 const [x,y,w,h]=!fullChain && 'coreBounds' in feature && feature.coreBounds ? feature.coreBounds : feature.bounds;
 const pad=Math.max(Math.max(w,h)*.12,.02);
 return fitBounds({x:x-pad,y:y-pad,width:w+pad*2,height:h+pad*2},ratio);
}
export function zoomBounds(base:Bounds,zoom:number,pan:{x:number;y:number}):Bounds {
 const z=Math.max(1,Math.min(16,zoom)),width=base.width/z,height=base.height/z;
 const cx=Math.max(base.x+width/2,Math.min(base.x+base.width-width/2,base.x+base.width/2+pan.x*base.width/2));
 const cy=Math.max(base.y+height/2,Math.min(base.y+base.height-height/2,base.y+base.height/2+pan.y*base.height/2));
 return {x:cx-width/2,y:cy-height/2,width,height};
}
export const withinBounds=(p:AtlasPoint,b:Bounds)=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
export function collisionClusters(points:AtlasPoint[],b:Bounds,width:number,height:number,spacing=52):AtlasCluster[] {
 const groups=points.filter(p=>withinBounds(p,b)).map(p=>({points:[p],x:p.x,y:p.y}));
 // Recompute centers after every merge; a cluster itself must not overlap another target.
 let changed=true;
 while(changed){changed=false;outer:for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
  const a=groups[i],c=groups[j],dx=(a.x-c.x)/b.width*width,dy=(a.y-c.y)/b.height*height;
  if(Math.abs(dx)<spacing && Math.abs(dy)<spacing){const merged=[...a.points,...c.points];groups[i]={points:merged,x:merged.reduce((n,p)=>n+p.x,0)/merged.length,y:merged.reduce((n,p)=>n+p.y,0)/merged.length};groups.splice(j,1);changed=true;break outer;}
 }}
 return groups.sort((a,b)=>a.y-b.y||a.x-b.x);
}
export {outlines,boundaries};
