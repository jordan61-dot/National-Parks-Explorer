import { it, expect, vi } from "vitest";
import {
  Repository,
  completedActivities, setActivityCompleted, removePlannedActivity, type Stop,
  newVisit,
  validEntity,
  validSnapshot,
  validDate,
  entity,
  statistics,
  historyPreview,
  applyHistory,
  entities,
  visits,
} from "../src/domain";
import type { Snapshot, Store } from "../src/host";
import type { Park } from "../src/reference";
class Memory implements Store {
  data: Snapshot = { records: [], settings: [] };
  blobs = new Map<string, Blob>();
  async snapshot() {
    return structuredClone(this.data);
  }
  async asset(id: string) {
    return this.blobs.get(id);
  }
  async atomic(
    change: (s: Snapshot) => Snapshot,
    assets?: { put?: { id: string; blob: Blob }[]; remove?: string[] },
  ) {
    const next = change(await this.snapshot());
    if (!validSnapshot(next)) throw Error("Invalid");
    this.data = structuredClone(next);
    assets?.put?.forEach((a) => this.blobs.set(a.id, a.blob));
    assets?.remove?.forEach((id) => this.blobs.delete(id));
  }
}
const park = (
  id: string,
  classification = "system-unit",
  designation = "National Park",
) =>
  ({
    id,
    parkCode: id,
    name: id,
    classification,
    designation,
    states: ["OH"],
  }) as Park;
it("preserves unknowns and rejects impossible dates, negative duration and unsupported fields", () => {
  const v = newVisit("park");
  expect(validEntity(v)).toBe(true);
  expect(v.date).toBe("");
  expect(v.duration).toBe("");
  for (const bad of [
    { ...v, precision: "exact", date: "2026-02-30" },
    { ...v, duration: "-1" },
    { ...v, extra: "unversioned" },
    { ...v, precision: "exact", date: "2026-03-02", endDate: "2026-03-01" },
  ])
    expect(validEntity(bad)).toBe(false);
  expect(validDate("2024-02-29")).toBe(true);
});
it("protects concurrent edits, deleted records and snapshot integrity", async () => {
  const s = new Memory(),
    r = new Repository(s),
    v = newVisit("park");
  await r.save(v);
  const saved = visits(entities(await s.snapshot()))[0];
  await r.save({ ...saved, notes: "new" }, saved.updatedAt);
  await expect(
    r.save({ ...saved, notes: "stale" }, saved.updatedAt),
  ).rejects.toThrow("changed");
  const latest = visits(entities(await s.snapshot()))[0];
  await r.remove(latest);
  await expect(r.save(saved, saved.updatedAt)).rejects.toThrow("removed");
});
it("keeps park and preserve separate and excludes pass-through and affiliated areas", () => {
  const a = { ...newVisit("park"), experience: "visited" as const },
    b = { ...newVisit("preserve"), experience: "pass-through" as const },
    c = newVisit("affiliate");
  const result = statistics(
    [a, { ...a, id: "repeat" }, b, c],
    [
      park("park"),
      park("preserve", "system-unit", "National Preserve"),
      park("affiliate", "affiliated"),
    ],
  );
  expect(result.units).toBe(1);
  expect(result.national).toBe(1);
  expect(result.passThrough).toBe(1);
  expect(result.repeat).toBe(1);
});
it("historical preview adds no invented dates or companions, is idempotent, and rejects stale previews", async () => {
  const s = new Memory(),
    offer = {
      total: 7,
      passThrough: 2,
      context: "Synthetic test aggregate",
      parks: [{ parkCode: "test", notes: "Synthetic report" }],
    },
    parks = [park("test")];
  const p = historyPreview(await s.snapshot(), offer, parks);
  expect(p.additions).toHaveLength(2);
  await applyHistory(s, p);
  const v = visits(entities(await s.snapshot()))[0];
  expect(v.date).toBe("");
  expect(v.companions).toBe("");
  expect(
    historyPreview(await s.snapshot(), offer, parks).additions,
  ).toHaveLength(0);
  await expect(applyHistory(s, p)).rejects.toThrow("changed");
});
it("rejects duplicate saved destinations and orphaned image records", async () => {
  const s = new Memory(),
    r = new Repository(s);
  await r.save(entity("saved", { parkId: "park", notes: "original" }));
  await expect(
    r.save(entity("saved", { parkId: "park", notes: "duplicate" })),
  ).rejects.toThrow("Invalid");
  expect(entities(await s.snapshot())).toHaveLength(1);
});
it("attaches and removes image bytes atomically with the visit", async () => {
  const s = new Memory(),
    r = new Repository(s);
  await r.save(newVisit("park"));
  let v = visits(entities(await s.snapshot()))[0];
  const b = new Blob(["image fixture"], { type: "image/png" });
  await r.photo(v, b, "caption");
  v = visits(entities(await s.snapshot()))[0];
  expect(await s.asset(v.imageIds[0])).toBe(b);
  expect(validSnapshot(await s.snapshot())).toBe(true);
  await r.remove(v);
  expect(s.blobs.size).toBe(0);
  expect(entities(await s.snapshot())).toHaveLength(0);
});
it("ordered trip stops retain independent identities, notes and completion", async () => {
  const s = new Memory(),
    r = new Repository(s);
  const p = entity("plan", {
    name: "Test trip",
    notes: "private",
    stops: [
      {
        id: "stop-1",
        parkId: "park",
        notes: "first",
        completed: false,
        attractions: [],
      },
      {
        id: "stop-2",
        parkId: "park",
        notes: "repeat",
        completed: true,
        attractions: [],
      },
    ],
  });
  await r.save(p);
  const saved = entities(await s.snapshot())[0];
  await r.save(
    { ...saved, stops: [...(saved.stops as [])].reverse() },
    saved.updatedAt,
  );
  expect(
    (entities(await s.snapshot())[0].stops as { id: string }[])[0].id,
  ).toBe("stop-2");
  expect(visits(entities(await s.snapshot()))).toHaveLength(0);
});

it('creates secure random record identities without randomUUID in HTTP previews', () => {
 const getRandomValues = crypto.getRandomValues.bind(crypto);
 vi.stubGlobal('crypto', {getRandomValues});
 try {
  const a=newVisit('park'), b=newVisit('park');
  expect(validEntity(a)).toBe(true);
  expect(a.id).not.toBe(b.id);
 } finally {vi.unstubAllGlobals()}
});
it('retains separate unknown-date visits after a display-name or designation change',async()=>{
 const s=new Memory(),r=new Repository(s);
 await r.save(newVisit('stable-park'));await r.save(newVisit('stable-park'));
 const before=await s.snapshot();
 const renamed={...park('stable-park'),name:'Renamed unit',designation:'National Historical Park'};
 expect(statistics(entities(before),[renamed]).units).toBe(1);
 expect(visits(entities(before))).toHaveLength(2);
 expect(visits(entities(before)).every(v=>v.date==='' && v.parkId==='stable-park')).toBe(true);
 expect(await s.snapshot()).toEqual(before);
});

const checklistPlan = () => entity('plan',{name:'Checklist fixture',notes:'trip note',stops:[{id:'one',parkId:'park',notes:'stop note',completed:false,attractions:['known','retired-id']},{id:'two',parkId:'park',notes:'repeat',completed:true,attractions:['known']}]});
it('planned activity validation accepts legacy and selected missing references but rejects invalid completion data',()=>{
 const legacy=checklistPlan();expect(validEntity(legacy)).toBe(true);expect(completedActivities((legacy.stops as unknown as Stop[])[0])).toEqual([]);
 const next=setActivityCompleted(legacy,'one','retired-id',true);expect(validEntity(next)).toBe(true);expect((legacy.stops as unknown as Stop[])[0]).not.toHaveProperty('completedAttractions');
 for(const bad of [null,'known',['known','known'],['outside'],[42],['bad id']]){const p=structuredClone(legacy);(p.stops as any[])[0].completedAttractions=bad;expect(validEntity(p)).toBe(false)}
 expect(()=>setActivityCompleted(next,'absent','known',true)).toThrow();expect(()=>setActivityCompleted(next,'one','outside',true)).toThrow();
});
it('planned activity completion is reversible, stop-specific, independent and survives selection edits',()=>{
 const legacy=checklistPlan(),before=structuredClone(legacy),done=setActivityCompleted(legacy,'one','known',true),stops=done.stops as unknown as Stop[];
 expect(stops[0]).toEqual({...((legacy.stops as unknown as Stop[])[0]),completedAttractions:['known']});expect(stops[1]).toEqual((legacy.stops as unknown as Stop[])[1]);expect(legacy).toEqual(before);
 const reordered={...stops[0],attractions:['retired-id','known']};expect(completedActivities(reordered)).toEqual(['known']);
 const added={...reordered,attractions:[...reordered.attractions,'another']};expect(completedActivities(added)).toEqual(['known']);
 const removed=removePlannedActivity(added,'known');expect(removed.attractions).toEqual(['retired-id','another']);expect(removed.completedAttractions).toEqual([]);expect(completedActivities({...removed,attractions:[...removed.attractions,'known']})).toEqual([]);
 const undone=setActivityCompleted(done,'one','known',false);expect((undone.stops as unknown as Stop[])[0].attractions).toEqual(stops[0].attractions);expect((undone.stops as unknown as Stop[])[0].completedAttractions).toEqual([]);
});
it('planned activity persistence rejects stale writes and failed transactions without touching visits or other trips',async()=>{
 const store=new Memory(),repo=new Repository(store),plan=checklistPlan(),other=checklistPlan();await repo.save(plan);await repo.save(other);await repo.save(newVisit('park'));
 const saved=entities(await store.snapshot()).find(e=>e.id===plan.id)!,before=await store.snapshot();await repo.save(setActivityCompleted(saved,'one','known',true),saved.updatedAt);
 const reopened=entities(await store.snapshot()).find(e=>e.id===plan.id)!;expect((reopened.stops as unknown as Stop[])[0].completedAttractions).toEqual(['known']);expect(visits(entities(store.data))).toEqual(visits(entities(before)));expect(entities(store.data).find(e=>e.id===other.id)).toEqual(entities(before).find(e=>e.id===other.id));
 await expect(repo.save(setActivityCompleted(saved,'two','known',true),saved.updatedAt)).rejects.toThrow('changed');const confirmed=await store.snapshot();
 const atomic=vi.spyOn(store,'atomic').mockImplementationOnce(async change=>{change(await store.snapshot());throw Error('Injected storage failure')});await expect(repo.save({...reopened,notes:'failed'},reopened.updatedAt)).rejects.toThrow('Injected');expect(await store.snapshot()).toEqual(confirmed);atomic.mockRestore();
 await repo.save({...reopened,notes:'unrelated edit'},reopened.updatedAt);expect((entities(await store.snapshot()).find(e=>e.id===plan.id)!.stops as unknown as Stop[])[0].completedAttractions).toEqual(['known']);
});
