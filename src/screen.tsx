import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Host, ModuleProps, Snapshot } from "./host";
import {
  loadReference,
  safeUrl,
  stateNames,
  parkRegions,
  type Park,
  type Reference,
} from "./reference";
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
    [scope, setScope] = useState("system-unit"),
    [designation, setDesignation] = useState(""),
    [status, setStatus] = useState(""),
    [count, setCount] = useState(24),
    [selected, setSelected] = useState("");
  const stats = statistics(all, r.units),
    saved = new Set(all.filter((e) => e.kind === "saved").map((e) => e.parkId));
  const parks = r.units.filter(
    (p) =>
      (!scope || p.classification === scope) &&
      (!state || p.states.includes(state)) &&
      (!designation || p.designation === designation) &&
      q
        .toLowerCase()
        .split(/\s+/)
        .every((t) =>
          [
            p.name,
            p.description,
            p.designation,
            ...p.states.flatMap((s) => [s, stateNames[s]]),
            ...p.activities,
            ...p.topics,
          ]
            .join(" ")
            .toLowerCase()
            .includes(t),
        ) &&
      (!status ||
        (status === "visited" && stats.ids.has(p.id)) ||
        (status === "unvisited" && !stats.ids.has(p.id)) ||
        (status === "saved" && saved.has(p.id)) ||
        (status === "pass-through" &&
          visits(all).some(
            (v) => v.parkId === p.id && v.experience === "pass-through",
          ))),
  );
  const filter = (fn: (s: string) => void, v: string) => {
    fn(v);
    setCount(24);
    setSelected("");
  };
  return (
    <>
      <h2>{atlas ? "Interactive atlas" : "Park encyclopedia"}</h2>
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
      </div>
      <p role="status">{parks.length} matching places</p>
      {atlas && (
        <>
          <Atlas
            parks={parks}
            selectedId={selected}
            onSelect={setSelected}
            visitedIds={stats.ids}
          />
          {parks.find((p) => p.id === selected) && (
            <Card park={parks.find((p) => p.id === selected)!} />
          )}
        </>
      )}
      <div className="np-grid">
        {parks.slice(0, count).map((p) => (
          <Card key={p.id} park={p} />
        ))}
      </div>
      {!parks.length && <p>No places match. Try clearing a filter.</p>}
      {count < parks.length && (
        <button onClick={() => setCount(count + 24)}>Show more parks</button>
      )}
    </>
  );
}
function Profile({ id }: { id: string }) {
  const { r, all, repo, run, confirm, busy } = useParks(),
    p = r.units.find((p) => p.id === id),
    saved = all.find((e) => e.kind === "saved" && e.parkId === id);
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
      <p>
        {p.states.map((s) => stateNames[s] ?? s).join(" · ")} · {p.designation}
      </p>
      <p className="np-lead">
        {p.description || "Detailed description unavailable."}
      </p>
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
      <h3>Visitor information & research</h3>
      <p>
        These official sources open online. Bundled text does not report live
        closures, access conditions, bookings or travel times.
      </p>
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
      <h3>Attractions & trails</h3>
      {!p.attractions.length && (
        <p>
          No individually sourced attraction records are included for this park
          yet.
        </p>
      )}
      <div className="np-grid">
        {p.attractions.map((a) => (
          <article key={a.id} className="np-card">
            <h4>{a.name}</h4>
            <p>
              {a.kind} · {a.description}
            </p>
            <p>
              {a.length
                ? `${a.length.value} ${a.length.unit} (${a.length.method})`
                : "Distance unknown"}
              {a.difficulty ? " · " + a.difficulty : ""}
            </p>
            {a.accessibility && <p>{a.accessibility}</p>}
            <Link href={a.source} label="Official source" />
          </article>
        ))}
      </div>
      <h3>Your visits</h3>
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
      <ul>
        {p.sources.map((s) => (
          <li key={s.url}>
            <Link href={s.url} label={s.label} />
          </li>
        ))}
      </ul>
    </>
  );
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
  const { all } = useParks();
  return (
    <>
      <h2>Destinations & trip plans</h2>
      <a className="button" href={url("plan/new")}>
        Create trip plan
      </a>
      <div className="np-grid">
        {all
          .filter((e) => e.kind === "plan")
          .map((e) => (
            <article className="np-card" key={e.id}>
              <h3>
                <a href={url("plan/" + e.id)}>{String(e.name)}</a>
              </h3>
              <p>
                {
                  (e.stops as unknown as Stop[]).filter((s) => s.completed)
                    .length
                }{" "}
                of {(e.stops as unknown as Stop[]).length} stops completed
              </p>
            </article>
          ))}
      </div>
      <h3>Saved destinations</h3>
      <div className="np-grid">
        {all
          .filter((e) => e.kind === "saved")
          .map((e) => (
            <Saved key={e.id + e.updatedAt} item={e} />
          ))}
      </div>
      <p>
        Save destinations from park profiles. Plan completion never creates a
        visit automatically.
      </p>
    </>
  );
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
      <h2>{old ? "Edit trip plan" : "Create trip plan"}</h2>
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
                  <details>
                    <summary>
                      Attractions ({s.attractions.length} selected)
                    </summary>
                    {p?.attractions.map((a) => (
                      <Check
                        key={a.id}
                        label={a.name}
                        value={s.attractions.includes(a.id)}
                        onChange={(v) =>
                          update({
                            attractions: v
                              ? [...s.attractions, a.id]
                              : s.attractions.filter((id) => id !== a.id),
                          })
                        }
                      />
                    ))}
                    {!p?.attractions.length && (
                      <p>
                        No structured attraction records; keep selections in
                        stop notes.
                      </p>
                    )}
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
      <h3>State & territory coverage</h3>
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
        additive.
      </p>
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
        entries.
      </p>
      <p>{r.attribution}</p>
    </>
  );
}
function Discover() {
  const { r } = useParks(),
    [q, setQ] = useState(""),
    [kind, setKind] = useState(""),
    [limit, setLimit] = useState(30),
    items = r.units
      .flatMap((p) => p.attractions.map((a) => ({ p, a })))
      .filter(
        ({ p, a }) =>
          (!kind || a.kind === kind) &&
          [p.name, a.name, a.description]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase()),
      );
  return (
    <>
      <h2>Attractions & trails</h2>
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
          {[
            "trail",
            "visitor-center",
            "overlook",
            "historic-site",
            "waterfall",
            "scenic-drive",
            "place",
          ].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </Field>
      <p role="status">{items.length} sourced matches</p>
      <div className="np-grid">
        {items.slice(0, limit).map(({ p, a }) => (
          <article className="np-card" key={p.id + a.id}>
            <h3>{a.name}</h3>
            <a href={url("park/" + p.id)}>{p.name}</a>
            <p>{a.description}</p>
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
      void Promise.all([loadReference(), services.store.snapshot()])
        .then(([r, s]) => {
          if (active) {
            setR(r);
            setS(s);
            setError("");
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
