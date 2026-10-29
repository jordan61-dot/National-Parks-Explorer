import {detailLoaders} from './data/loaders';
export interface Source {
  url: string;
  label: string;
  retrievedAt?: string;
}
export interface Article {
  contentKind?: "summary" | "official-excerpt";
  topic: string;
  title: string;
  text: string;
  source: string;
  retrievedAt: string;
  lastUpdated?: string | null;
}
export interface Attraction {
  descriptionKind?: "summary" | "official-excerpt" | "reference-note";
  id: string;
  name: string;
  kind:
    | "trail"
    | "visitor-center"
    | "overlook"
    | "historic-site"
    | "waterfall"
    | "scenic-drive"
    | "museum"
    | "cave"
    | "fort"
    | "battlefield"
    | "monument"
    | "place";
  description: string;
  source: string;
  retrievedAt?: string;
  length?: { value: number; unit: "mi" | "km"; method: string };
  difficulty?: string;
  accessibility?: string;
  latitude?: number;
  longitude?: number;
  routeType?: string;
  tags?: string[];
  sourceKey?: string;
  verificationStatus?: string;
  elevationGain?: {value:number;unit:'ft'|'m';method:string};
  surface?: string;
  terrain?: string;
  duration?: string;
  seasonalNotes?: string;
  permitNotes?: string;
  locationSource?: string;
  locationKind?: string;
  relatedSources?: string[];
  conflicts?: {field:string;detail:string;sources:string[]}[];
}
export interface Park {
  id: string;
  parkCode: string;
  name: string;
  designation: string;
  classification: "system-unit" | "affiliated";
  states: string[];
  website: string;
  description: string;
  descriptionKind?: 'summary';
  articleCount?: number;
  detailShard?: number;
  searchTerms?: string;
  photographs?: {id:string;asset:string;alt:string;caption:string;credit:string;license:string;source:string;width:number;height:number;rightsEvidence:string;sha256:string}[];
  sources: Source[];
  location?: {
    latitude: number;
    longitude: number;
    kind: string;
    source: string;
  };
  research: { title: string; url: string }[];
  activities: string[];
  topics: string[];
  articles?: Article[];
  attractions: Attraction[];
  coverageNote?: string;
  history?: {date:string;event:string;kind:string;source:string;retrievedAt:string}[];
}
export interface Reference {
  formatVersion: number;
  retrievedAt: string;
  rosterUrl: string;
  publishedSystemTotal: number;
  headingCounts: Record<string, number>;
  attribution: string;
  licenseUrl: string;
  units: Park[];
}
let pending: Promise<Reference> | undefined;
export function loadReference() {
  return (pending ??= import("./data/catalog.json")
    .then((x) => unpackReference(x.default))
    .catch((e) => {
      pending = undefined;
      throw e;
    }));
}
const detailPromises=new Map<number,Promise<Record<string,Pick<Park,'articles'|'research'|'sources'>>>>();
export async function loadParkDetails(id:string):Promise<Park|undefined> {
 const p=(await loadReference()).units.find(p=>p.id===id);
 if(!p || p.detailShard===undefined)return p;
 const shard=p.detailShard;
 let promise=detailPromises.get(shard);
 if(!promise){promise=detailLoaders[shard]().then(x=>unpackReference(x.default) as unknown as Record<string,Pick<Park,'articles'|'research'|'sources'>>).catch(e=>{detailPromises.delete(shard);throw e});detailPromises.set(shard,promise)}
 const details=(await promise)[id];if(!details)throw Error('Park detail shard incomplete');
 return {...p,...details};
}
export async function loadCompleteReference():Promise<Reference>{const r=await loadReference();return {...r,units:await Promise.all(r.units.map(async p=>(await loadParkDetails(p.id))!))}}
export const stateNames: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "U.S. Virgin Islands",
};
const groups: Record<string, string[]> = {
  Northeast: "CT ME MA NH RI VT NJ NY PA".split(" "),
  Midwest: "IN IL MI OH WI IA KS MN MO NE ND SD".split(" "),
  South: "DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX".split(" "),
  West: "AZ CO ID MT NV NM UT WY AK CA HI OR WA".split(" "),
  Territories: ["AS", "GU", "MP", "PR", "VI"],
};
export function parkRegions(p: Park) {
  return Object.keys(groups).filter((g) =>
    p.states.some((s) => groups[g].includes(s)),
  );
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function unpackReference(bundle: {strings:string[];reference:unknown}): Reference {
  const unpack=(v:unknown):unknown=>{
    if(Array.isArray(v))return v.map(unpack);
    if(v && typeof v==='object') {
      const o=v as Record<string,unknown>;
      if(Object.keys(o).length===1 && typeof o.$==='number') {
        if(!Number.isInteger(o.$) || bundle.strings[o.$]===undefined)throw Error('Invalid reference string index');
        return bundle.strings[o.$];
      }
      return Object.fromEntries(Object.entries(o).map(([k,x])=>[k,unpack(x)]));
    }
    return v;
  };
  return unpack(bundle.reference) as Reference;
}
export const normalizeSearch=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const searchCache=new WeakMap<Park,string>();
export function parkSearchText(p: Park) {
  const cached=searchCache.get(p);if(cached!==undefined)return cached;
  const result=normalizeSearch([p.name, p.designation, p.description, p.searchTerms??'', ...parkRegions(p),
    ...p.states.flatMap(s=>[s,stateNames[s]??s]), ...p.activities, ...p.topics,
    ...(p.articles??[]).flatMap(a=>[a.topic,a.title,a.text]),
    ...(p.history??[]).map(h=>h.event),
    ...p.attractions.flatMap(a=>[a.name,a.description,a.difficulty??'',a.routeType??'',...(a.tags??[])])].join(' '));
  searchCache.set(p,result);return result;
}
export const trailFilters=['Any trails','Short trails (up to 2 mi)','Waterfalls','History','Forest','Geology','Overlooks','Accessibility described','Long trails (10+ mi)'] as const;
export function parkSearchRank(p:Park,query:string) {
  const q=normalizeSearch(query).trim(),name=normalizeSearch(p.name);
  if(!q)return 0;
  if(name===q)return 4;
  if(name.startsWith(q))return 3;
  if(name.includes(q))return 2;
  return 1;
}
export function matchesTrail(a:Attraction,filter:string) {
  if(a.kind!=='trail')return false;
  const miles=a.length ? a.length.value*(a.length.unit==='km' ? 1/1.609344 : 1) : undefined;
  if(filter==='Short trails (up to 2 mi)')return miles!==undefined && miles<=2;
  if(filter==='Long trails (10+ mi)')return miles!==undefined && miles>=10;
  if(filter==='Accessibility described')return !!a.accessibility;
  const tags:Record<string,string>={Waterfalls:'waterfall',History:'historic',Forest:'forest',Geology:'geology',Overlooks:'overlook'};
  return filter==='Any trails' || !!a.tags?.includes(tags[filter]);
}
export function matchesParkSearch(p:Park,query:string){
 const q=normalizeSearch(query),state=Object.entries(stateNames).find(([code,name])=>normalizeSearch(name)===q || code===query.trim());
 if(state)return p.states.includes(state[0]);
 return q.split(/\s+/).every(t=>parkSearchText(p).includes(t));
}
export const trailMiles=(a:Attraction)=>a.length ? a.length.value*(a.length.unit==='km' ? 1/1.609344 : 1) : undefined;
export function trailDifficulty(a:Attraction){const d=normalizeSearch(a.difficulty??'');return !d ? 'unknown' : /strenuous|difficult|hard/.test(d) ? 'challenging' : /moderate/.test(d) ? 'moderate' : /easy/.test(d) ? 'easy' : 'other'}
export function matchesTrailDetails(a:Attraction,distance:string,difficulty:string,route:string){
 if((distance||difficulty||route) && a.kind!=='trail')return false;
 const miles=trailMiles(a);
 return (!difficulty||trailDifficulty(a)===difficulty)&&(!route||a.routeType===route)&&(!distance||(distance==='unknown'?miles===undefined:miles!==undefined&&(distance==='short'?miles<=2:distance==='medium'?miles>2&&miles<=5:miles>5)));
}
