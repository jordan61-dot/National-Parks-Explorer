import {matchesParkSearch, stateNames, type Park} from './reference';
import {matchesParkTheme} from './discovery';

/** Census four-region membership, with territories explicitly grouped by Explorer. */
export const atlasRegions:Record<string,readonly string[]> = {
 Northeast:'CT ME MA NH RI VT NJ NY PA'.split(' '),
 Midwest:'IN IL MI OH WI IA KS MN MO NE ND SD'.split(' '),
 South:'DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX'.split(' '),
 West:'AZ CO ID MT NV NM UT WY AK CA HI OR WA'.split(' '),
 'Pacific territories':['AS','GU','MP'], 'Caribbean territories':['PR','VI'],
};
export type AtlasFilters={query:string;region:string;designation:string;classification:string;visit:string;attribute:string;theme:string};
export const defaultFilters:AtlasFilters={query:'',region:'',designation:'',classification:'',visit:'',attribute:'',theme:''};
export const validLocation=(p:Park)=>!!p.location&&Number.isFinite(p.location.latitude)&&Number.isFinite(p.location.longitude)&&Math.abs(p.location.latitude)<=90&&Math.abs(p.location.longitude)<=180;
export const uniqueParks=(parks:Park[])=>[...new Map(parks.map(p=>[p.id,p])).values()];
export function filterAtlas(parks:Park[],f:AtlasFilters,visited:Set<string>,saved:Set<string>){
 return uniqueParks(parks).filter(p=>(!f.query||matchesParkSearch(p,f.query)||p.states.some(c=>(stateNames[c]??'').toLowerCase().includes(f.query.toLowerCase())))&&
 (!f.region||p.states.some(c=>atlasRegions[f.region]?.includes(c)))&&(!f.designation||p.designation===f.designation)&&(!f.classification||p.classification===f.classification)&&
 (!f.visit||(f.visit==='visited'?visited.has(p.id):!visited.has(p.id)))&&(!f.theme||matchesParkTheme(p,f.theme))&&
 (!f.attribute||(f.attribute==='trails'?p.attractions.some(a=>a.kind==='trail'):f.attribute==='attractions'?p.attractions.some(a=>a.kind!=='trail'):saved.has(p.id))));
}
export type GeoSummary={code:string;total:number;official:number;affiliated:number;coordinates:number;trails:number;attractions:number;trailRecords:number;attractionRecords:number;visited:number;saved:number;visitPercent:number|null;designations:Record<string,number>;parks:Park[]};
export function summarize(parks:Park[],code:string,visited:Set<string>=new Set(),saved:Set<string>=new Set()):GeoSummary {
 const units=uniqueParks(parks).filter(p=>code==='all'||p.states.includes(code));
 const trails=units.flatMap(p=>p.attractions.filter(a=>a.kind==='trail').map(a=>p.id+':'+a.id));
 const attractions=units.flatMap(p=>p.attractions.filter(a=>a.kind!=='trail').map(a=>p.id+':'+a.id));
 const v=units.filter(p=>visited.has(p.id)).length;
 return {code,total:units.length,official:units.filter(p=>p.classification==='system-unit').length,affiliated:units.filter(p=>p.classification==='affiliated').length,
 coordinates:units.filter(validLocation).length,trails:units.filter(p=>p.attractions.some(a=>a.kind==='trail')).length,attractions:units.filter(p=>p.attractions.some(a=>a.kind!=='trail')).length,
 trailRecords:new Set(trails).size,attractionRecords:new Set(attractions).size,visited:v,saved:units.filter(p=>saved.has(p.id)).length,visitPercent:units.length?v/units.length*100:null,
 designations:units.reduce<Record<string,number>>((a,p)=>(a[p.designation]=(a[p.designation]??0)+1,a),{}),parks:units};
}
export const geoMetrics=[
 {id:'total',label:'Associated records',unit:'records'}, {id:'official',label:'Official units',unit:'units'}, {id:'affiliated',label:'Affiliated areas',unit:'areas'},
 {id:'visited',label:'Recorded visited',unit:'records'}, {id:'visitPercent',label:'Recorded visitation',unit:'%'}, {id:'coordinates',label:'Records with valid coordinates',unit:'records'},
 {id:'trails',label:'Records with documented trails',unit:'records'}, {id:'attractions',label:'Records with documented attractions',unit:'records'},
 {id:'saved',label:'Saved destinations',unit:'records'},
] as const;
export type GeoMetric=typeof geoMetrics[number]['id'];
export const metricValue=(s:GeoSummary,m:GeoMetric):number|null=>s[m];
export const formatMetric=(v:number|null,m:GeoMetric)=>v===null?'No denominator':m==='visitPercent'?v.toFixed(1)+'%':Number.isInteger(v)?String(v):v.toFixed(1);
export const designationGroup=(d:string)=>d==='National Park'?'Parks':d.includes('Monument')?'Monuments':/Historic|Battlefield|Military|Memorial/.test(d)?'History & remembrance':/Seashore|Lakeshore|River|Recreation/.test(d)?'Water & recreation':'Other designations';
