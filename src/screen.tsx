import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Host, ModuleProps, Snapshot, Json } from "./host";
import {
  loadReference,
  loadParkDetails, matchesParkSearch, matchesTrailDetails,
  safeUrl,
  stateNames,
  parkRegions,
  parkSearchText,
  normalizeSearch, trailFilters, matchesTrail, parkSearchRank,
  type Park,
  type Reference,
  type Attraction,
} from "./reference";
import {mediaImages} from './data/media';
import { Atlas } from "./Atlas";
import {
  Repository,
  entity,
  newVisit,
  entities,
  visits,
  statistics,
  historyPreview,
  applyHistory,
  validHistory,
  uid,
  completedActivities,
  setActivityCompleted,
  removePlannedActivity,
  type Entity,
  type Visit,
  type Stop,
} from "./domain";
import "./style.css";
const url = (s = "") => "#/apps/national-parks" + (s ? "/" + s : "");
interface ContextValue {
  host: Host;
  r: Reference;
  s: Snapshot;
  all: Entity[];
  repo: Repository;
  busy: boolean;
  run: (f: () => Promise<void>) => Promise<boolean>;
  confirm: (title: string, f: () => Promise<void>) => void;
}
const C = createContext<ContextValue>(null!);
const useParks = () => useContext(C);
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="np-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="np-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Link({ href, label }: { href: string; label: string }) {
  return safeUrl(href) ? (
    <a href={safeUrl(href)} target="_blank" rel="noreferrer">
      {label} ↗
    </a>
  ) : (
    <span>{label}: source unavailable</span>
  );
}
function SelectPark({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const { r } = useParks();
  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Choose a park</option>
      {value && !r.units.some((p) => p.id === value) && (
        <option value={value}>{value} (reference unavailable)</option>
      )}
      {r.units.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.classification === "affiliated" ? " · affiliated" : ""}
        </option>
      ))}
    </select>
  );
}
function Card({ park: p }: { park: Park }) {
  const { all } = useParks(),
    vs = visits(all).filter((v) => v.parkId === p.id);
  return (
    <article className="np-card">
      <p className="eyebrow">
        {p.designation} · {p.states.join(", ")}
      </p>
      <h3>
        <a href={url("park/" + p.id)}>{p.name}</a>
      </h3>
      <p>
        {p.description ||
          "Detailed description not available in this snapshot."}
      </p>
      <p className="muted">
        {p.classification === "system-unit"
          ? "Official system unit"
          : "Affiliated area"}{" "}
        ·{" "}
        {vs.some((v) => v.experience === "visited")
          ? "Visited"
          : vs.length
            ? "Pass-through only"
            : "Unvisited in itemized records"}
      </p>
    </article>
  );
}
function Overview() {
  const { r, all } = useParks(),
    stats = statistics(all, r.units);
  return (
    <>
      <section className="np-hero">
        <p className="eyebrow">A field guide and a personal record</p>
        <h2>
          Places worth knowing.
          <br />
          Experiences worth keeping.
        </h2>
        <p>
          Explore the National Park System, keep your visit history, and plan
          your next journey.
        </p>
        <div className="actions">
          <a className="button" href={url("atlas")}>
            Explore the atlas
          </a>
          <a className="button" href={url("visit/new")}>
            Record a visit
          </a>
        </div>
      </section>
      <div className="np-metrics">
        <div>
          <strong>{r.publishedSystemTotal}</strong>official units
        </div>
        <div>
          <strong>{stats.units}</strong>itemized units visited
        </div>
        <div>
          <strong>{stats.national}</strong>national parks visited
        </div>
        <div>
          <strong>{all.filter((e) => e.kind === "saved").length}</strong>saved
          destinations
        </div>
      </div>
      <div className="np-grid">
        {[
          [
            "catalog",
            "Park encyclopedia",
            "Find official units and affiliated areas.",
          ],
          [
            "visits",
            "Visit journal",
            "Keep repeat visits, photos and memories.",
          ],
          [
            "plans",
            "Destinations & plans",
            "Arrange stops and select attractions.",
          ],
          [
            "settings",
            "History & data",
            "Review history and protect your records.",
          ],
        ].map(([path, title, desc]) => (
          <article className="np-card" key={path}>
            <h3>
              <a href={url(path)}>{title}</a>
            </h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>
      <p>
        Reference retrieved {r.retrievedAt.slice(0, 10)}. Current access and
        closures require checking official visitor information.
      </p>
    </>
  );
}
function Catalog({ atlas = false }: { atlas?: boolean }) {
  const { r, all } = useParks(),
    [q, setQ] = useState(""),
    [state, setState] = useState(""),
    [scope, setScope] = useState(atlas ? "" : "system-unit"),
    [designation, setDesignation] = useState(""),
    [status, setStatus] = useState(""),
    [region,setRegion]=useState(""),
    [trail,setTrail]=useState(""),
    [count, setCount] = useState(24),
    [selected, setSelected] = useState("");
  const stats = statistics(all, r.units),
    saved = new Set(all.filter((e) => e.kind === "saved").map((e) => e.parkId));
  const parks = r.units.filter(
    (p) =>
      (!scope || p.classification === scope) &&
      (!state || p.states.includes(state)) &&
      (!region || parkRegions(p).includes(region)) &&
      (!trail || p.attractions.some(a=>matchesTrail(a,trail))) &&
      (!designation || p.designation === designation) &&
      matchesParkSearch(p,q) &&
      (!status ||
        (status === "visited" && stats.ids.has(p.id)) ||
        (status === "unvisited" && !stats.ids.has(p.id)) ||
        (status === "saved" && saved.has(p.id)) ||
        (status === "pass-through" &&
          visits(all).some(
            (v) => v.parkId === p.id && v.experience === "pass-through",
          ))),
  ).sort((a,b)=>parkSearchRank(b,q)-parkSearchRank(a,q));
  const filter = (fn: (s: string) => void, v: string) => {
    fn(v);
    setCount(24);
    setSelected("");
  };
  return (
    <>
      <h2>{atlas ? "Interactive atlas" : "Park encyclopedia"}</h2>
      <details open={!atlas} className="np-atlas-filters"><summary>Search and filter parks</summary>
      <div className="np-filters">
        <Field label="Search parks">
          <input
            type="search"
            value={q}
            onChange={(e) => filter(setQ, e.target.value)}
          />
        </Field>
        <Field label="Unit scope">
          <select
            value={scope}
            onChange={(e) => filter(setScope, e.target.value)}
          >
            <option value="system-unit">Official system units</option>
            <option value="affiliated">Affiliated areas</option>
            <option value="">Both, separately labeled</option>
          </select>
        </Field>
        <Field label="State or territory">
          <select
            value={state}
            onChange={(e) => filter(setState, e.target.value)}
          >
            <option value="">All locations</option>
            {Object.entries(stateNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Designation">
          <select
            value={designation}
            onChange={(e) => filter(setDesignation, e.target.value)}
          >
            <option value="">All designations</option>
            {[...new Set(r.units.map((p) => p.designation))].sort().map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Your records">
          <select
            value={status}
            onChange={(e) => filter(setStatus, e.target.value)}
          >
            <option value="">All parks</option>
            {["visited", "unvisited", "pass-through", "saved"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Region"><select value={region} onChange={e=>filter(setRegion,e.target.value)}><option value="">All regions</option>{['Northeast','Midwest','South','West','Territories'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Trail discovery"><select value={trail} onChange={e=>filter(setTrail,e.target.value)}><option value="">All parks, any trail coverage</option>{trailFilters.map(x=><option key={x}>{x}</option>)}</select></Field>
      </div>
      <button onClick={()=>{setQ('');setState('');setScope(atlas?'':'system-unit');setDesignation('');setStatus('');setRegion('');setTrail('');setCount(24);setSelected('');}}>Reset filters</button>
      </details>
      {trail && <p className="muted">Filters use recorded trail attributes only. Accessibility descriptions include limitations; read the trail details before choosing a route.</p>}
      <p role="status">{parks.length} matching places</p>
      {atlas && (
        <>
          <Atlas
            parks={parks}
            selectedId={selected}
            onSelect={setSelected}
            visitedIds={stats.ids}
            stateFilter={state}
            onStateChange={(code) => { setState(code); setCount(24); setSelected(""); }}
            profileHref={(id) => url("park/" + id)}
          />

        </>
      )}
      <div className="np-grid">
        {parks.slice(0, count).map((p) => (
          <Card key={p.id} park={p} />
        ))}
      </div>
      {!parks.length && <p>No places match the selected scope and filters. Try Reset filters, include affiliated areas, or remove the trail filter where structured information is missing.</p>}
      {count < parks.length && (
        <button onClick={() => setCount(count + 24)}>Show more parks</button>
      )}
    </>
  );
}
function Profile({ id }: { id: string }) {
  const { r, all, repo, run, confirm, busy } = useParks(),
    core = r.units.find((p) => p.id === id),
    saved = all.find((e) => e.kind === "saved" && e.parkId === id);
  const [detail,setDetail]=useState<Park>(),[detailError,setDetailError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;if(core?.detailShard!==undefined){setDetailError(false);void loadParkDetails(id).then(p=>{if(active)setDetail(p)}).catch(()=>{if(active)setDetailError(true)})}return()=>{active=false}},[id,core,attempt]);
  const p=detail??core;
  if (!p)
    return (
      <p>Park reference unavailable. Personal records remain preserved.</p>
    );
  return (
    <>
      <p className="eyebrow">
        {p.classification === "system-unit"
          ? "Official National Park System unit"
          : "Affiliated area"}
      </p>
      <h2>{p.name}</h2>
      <ReferencePhoto park={p}/>
      <p>
        {p.states.map((s) => stateNames[s] ?? s).join(" · ")} · {p.designation}
      </p>
      <p className="np-lead">
        {p.description || "Detailed description unavailable."}
      </p>
      {p.description && <p className="muted">{p.descriptionKind==='summary'?'Source-based introduction summary':'Official NPS park introduction'}</p>}
      <div className="actions">
        <a className="button" href={url("visit/new/" + id)}>
          Record visit
        </a>
        <button
          disabled={busy}
          onClick={() =>
            saved
              ? confirm("Remove saved destination and its notes?", () =>
                  repo.remove(saved),
                )
              : void run(() =>
                  repo.save(entity("saved", { parkId: id, notes: "" })),
                )
          }
        >
          {saved ? "Remove saved destination" : "Save destination"}
        </button>
        <a href={url("plans")}>Trip plans</a>
      </div>
      <nav className="np-sections" aria-label="Park sections">{[['encyclopedia','Encyclopedia'],['attractions','Attractions & trails'],['geography','Geography & research'],['visits','Your visits']].map(([anchor,label])=><a key={anchor} href={'#np-'+anchor} onClick={e=>{e.preventDefault();const target=document.getElementById('np-'+anchor);target?.scrollIntoView({block:'start'});target?.focus();}}>{label}</a>)}</nav>
      {!!p.history?.length && <section className="np-card"><h3>History milestones</h3><ul>{p.history.map((h,i)=><li key={i}><strong>{h.date}</strong> · {h.event} <span className="muted">({h.kind.replaceAll('-',' ')})</span> <Link href={h.source} label="Source" /></li>)}</ul></section>}
      <h3 id="np-encyclopedia" tabIndex={-1}>Encyclopedia</h3>
      {core?.detailShard!==undefined && !detail && !detailError && <p role="status">Loading offline article collection…</p>}
      {detailError && <p role="alert">Article collection unavailable. Your personal records remain available. <button onClick={()=>setAttempt(x=>x+1)}>Retry articles</button></p>}
      <p>
        Excerpts from official NPS pages, saved for offline reading. A shared
        park website may describe several separately listed units. Check the
        linked page for the full context and current visitor information.
      </p>
      {!p.articles?.length && <p>No detailed articles are available in this snapshot.</p>}
      {p.articles?.map((a,i) => (
        <details className="np-card np-article" open={a.contentKind==='summary'||i===0} key={a.source+'-'+i}>
          <summary>{a.topic} · {a.title}</summary>
          <p className="eyebrow">{a.topic}</p>
          <h4>{a.title}</h4>
          <p className="muted">{a.contentKind==='summary' ? 'Source-based summary' : 'Official NPS excerpt'}</p>
          {a.contentKind==='summary' ? <p>{a.text}</p> : <blockquote className="np-excerpt">{a.text}</blockquote>}
          <p className="muted">
            Retrieved {a.retrievedAt.slice(0, 10)}
            {a.lastUpdated ? ` · NPS last updated ${a.lastUpdated}` : ""}
          </p>
          <Link href={a.source} label="Read the full official article" />
        </details>
      ))}
      <h3 id="np-geography" tabIndex={-1}>Visitor information & research</h3>
      <p>
        These official sources open online. Bundled text does not report live
        closures, access conditions, bookings or travel times.
      </p>
      <a href={url('atlas')}>Explore the atlas and state filters</a>
      <ul>
        <li>
          <Link href={p.website} label="Official park information" />
        </li>
        {p.research.map((x) => (
          <li key={x.url}>
            <Link href={x.url} label={x.title} />
          </li>
        ))}
      </ul>
      <p>
        {p.location
          ? `Reference point: ${p.location.latitude.toFixed(4)}, ${p.location.longitude.toFixed(4)}. ${p.location.kind}.`
          : "Coordinates unknown."}
      </p>
      <h3>Activities & themes</h3>
      <p>
        {[...p.activities, ...p.topics].join(" · ") ||
          "Structured coverage unavailable; see official visitor sources."}
      </p>
      <h3 id="np-attractions" tabIndex={-1}>Attractions & trails</h3>
      {!!p.attractions.length && <p className="muted">Associated through official park resources. Shared park websites can cover several units; these listings do not establish a boundary location or navigable entrance.</p>}
      {!p.attractions.length && (
        <p>
          No individually sourced attraction records are included for this park
          yet.
        </p>
      )}
      <div className="np-grid">
        {p.attractions.map((a) => (
          <article key={a.id} className="np-card">
            <h4><a href={url('attraction/'+p.id+'/'+a.id)}>{a.name}</a></h4>
            {a.descriptionKind && <p className="muted">{a.descriptionKind==='summary' ? 'Source-based summary' : a.descriptionKind==='official-excerpt' ? 'Official NPS place excerpt' : 'Official source reference'}</p>}
            <p>
              {a.kind} · {a.description}
            </p>
            <p>
              {a.kind==='trail' && (a.length
                ? `${a.length.value} ${a.length.unit} (${a.length.method})`
                : "Distance unknown")}
              {a.difficulty ? " · " + a.difficulty : ""}
              {a.routeType ? " · " + a.routeType : ""}
            </p>
            {a.accessibility && <p>{a.accessibility}</p>}
            {!!a.tags?.length && <p className="muted">{a.tags.join(' · ')}</p>}
            {a.retrievedAt && <p className="muted">Reference checked {a.retrievedAt.slice(0,10)}. Check official resources for current access.</p>}
            <Link href={a.source} label="Official source" />
          </article>
        ))}
      </div>
      <h3 id="np-visits" tabIndex={-1}>Your visits</h3>
      <ul>
        {visits(all)
          .filter((v) => v.parkId === id)
          .map((v) => (
            <li key={v.id}>
              <a href={url("visit/" + v.id)}>
                {v.experience} · {v.date || "Date unknown"}
              </a>
            </li>
          ))}
      </ul>
      <h3>Sources & coverage</h3>
      <p>{p.coverageNote}</p>
      <p>Retrieved {r.retrievedAt.slice(0, 10)}</p>
      <details><summary>Reference sources ({p.sources.length})</summary><ul>
        {p.sources.map((s,i) => (
          <li key={s.url+'-'+i}>
            <Link href={s.url} label={s.label} />
          </li>
        ))}
      </ul></details>
    </>
  );
}
function ReferencePhoto({park}:{park:Park}) {
 const photo=park.photographs?.[0];
 if(!photo||!mediaImages[photo.id])return null;
 return <figure className="np-reference-photo"><img src={mediaImages[photo.id]} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async"/><figcaption>{photo.caption} <span className="muted">{photo.credit} · {photo.license}. </span><Link href={photo.source} label="Image and rights"/></figcaption></figure>;
}
function AttractionDetail({parkId,id}:{parkId:string;id:string}) {
 const {r,all,repo,run,busy}=useParks(),p=r.units.find(p=>p.id===parkId),a=p?.attractions.find(a=>a.id===id),[planId,setPlanId]=useState(''),[stopId,setStopId]=useState('new'),[success,setSuccess]=useState('');
 if(!p||!a)return <p>Attraction reference unavailable. Saved personal selections remain preserved.</p>;
 const facts=[['Distance',a.length?`${a.length.value} ${a.length.unit} (${a.length.method})`:'Unknown'],['Route',a.routeType??'Unknown'],['Difficulty',a.difficulty??'Unknown'],['Elevation gain',a.elevationGain?`${a.elevationGain.value} ${a.elevationGain.unit} (${a.elevationGain.method})`:'Unknown'],['Duration',a.duration??'Unknown'],['Surface',a.surface??'Unknown'],['Terrain',a.terrain??'Unknown']];
 return <><a href={url('park/'+p.id)}>{p.name}</a><p className="eyebrow">{a.kind} · {p.states.join(', ')}</p><h2>{a.name}</h2><p className="np-lead">{a.description}</p>
  {a.kind==='trail'&&<dl className="np-facts">{facts.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
  <h3>Accessibility & visitor context</h3><p>{a.accessibility??'Accessibility has not been established in this reference. Consult the official source for your requirements.'}</p>
  {a.seasonalNotes&&<p>{a.seasonalNotes}</p>}{a.permitNotes&&<p>{a.permitNotes}</p>}
  {!!a.conflicts?.length&&<section className="np-card"><h3>Unresolved source differences</h3>{a.conflicts.map((c,i)=><div key={i}><p>{c.detail}</p>{c.sources.map(s=><p key={s}><Link href={s} label="Measurement source"/></p>)}</div>)}</section>}
  <p>{a.latitude!==undefined?`${a.locationKind}: ${a.latitude}, ${a.longitude}.`:'Associated with this park; individual coordinates are unknown. The park administrative point is not an attraction location.'}</p>
  <p className="muted">Reference checked {a.retrievedAt?.slice(0,10)??'date unavailable'}. Static reference information does not establish current closures, conditions, fees, permits or operating hours.</p><Link href={a.source} label="Official attraction reference"/>
  {(a.relatedSources??[]).map(s=><p key={s}><Link href={s} label="Related official source"/></p>)}
  <h3>Plan a visit</h3><p>Add this activity to a trip. This does not record a visit.</p>
  <Field label="Trip for this attraction"><select value={planId} onChange={e=>{setPlanId(e.target.value);setStopId('new');setSuccess('')}}><option value="">Choose an existing trip</option>{all.filter(e=>e.kind==='plan').map(e=><option key={e.id} value={e.id}>{String(e.name)}</option>)}</select></Field>
  {planId && <Field label="Park stop"><select value={stopId} onChange={e=>{setStopId(e.target.value);setSuccess('')}}><option value="new">Create a new stop</option>{((all.find(e=>e.id===planId&&e.kind==='plan')?.stops??[]) as unknown as Stop[]).map((s,i)=>s.parkId===p.id?<option key={s.id} value={s.id}>Stop {i+1} · {s.completed?'completed':'planned'} · {s.notes.trim().slice(0,80)||'no notes'} · {s.attractions.length} activities</option>:null)}</select></Field>}
  <button disabled={busy||!planId} onClick={()=>{setSuccess('');void run(async()=>{const plan=all.find(e=>e.kind==='plan'&&e.id===planId);if(!plan)throw Error('Choose an existing trip.');const stops=plan.stops as unknown as Stop[];let next:Stop[];if(stopId==='new'){if(stops.length>=1000)throw Error('This trip already has 1,000 stops.');next=[...stops,{id:uid('stop'),parkId:p.id,notes:'',attractions:[a.id],completed:false}]}else{const stop=stops.find(s=>s.id===stopId&&s.parkId===p.id);if(!stop)throw Error('Stop changed. Reopen the trip and try again.');if(stop.attractions.includes(a.id))throw Error('This activity is already selected for that stop.');next=stops.map(s=>s.id===stopId?{...s,attractions:[...s.attractions,a.id]}:s)}await repo.save({...plan,stops:next as unknown as Json[]},plan.updatedAt);setSuccess(`${String(plan.name)}: ${stopId==='new'?'new stop created':'existing stop updated'}.`)})}}>Add attraction stop</button> <a href={url('plan/new')}>Create a trip</a>
  {success&&<p role="status">{success} <a href={url('plan/'+planId)}>Open saved trip</a></p>}
 </>;
}
function Journal() {
  const { all, r } = useParks(),
    [q, setQ] = useState("");
  return (
    <>
      <h2>Visit journal</h2>
      <a className="button" href={url("visit/new")}>
        Record visit
      </a>
      <Field label="Search visits">
        <input value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <p>
        Exact dates sort newest first. Approximate and unknown dates are shown
        separately afterward.
      </p>
      <div className="np-grid">
        {visits(all)
          .filter((v) =>
            [
              r.units.find((p) => p.id === v.parkId)?.name,
              v.notes,
              v.companions,
            ]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase()),
          )
          .sort((a, b) =>
            (b.precision === "exact" ? b.date : "").localeCompare(
              a.precision === "exact" ? a.date : "",
            ),
          )
          .map((v) => (
            <article className="np-card" key={v.id}>
              <h3>
                <a href={url("visit/" + v.id)}>
                  {r.units.find((p) => p.id === v.parkId)?.name ?? v.parkId}
                </a>
              </h3>
              <p>
                {v.experience} · {v.date || "Date unknown"}
                {v.endDate ? " to " + v.endDate : ""}
              </p>
              <p className="np-notes">{v.notes}</p>
              <p>
                {v.completed.length} activities · {v.imageIds.length} photos
                {v.returnPlanned ? " · Return planned" : ""}
                {v.favorite ? " · Favorite" : ""}
              </p>
            </article>
          ))}
      </div>
      {!visits(all).length && (
        <p>
          No itemized visits. Add one or review your historical source in
          History & data.
        </p>
      )}
    </>
  );
}
function Photo({ image, visit }: { image: Entity; visit: Visit }) {
  const { repo, run, confirm, busy } = useParks(),
    [src, setSrc] = useState(""),
    [failed, setFailed] = useState(false),
    [caption, setCaption] = useState(String(image.caption));
  useEffect(() => {
    let live = true,
      link = "";
    void repo.store
      .asset(image.id)
      .then((blob) => {
        if (live) {
          if (blob) {
            link = URL.createObjectURL(blob);
            setSrc(link);
          } else setFailed(true);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
      if (link) URL.revokeObjectURL(link);
    };
  }, [repo, image.id]);
  return (
    <figure>
      {src ? (
        <img
          src={src}
          alt={String(image.caption) || "Personal park photograph"}
        />
      ) : (
        <p>
          {failed ? "Photo unavailable; retain your backup." : "Loading photo…"}
        </p>
      )}
      <Field label="Photo caption">
        <input
          value={caption}
          maxLength={1000}
          onChange={(e) => setCaption(e.target.value)}
        />
      </Field>
      <button
        disabled={busy || caption === image.caption}
        onClick={() =>
          void run(() => repo.save({ ...image, caption }, image.updatedAt))
        }
      >
        Save caption
      </button>
      <button
        disabled={busy}
        onClick={() =>
          confirm("Remove this local photograph?", () =>
            repo.removePhoto(visit, image.id),
          )
        }
      >
        Remove photo
      </button>
    </figure>
  );
}
function VisitEditor({ id, parkId }: { id?: string; parkId?: string }) {
  const { all, r, repo, host, run, confirm, busy } = useParks(),
    old = visits(all).find((v) => v.id === id),
    [draft, setDraft] = useState(() =>
      old ? structuredClone(old) : newVisit(parkId),
    ),
    [revision, setRevision] = useState(old?.updatedAt);
  const p = r.units.find((p) => p.id === draft.parkId),
    stale = !!old && old.updatedAt !== revision,
    set = (key: string, value: JsonValue) =>
      setDraft((d) => ({ ...d, [key]: value }));
  if (id && !old)
    return (
      <p>
        Visit no longer available. <a href={url("visits")}>Return to journal</a>
      </p>
    );
  return (
    <>
      <h2>{old ? "Edit visit" : "Record visit"}</h2>
      {stale && (
        <p role="alert">
          Saved visit changed.{" "}
          <button
            onClick={() => {
              setDraft(structuredClone(old!));
              setRevision(old!.updatedAt);
            }}
          >
            Discard draft and reload saved visit
          </button>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await repo.save(draft, revision);
            location.hash = url("visits");
          });
        }}
      >
        <fieldset disabled={busy || stale}>
          <Field label="Park">
            <SelectPark
              value={draft.parkId}
              onChange={(parkId) =>
                draft.completed.length
                  ? confirm(
                      "Change park and clear completed attraction selections in this draft?",
                      async () =>
                        setDraft((d) => ({ ...d, parkId, completed: [] })),
                    )
                  : set("parkId", parkId)
              }
            />
          </Field>
          <Field label="Experience">
            <select
              value={draft.experience}
              onChange={(e) => set("experience", e.target.value)}
            >
              <option value="visited">Visited</option>
              <option value="pass-through">Pass-through</option>
            </select>
          </Field>
          <Field label="Date precision">
            <select
              value={draft.precision}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  precision: e.target.value as Visit["precision"],
                  date: "",
                  endDate: "",
                }))
              }
            >
              <option value="unknown">Unknown</option>
              <option value="approximate">Approximate period</option>
              <option value="exact">Exact date or range</option>
            </select>
          </Field>
          {draft.precision !== "unknown" && (
            <Field
              label={
                draft.precision === "exact"
                  ? "Visit date"
                  : "Approximate period"
              }
            >
              <input
                required
                type={draft.precision === "exact" ? "date" : "text"}
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
          )}
          {draft.precision === "exact" && (
            <Field label="End date (optional)">
              <input
                type="date"
                min={draft.date}
                value={draft.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          )}
          <Field label="Duration in minutes (blank means unknown)">
            <input
              type="number"
              min="0"
              step="any"
              value={draft.duration}
              onChange={(e) => set("duration", e.target.value)}
            />
          </Field>
          {[
            ["notes", "Personal notes"],
            ["companions", "Companions"],
            ["entrance", "Entrance & access notes"],
            ["travel", "Travel notes"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                value={String(draft[key])}
                maxLength={12000}
                onChange={(e) => set(key, e.target.value)}
              />
            </Field>
          ))}
          <Check
            label="Favorite experience"
            value={draft.favorite}
            onChange={(v) => set("favorite", v)}
          />
          <Check
            label="Plan to return"
            value={draft.returnPlanned}
            onChange={(v) => set("returnPlanned", v)}
          />
          <h3>Completed trails, drives & attractions</h3>
          {p?.attractions.map((a) => (
            <Check
              key={a.id}
              label={a.name}
              value={draft.completed.includes(a.id)}
              onChange={(v) =>
                set(
                  "completed",
                  v
                    ? [...draft.completed, a.id]
                    : draft.completed.filter((i) => i !== a.id),
                )
              }
            />
          ))}
          {!p?.attractions.length && (
            <p>
              Record other completed experiences in your notes. No structured
              attractions are included for this park yet.
            </p>
          )}
          {draft.completed
            .filter((id) => !p?.attractions.some((a) => a.id === id))
            .map((id) => (
              <Check
                key={id}
                label={id + " · source unavailable, preserved"}
                value
                onChange={() =>
                  set(
                    "completed",
                    draft.completed.filter((i) => i !== id),
                  )
                }
              />
            ))}
          <div className="actions">
            <button>Save visit</button>
            <a href={url("visits")}>Cancel</a>
          </div>
        </fieldset>
      </form>
      {old && (
        <>
          <h3>Local photographs</h3>
          <p>
            Save text changes before adding photos. Photos are resized locally,
            remain on this device, and are included in Explorer backups.
          </p>
          <Field label="Add photograph">
            <input
              disabled={busy || stale}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f)
                  void run(async () => {
                    await repo.photo(old, await host.optimizeImage(f), "");
                  });
              }}
            />
          </Field>
          <div className="np-grid">
            {old.imageIds
              .map((id) => all.find((e) => e.id === id))
              .filter((e): e is Entity => !!e)
              .map((e) => (
                <Photo key={e.id + e.updatedAt} image={e} visit={old} />
              ))}
          </div>
          <button
            className="danger"
            disabled={busy}
            onClick={() =>
              confirm(
                "Delete this visit and its photographs? Export a backup first if you need a copy.",
                async () => {
                  await repo.remove(old);
                  location.hash = url("visits");
                },
              )
            }
          >
            Delete visit
          </button>
        </>
      )}
    </>
  );
}
type JsonValue = string | boolean | string[];
function Saved({ item }: { item: Entity }) {
  const { r, repo, run, confirm, busy } = useParks(),
    [notes, setNotes] = useState(String(item.notes));
  return (
    <article className="np-card">
      <h3>
        <a href={url("park/" + item.parkId)}>
          {r.units.find((p) => p.id === item.parkId)?.name ??
            String(item.parkId)}
        </a>
      </h3>
      <Field label="Destination notes">
        <textarea
          value={notes}
          maxLength={12000}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <button
        disabled={busy || notes === item.notes}
        onClick={() =>
          void run(() => repo.save({ ...item, notes }, item.updatedAt))
        }
      >
        Save notes
      </button>
      <button
        disabled={busy}
        onClick={() =>
          confirm("Remove this saved destination and its notes?", () =>
            repo.remove(item),
          )
        }
      >
        Remove destination
      </button>
    </article>
  );
}
function Plans() {
 const {all,r}=useParks(), [query,setQuery]=useState(''),[status,setStatus]=useState('all'),plans=all.filter(e=>e.kind==='plan');
 const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const q=normalize(query),filtered=plans.filter(e=>{const stops=e.stops as unknown as Stop[],matches=!q||[String(e.name),...stops.map(s=>r.units.find(p=>p.id===s.parkId)?.name??s.parkId)].some(name=>normalize(name).includes(q));return matches&&(status==='all'||(status==='empty'&&stops.length===0)||(status==='incomplete'&&stops.some(s=>!s.completed))||(status==='completed'&&stops.length>0&&stops.every(s=>s.completed)))});
 return <><h2>Destinations & trip plans</h2><a className="button" href={url('plan/new')}>Create trip plan</a>
 <div className="np-filters"><Field label="Search trips"><input type="search" placeholder="Search trip or park name" value={query} onChange={e=>setQuery(e.target.value)}/></Field><Field label="Trip status"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All trips</option><option value="empty">No stops</option><option value="incomplete">Incomplete</option><option value="completed">Completed</option></select></Field></div><button type="button" onClick={()=>{setQuery('');setStatus('all')}}>Reset filters</button>
 {!plans.length?<p>No saved trips yet. Create a trip to begin planning.</p>:<><p>Showing {filtered.length} of {plans.length} trips.</p>{!filtered.length&&<p>No trips match your search and filters.</p>}</>}
 <div className="np-grid">{filtered.map(e=>{const stops=e.stops as unknown as Stop[],completed=stops.filter(s=>s.completed).length,activities=stops.reduce((n,s)=>n+s.attractions.length,0),next=stops.find(s=>!s.completed),park=next&&r.units.find(p=>p.id===next.parkId),name=String(e.name);return <article className="np-card np-trip-card" key={e.id}><h3>{name}</h3><p>{stops.length} park stops · {activities} planned activities</p><p>Progress: {completed} of {stops.length} stops completed</p>{stops.length>0&&<progress aria-label={`Stop completion for ${name}`} value={completed} max={stops.length}/>}<p>{!stops.length?'No stops added yet.':next?`Next incomplete stop: ${park?.name??'Park reference unavailable ('+next.parkId+')'}`:'All planned stops completed.'}</p><div className="actions"><a className="button" aria-label={`View itinerary for ${name}`} href={url('itinerary/'+e.id)}>View itinerary</a><a className="button" aria-label={`Edit trip ${name}`} href={url('plan/'+e.id)}>Edit trip</a></div></article>})}</div>
 <h3>Saved destinations</h3><div className="np-grid">{all.filter(e=>e.kind==='saved').map(e=><Saved key={e.id+e.updatedAt} item={e}/>)}</div><p>Save destinations from park profiles. Plan completion never creates a visit automatically.</p></>;
}

function TripOverview({id}:{id:string}) {
 const {all,r,repo,run,busy}=useParks(),plan=all.find(e=>e.id===id&&e.kind==='plan');
 const [needsReload,setNeedsReload]=useState(false),[feedback,setFeedback]=useState('');
 const completionFocus=useRef<HTMLInputElement|null>(null);
 useEffect(()=>{if(!busy){completionFocus.current?.focus();completionFocus.current=null}},[busy]);
 async function complete(stop:Stop,ref:string,value:boolean,label:string,control:HTMLInputElement) {
   if(!plan)return;
   completionFocus.current=control;
   setFeedback('');
   const ok=await run(async()=>{await repo.save(setActivityCompleted(plan!,stop.id,ref,value),plan!.updatedAt)});
   if(ok)setFeedback(`${label}: ${value?'completed':'planned'}. Saved.`);
   else setNeedsReload(true);
 }
 if(!plan)return <p>Trip unavailable. <a href={url('plans')}>Return to trips</a></p>;
 const stops=plan.stops as unknown as Stop[];
 return <article className="np-itinerary"><div className="np-itinerary-actions actions"><a href={url('plans')}>Trip list</a><a href={url('plan/'+id)}>Edit trip</a><button onClick={()=>window.print()}>Print itinerary</button></div><p>Personal trip plan</p><h2>{String(plan.name)}</h2>{!!plan.notes&&<p className="np-notes">{String(plan.notes)}</p>}<p>{stops.length} park stops · {stops.filter(s=>s.completed).length} completed · {stops.reduce((n,s)=>n+s.attractions.length,0)} planned activity selections</p><p>Activity checks, stop completion and visit history are independent.</p><div className="np-checklist-feedback"><p role="status">{busy?'Saving activity…':feedback}</p>{needsReload&&<p role="alert">The activity change was not confirmed. Reload the saved trip before retrying. <button type="button" disabled={busy} onClick={()=>{void run(async()=>{}).then(ok=>{if(ok){setNeedsReload(false);setFeedback('Saved trip reloaded. You can retry the activity.')}})}}>Reload saved trip</button></p>}</div>
 {!stops.length&&<p>No park stops planned yet. Use the trip editor to add stops.</p>}
 {stops.map((s,i)=>{const p=r.units.find(p=>p.id===s.parkId);return <section key={s.id} className="np-itinerary-stop"><h3>Stop {i+1} — {p?.name??'Saved park — current reference unavailable'}</h3>{!p&&<p>Park identifier: {s.parkId}</p>}{p&&<p>{p.designation} · {p.states.map(x=>stateNames[x]??x).join(', ')}</p>}<p>Status: {s.completed?'Completed':'Planned'}</p>{s.notes&&<p className="np-notes">{s.notes}</p>}{p&&<p><a href={url('park/'+p.id)}>Park details</a> · <Link href={p.website} label="Official park information"/></p>}
 {s.attractions.length?<><h4>Planned activities</h4><p>{completedActivities(s).length} of {s.attractions.length} planned activities completed</p><ol>{s.attractions.map(ref=>{const a=p?.attractions.find(a=>a.id===ref);const done=completedActivities(s).includes(ref),label=a?.name??`Unavailable activity ${ref}`;return <li key={ref}><label className="np-activity-check"><input type="checkbox" checked={done} disabled={busy||needsReload} aria-label={`Mark ${label} completed at stop ${i+1}`} onChange={e=>{void complete(s,ref,e.target.checked,label,e.currentTarget)}}/><span>Activity completed</span></label><p className="np-activity-status">{done?'Completed':'Planned'}</p>{a?<><strong><a href={url('attraction/'+s.parkId+'/'+ref)}>{a.name}</a></strong><p>{a.kind}{a.length?` · ${a.length.value} ${a.length.unit} (${a.length.method})`:a.kind==='trail'?' · Distance unknown':''}{a.routeType?' · '+a.routeType:''}{a.difficulty?' · '+a.difficulty:a.kind==='trail'?' · Difficulty unknown':''}{a.elevationGain?` · Elevation gain ${a.elevationGain.value} ${a.elevationGain.unit} (${a.elevationGain.method})`:''}</p>{a.accessibility&&<p>{a.accessibility}</p>}{a.conflicts?.map((c,i)=><p key={i}>Source difference: {c.detail}</p>)}</>:<p>Previously saved attraction — current reference unavailable. Identifier: {ref}</p>}</li>})}</ol></>:<p>No activities selected for this stop.</p>}</section>})}</article>;
}
function PlanEditor({ id }: { id?: string }) {
  const { all, r, repo, run, confirm, busy } = useParks(),
    old = all.find((e) => e.id === id && e.kind === "plan"),
    [draft, setDraft] = useState(() =>
      old
        ? structuredClone(old)
        : entity("plan", { name: "", notes: "", stops: [] }),
    ),
    [revision, setRevision] = useState(old?.updatedAt),
    [park, setPark] = useState("");
  const stops = draft.stops as unknown as Stop[],
    stale = !!old && old.updatedAt !== revision,
    setStops = (stops: Stop[]) =>
      setDraft((d) => ({ ...d, stops: JSON.parse(JSON.stringify(stops)) }));
  if (id && !old)
    return (
      <p>
        Plan unavailable. <a href={url("plans")}>Return to plans</a>
      </p>
    );
  return (
    <>
      <h2>{old ? "Edit trip plan" : "Create trip plan"}</h2>{old&&<a href={url("itinerary/"+old.id)} target="_blank" rel="noopener noreferrer">View saved itinerary (new tab)</a>}
      <p>
        Stops follow your chosen order. Current conditions, travel times and
        bookings are not inferred.
      </p>
      {stale && (
        <p role="alert">
          Plan changed.{" "}
          <button
            onClick={() => {
              setDraft(structuredClone(old!));
              setRevision(old!.updatedAt);
            }}
          >
            Discard draft and reload saved plan
          </button>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await repo.save(draft, revision);
            location.hash = url("plans");
          });
        }}
      >
        <fieldset disabled={busy || stale}>
          <Field label="Trip name">
            <input
              required
              maxLength={200}
              value={String(draft.name)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </Field>
          <Field label="Trip notes">
            <textarea
              maxLength={12000}
              value={String(draft.notes)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </Field>
          <Field label="Park to add">
            <SelectPark value={park} onChange={setPark} required={false} />
          </Field>
          <button
            type="button"
            disabled={!park || stops.length >= 1000}
            onClick={() => {
              setStops([
                ...stops,
                {
                  id: uid("stop"),
                  parkId: park,
                  notes: "",
                  completed: false,
                  attractions: [],
                },
              ]);
              setPark("");
            }}
          >
            Add stop
          </button>
          <ol className="np-stops">
            {stops.map((s, i) => {
              const p = r.units.find((p) => p.id === s.parkId),
                update = (value: Partial<Stop>) =>
                  setStops(
                    stops.map((v, j) => (j === i ? { ...v, ...value } : v)),
                  ),
                move = (delta: number) => {
                  const a = [...stops];
                  [a[i], a[i + delta]] = [a[i + delta], a[i]];
                  setStops(a);
                };
              return (
                <li className="np-card" key={s.id}>
                  <h3>
                    {i + 1}. {p?.name ?? s.parkId}
                  </h3>
                  <div className="actions">
                    <button
                      type="button"
                      disabled={!i}
                      onClick={() => move(-1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      disabled={i === stops.length - 1}
                      onClick={() => move(1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirm(
                          "Remove this stop and its notes from the draft?",
                          async () =>
                            setStops(stops.filter((v) => v.id !== s.id)),
                        )
                      }
                    >
                      Remove stop
                    </button>
                  </div>
                  <Field label={"Stop " + (i + 1) + " notes"}>
                    <textarea
                      maxLength={12000}
                      value={s.notes}
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </Field>
                  <Check
                    label="Stop completed"
                    value={s.completed}
                    onChange={(v) => update({ completed: v })}
                  />
                  <h4>Planned activities</h4>
                  {!s.attractions.length && <p>No activities selected for this stop.</p>}
                  {s.attractions.map((ref,index)=>{const a=p?.attractions.find(x=>x.id===ref);return <div className="np-card" key={ref}><p>Activity {index+1} of {s.attractions.length} · {completedActivities(s).includes(ref)?'Completed':'Planned'}</p>{a ? <><strong><a href={url('attraction/'+s.parkId+'/'+a.id)} target="_blank" rel="noopener noreferrer">{a.name}</a></strong><p>{a.kind} · {p?.name} · {a.length?`${a.length.value} ${a.length.unit} (${a.length.method})`:'Distance unknown'}{a.routeType?' · '+a.routeType:''}{a.difficulty?' · '+a.difficulty:''}{a.elevationGain?` · elevation gain ${a.elevationGain.value} ${a.elevationGain.unit} (${a.elevationGain.method})`:''}</p>{!!a.conflicts?.length&&<p>Official sources differ: {a.conflicts.map(c=>c.detail).join(' ')}</p>}</> : <p>Unavailable saved attraction reference: {ref}. It remains saved until you remove it.</p>}<div className="actions"><button type="button" aria-label={`Move ${a?.name??ref} up`} disabled={index===0} onClick={()=>{const next=[...s.attractions];[next[index-1],next[index]]=[next[index],next[index-1]];update({attractions:next})}}>Move up</button><button type="button" aria-label={`Move ${a?.name??ref} down`} disabled={index===s.attractions.length-1} onClick={()=>{const next=[...s.attractions];[next[index],next[index+1]]=[next[index+1],next[index]];update({attractions:next})}}>Move down</button><button type="button" onClick={()=>update(removePlannedActivity(s,ref))}>Remove {a?.name??ref}</button></div></div>})}
                  <p className="muted">Activity details open in a new tab so your unsaved trip edits remain here.</p>
                  <details><summary>Available attractions and trails</summary>
                    {p?.attractions.filter(a=>!s.attractions.includes(a.id)).map(a=><Check key={a.id} label={a.name} value={false} onChange={()=>update({attractions:[...s.attractions,a.id]})}/>)}
                    {s.attractions.some(id=>!p?.attractions.some(a=>a.id===id))&&<p className="note">Some saved attraction references are unavailable in this catalog. Their identifiers remain saved; use your stop notes for context.</p>}
                    {!p?.attractions.length&&<p>No structured attraction records; keep selections in stop notes.</p>}
                  </details>
                </li>
              );
            })}
          </ol>
          <button>Save trip plan</button>
        </fieldset>
      </form>
      {old && (
        <button
          disabled={busy}
          className="danger"
          onClick={() =>
            confirm("Delete this trip plan and stop notes?", async () => {
              await repo.remove(old);
              location.hash = url("plans");
            })
          }
        >
          Delete plan
        </button>
      )}
    </>
  );
}
function Stats() {
  const { all, r, s } = useParks(),
    st = statistics(all, r.units),
    baseline = all.find((e) => e.kind === "baseline"),
    goal = (s.settings[0]?.value as { goal: number | null } | undefined)?.goal,
    covered = r.units.filter(
      (p) => st.ids.has(p.id) && p.classification === "system-unit",
    );
  return (
    <>
      <h2>Statistics & milestones</h2>
      <p>
        Only itemized visited experiences count toward coverage. Affiliated
        areas, pass-throughs and historical totals are separate.
      </p>
      <div className="np-metrics">
        {[
          [st.units, "official units visited"],
          [st.national, "national parks visited"],
          [st.passThrough, "pass-through records"],
          [st.repeat, "repeat visits"],
          [st.activities, "activity completions"],
          [covered.length ? "Recorded" : "Pending", "first official visit"],
        ].map(([v, label]) => (
          <div key={label}>
            <strong>{v}</strong>
            {label}
          </div>
        ))}
      </div>
      {goal && (
        <>
          <progress
            max={goal}
            value={Math.min(st.units, goal)}
            aria-label="Personal goal"
          />
          <p>
            {st.units} / {goal} official-unit goal
          </p>
        </>
      )}
      {baseline && (
        <p className="note">
          Historical aggregate: {String(baseline.total)} national parks,
          including {String(baseline.passThrough)} pass-throughs. It is not
          added to itemized totals. {String(baseline.context)}
        </p>
      )}
      <h3>States & territories represented by visited units</h3>
      <ul>
        {st.states.sort().map((s) => (
          <li key={s}>
            {stateNames[s]}:{" "}
            {covered.filter((p) => p.states.includes(s)).length}
          </li>
        ))}
      </ul>
      <h3>Region coverage</h3>
      <ul>
        {["Northeast", "Midwest", "South", "West", "Territories"].map(
          (region) => (
            <li key={region}>
              {region}:{" "}
              {covered.filter((p) => parkRegions(p).includes(region)).length}
            </li>
          ),
        )}
      </ul>
      <p>
        Multistate units appear in multiple subtotals. These subtotals are not
        additive and do not establish which state you entered during a visit.
      </p>
      <h3>Milestones</h3>
      <div className="np-grid">
        {[
          ["First official unit", st.units, 1],
          ["Ten official units", st.units, 10],
          ["Five national parks", st.national, 5],
          ["Return to a park", st.repeat, 1],
          ["Ten recorded activities", st.activities, 10],
        ].map(([name, value, target]) => (
          <article className="np-card" key={name}>
            <h4>{name}</h4>
            <progress max={Number(target)} value={Math.min(Number(value), Number(target))} aria-label={String(name)} />
            <p>{Number(value) >= Number(target) ? "Reached" : `${value} / ${target}`}</p>
          </article>
        ))}
      </div>
      <h3>Timeline</h3>
      <ol>
        {visits(all)
          .filter((v) => v.precision === "exact")
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((v) => (
            <li key={v.id}>
              <a href={url("visit/" + v.id)}>
                {v.date}:{" "}
                {r.units.find((p) => p.id === v.parkId)?.name ?? v.parkId}
              </a>
            </li>
          ))}
      </ol>
      <p>
        {visits(all).filter((v) => v.precision !== "exact").length} visits have
        approximate or unknown dates and cannot be placed precisely on the
        timeline.
      </p>
    </>
  );
}
function Settings() {
  const { host, r, s, repo, run, confirm, busy, all } = useParks(),
    [goal, setGoal] = useState(
      String(
        (s.settings[0]?.value as { goal: number | null } | undefined)?.goal ??
          "",
      ),
    ),
    [offer, setOffer] = useState(host.personalHistory),
    [preview, setPreview] = useState<ReturnType<typeof historyPreview>>();
  const baseline = all.find((e) => e.kind === "baseline");
  return (
    <>
      <h2>History, goals & data</h2>
      <Field label="Personal official-unit goal (optional)">
        <input
          type="number"
          min="1"
          max="100000"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </Field>
      <button
        disabled={busy}
        onClick={() =>
          void run(() => repo.goal(goal === "" ? null : Number(goal)))
        }
      >
        Save goal
      </button>
      <h3>Review historical visit source</h3>
      <p>
        Choose a local history JSON file to preview. No upload occurs.
        Unidentified parks, dates, durations and companions are never inferred.
        Existing visits are held for reconciliation.
      </p>
      {baseline && (
        <p>
          Saved historical total: {String(baseline.total)}, including{" "}
          {String(baseline.passThrough)} pass-throughs.{" "}
          {String(baseline.context)}
        </p>
      )}
      <Field label="Local history JSON">
        <input
          disabled={busy}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f)
              void run(async () => {
                if (f.size > 1000000) throw Error("History file exceeds 1 MB.");
                const x = JSON.parse(await f.text());
                if (!validHistory(x)) throw Error("Invalid history file.");
                setOffer(x);
                setPreview(undefined);
              });
          }}
        />
      </Field>
      {offer && (
        <>
          <p>
            Source reports {offer.total} national parks, including{" "}
            {offer.passThrough} pass-throughs, with {offer.parks.length} named
            parks.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () =>
                setPreview(
                  historyPreview(await repo.store.snapshot(), offer, r.units),
                ),
              )
            }
          >
            Preview historical import
          </button>
        </>
      )}
      {preview && (
        <article className="np-card">
          <h4>{preview.additions.length} additions · zero overwrites</h4>
          <ul>
            {preview.additions.map((e) => (
              <li key={e.id}>
                {e.kind === "baseline"
                  ? "Separate historical aggregate"
                  : r.units.find((p) => p.id === e.parkId)?.name +
                    " · visited, date unknown"}
              </li>
            ))}
          </ul>
          <ul>
            {preview.held.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <button
            disabled={busy || !preview.additions.length}
            onClick={() =>
              confirm("Import the reviewed historical additions?", async () => {
                await applyHistory(repo.store, preview);
                setPreview(undefined);
              })
            }
          >
            Confirm history import…
          </button>
        </article>
      )}
      <h3>Backups & recovery</h3>
      <p>
        Use Explorer backups for visits, photos, goals, destinations and plans.
        Restore requires a preview and confirmation. Automatic park-record merge
        is unavailable. Browser eviction, a new device or a changed origin can
        make local data inaccessible; keep backups outside the browser.
      </p>
      <a className="button" href="#/settings/data">
        Open Data & Storage
      </a>
      <h3>Reference coverage</h3>
      <p>
        {r.publishedSystemTotal} official units and{" "}
        {r.units.filter((p) => p.classification === "affiliated").length}{" "}
        affiliated areas. Retrieved {r.retrievedAt.slice(0, 10)}.
      </p>
      <p>
        {r.units.filter((p) => p.description).length} descriptions;{" "}
        {r.units.filter((p) => p.location).length} reference locations;{" "}
        {r.units.reduce((n, p) => n + p.attractions.length, 0)} attraction
        entries; {r.units.filter((p) => p.articles?.length).length} places with
        detailed offline articles. Article retrieval dates appear on each profile.
      </p>
      <p>{r.attribution}</p>
    </>
  );
}
function Discover({trailsOnly=false}:{trailsOnly?:boolean}) {
  const { r,all } = useParks(),
    [q, setQ] = useState(""),
    [kind, setKind] = useState(""),
    [state,setState]=useState(''),
    [park,setPark]=useState(''),
    [trail,setTrail]=useState(''),
    [status,setStatus]=useState(''),
    [region,setRegion]=useState(''),[distance,setDistance]=useState(''),[difficulty,setDifficulty]=useState(''),[routeType,setRouteType]=useState(''),
    [limit, setLimit] = useState(30),
    items = r.units
      .flatMap((p) => p.attractions.map((a) => ({ p, a })))
      .filter(
        ({ p, a }) =>
          (!kind || a.kind === kind) &&
          (!trailsOnly || a.kind==='trail') &&
          (!region || parkRegions(p).includes(region)) && matchesTrailDetails(a,distance,difficulty,routeType) &&
          (!state || p.states.includes(state)) && (!park || p.id===park) &&
          (!trail || matchesTrail(a,trail)) &&
          (!status || (status==='saved' ? all.some(e=>e.kind==='saved' && e.parkId===p.id) : visits(all).some(v=>v.parkId===p.id && v.experience==='visited'))) &&
          normalizeSearch([p.name,...p.states.map(s=>stateNames[s]??s),a.name,a.description,...(a.tags??[])].join(' ')).includes(normalizeSearch(q)),
      );
  return (
    <>
      <h2>{trailsOnly ? 'Trail discovery' : 'Attractions & trails'}</h2>
      <p>
        Available sourced coverage is incomplete. Park profiles provide further
        official research links.
      </p>
      <Field label="Search attractions">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(30);
          }}
        />
      </Field>
      <Field label="Attraction type">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setLimit(30);
          }}
        >
          <option value="">All types</option>
          {[...new Set(r.units.flatMap(p=>p.attractions.map(a=>a.kind)))].sort().map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </Field>
      <div className="np-filters">
       <Field label="Discovery region"><select value={region} onChange={e=>{setRegion(e.target.value);setLimit(30)}}><option value="">All regions</option>{['Northeast','Midwest','South','West','Territories'].map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field label="Trail distance"><select value={distance} onChange={e=>{setDistance(e.target.value);setLimit(30)}}><option value="">Any published distance</option><option value="short">Up to 2 mi</option><option value="medium">Over 2 to 5 mi</option><option value="long">Over 5 mi</option><option value="unknown">Distance unknown</option></select></Field>
       <Field label="Trail difficulty"><select value={difficulty} onChange={e=>{setDifficulty(e.target.value);setLimit(30)}}><option value="">Any difficulty</option><option value="easy">Easy, as described</option><option value="moderate">Moderate, including mixed ratings</option><option value="challenging">Difficult or strenuous</option><option value="unknown">Difficulty unknown</option><option value="other">Other description</option></select></Field>
       <Field label="Trail route"><select value={routeType} onChange={e=>{setRouteType(e.target.value);setLimit(30)}}><option value="">Any route</option>{[...new Set(r.units.flatMap(p=>p.attractions.filter(a=>a.kind==='trail'&&a.routeType).map(a=>a.routeType!)))].sort().map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field label="Attraction park"><select value={park} onChange={e=>{setPark(e.target.value);setLimit(30)}}><option value="">All parks and affiliated areas</option>{r.units.filter(p=>p.attractions.length).map(p=><option key={p.id} value={p.id}>{p.name}{p.classification==='affiliated' ? ' · affiliated' : ''}</option>)}</select></Field>
       <Field label="Attraction state or territory"><select value={state} onChange={e=>{setState(e.target.value);setLimit(30)}}><option value="">All locations</option>{Object.entries(stateNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
       <Field label="Trail attributes"><select value={trail} onChange={e=>{setTrail(e.target.value);setLimit(30)}}><option value="">Any reference attributes</option>{trailFilters.map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field label="Attraction personal records"><select value={status} onChange={e=>{setStatus(e.target.value);setLimit(30)}}><option value="">Any visit or saved status</option><option value="visited">Visited parks</option><option value="saved">Saved parks</option></select></Field>
      </div>
      <button onClick={()=>{setQ('');setKind('');setState('');setPark('');setTrail('');setStatus('');setRegion('');setDistance('');setDifficulty('');setRouteType('');setLimit(30)}}>Reset attraction filters</button>
      <p className="muted">Distance filters use the published measurement basis shown on each trail. One-way and round-trip values are not interchangeable. Unknown attributes are never treated as easy or accessible.</p>
      <p role="status">{items.length} sourced matches</p>
      {!items.length && <p>No sourced attractions match these filters. Missing trail attributes are excluded; broaden your filters or read the park's official hiking guide.</p>}
      <div className="np-grid">
        {items.slice(0, limit).map(({ p, a }) => (
          <article className="np-card" key={p.id + a.id}>
            <h3><a href={url('attraction/'+p.id+'/'+a.id)}>{a.name}</a></h3>
            <a href={url("park/" + p.id)}>{p.name}</a>
            <p>{a.description}</p>
            {a.length && <p>{a.length.value} {a.length.unit} · {a.length.method}</p>}
            {(a.routeType || a.difficulty) && <p>{[a.routeType,a.difficulty].filter(Boolean).join(' · ')}</p>}
            {a.accessibility && <p>{a.accessibility}</p>}
            <Link href={a.source} label="Official source" />
          </article>
        ))}
      </div>
      {limit < items.length && (
        <button onClick={() => setLimit(limit + 30)}>Show more</button>
      )}
    </>
  );
}
export function createScreen(host: Host) {
  return function Screen({ services, route }: ModuleProps) {
    const [r, setR] = useState<Reference>(),
      [s, setS] = useState<Snapshot>(),
      [error, setError] = useState(""),
      [notice, setNotice] = useState(""),
      [busy, setBusy] = useState(false),
      [retry, setRetry] = useState(0),
      [confirmation, setConfirmation] = useState<{
        title: string;
        f: () => Promise<void>;
      }>();
    const repo = useMemo(
        () => new Repository(services.store),
        [services.store],
      ),
      alive = useRef(true),
      locked = useRef(false),
      generation = useRef(0);
    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);
    useEffect(() => {
      let active = true;
      void Promise.all([loadReference().catch(e=>{
        services.report(e);
        return {formatVersion:1,retrievedAt:'',rosterUrl:'https://www.nps.gov/aboutus/national-park-system.htm',publishedSystemTotal:0,headingCounts:{},attribution:'Reference unavailable',licenseUrl:'https://www.nps.gov/aboutus/disclaimer.htm',units:[]} as Reference;
      }), services.store.snapshot()])
        .then(([r, s]) => {
          if (active) {
            setR(r);
            setS(s);
            setError(r.units.length?'':'Reference catalog unavailable. Personal records are available using saved identifiers.');
          }
        })
        .catch((e) => {
          services.report(e);
          if (active)
            setError(
              "Unable to open park records. Saved data has not been reset.",
            );
        });
      return () => {
        active = false;
      };
    }, [services.store, retry]);
    async function run(f: () => Promise<void>) {
      if (locked.current) return false;
      locked.current = true;
      generation.current++;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await f();
        const next = await services.store.snapshot();
        if (alive.current) {
          setS(next);
          setNotice("Operation completed.");
        }
        services.events.emit("data-changed");
        return true;
      } catch (e) {
        services.report(e);
        if (alive.current)
          setError(e instanceof Error ? e.message : "Operation failed.");
        return false;
      } finally {
        locked.current = false;
        if (alive.current) setBusy(false);
      }
    }
    useEffect(() => {
      const refresh = () => {
        const request = ++generation.current;
        if (!locked.current)
          void services.store
            .snapshot()
            .then((next) => {
              if (
                alive.current &&
                !locked.current &&
                request === generation.current
              )
                setS(next);
            })
            .catch((e) => services.report(e));
      };
      window.addEventListener("focus", refresh);
      return () => window.removeEventListener("focus", refresh);
    }, [services.store]);
    if (!r || !s)
      return (
        <>
          <h1>National Parks Explorer</h1>
          {error ? (
            <p role="alert">
              {error}{" "}
              <button onClick={() => setRetry((v) => v + 1)}>Retry</button>
            </p>
          ) : (
            <p role="status">Opening parks…</p>
          )}
        </>
      );
    const seg = route.split("/");
    let content: ReactNode =
      route === "" ? (
        <Overview />
      ) : route === "catalog" || route === "atlas" ? (
        <Catalog key={route} atlas={route === "atlas"} />
      ) : route === "discover" ? (
        <Discover />
      ) : route === "trails" ? (
        <Discover key="trails" trailsOnly />
      ) : seg[0] === 'attraction' ? (
        <AttractionDetail key={route} parkId={seg[1]} id={seg[2]} />
      ) : route === "visits" ? (
        <Journal />
      ) : seg[0] === "visit" ? (
        <VisitEditor
          key={route}
          id={seg[1] === "new" ? undefined : seg[1]}
          parkId={seg[2]}
        />
      ) : seg[0] === "park" ? (
        <Profile key={route} id={seg[1]} />
      ) : route === "plans" ? (
        <Plans />
      ) : seg[0] === "itinerary" ? (
        <TripOverview key={route} id={seg[1]} />
      ) : seg[0] === "plan" ? (
        <PlanEditor key={route} id={seg[1] === "new" ? undefined : seg[1]} />
      ) : route === "statistics" ? (
        <Stats />
      ) : route === "settings" ? (
        <Settings />
      ) : (
        <p>Page unavailable.</p>
      );
    const Confirm = host.ConfirmDialog;
    return (
      <C.Provider
        value={{
          host,
          r,
          s,
          all: entities(s),
          repo,
          busy,
          run,
          confirm: (title, f) => setConfirmation({ title, f }),
        }}
      >
        <div className="np">
          <header>
            <p className="eyebrow">Explorer · Parks & wilderness</p>
            <h1>
              <a href={url()}>National Parks Explorer</a>
            </h1>
          </header>
          <nav className="np-nav" aria-label="National Parks navigation">
            {[
              ["", "Overview"],
              ["catalog", "Encyclopedia"],
              ["atlas", "Atlas"],
              ["discover", "Attractions"],
              ["trails", "Trails"],
              ["visits", "Visits"],
              ["plans", "Plans"],
              ["statistics", "Statistics"],
              ["settings", "History & data"],
            ].map(([path, label]) => (
              <a
                key={path}
                href={url(path)}
                aria-current={route === path ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {!r.units.length&&<button onClick={()=>setRetry(x=>x+1)}>Retry reference catalog</button>}
          <div aria-busy={busy}>{content}</div>
          <Confirm
            open={!!confirmation}
            title={confirmation?.title ?? ""}
            confirm="Confirm"
            busy={busy}
            onCancel={() => setConfirmation(undefined)}
            onConfirm={() => {
              if (confirmation)
                void run(confirmation.f).then((ok) => {
                  if (ok) setConfirmation(undefined);
                });
            }}
          >
            <p>Proceed with this change?</p>
            {error && <p role="alert">{error}</p>}
          </Confirm>
        </div>
      </C.Provider>
    );
  };
}
