import type { Json, Snapshot, Store, HistoryOffer } from "./host";
import type { Park } from "./reference";
export interface Entity {
  id: string;
  kind: "visit" | "saved" | "plan" | "baseline" | "image";
  updatedAt: string;
  createdAt: string;
  [key: string]: Json;
}
export interface Visit extends Entity {
  kind: "visit";
  parkId: string;
  experience: "visited" | "pass-through";
  precision: "unknown" | "approximate" | "exact";
  date: string;
  endDate: string;
  duration: string;
  notes: string;
  companions: string;
  entrance: string;
  travel: string;
  favorite: boolean;
  returnPlanned: boolean;
  completed: string[];
  imageIds: string[];
}
export interface Stop {
  id: string;
  parkId: string;
  notes: string;
  completed: boolean;
  attractions: string[];
}
export interface Plan extends Entity {
  kind: "plan";
  name: string;
  notes: string;
  stops: Json[];
}
export const uid = (kind: string) => kind + "-" + (crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, "0")).join(""));
export const stamp = (previous = "") =>
  new Date(Math.max(Date.now(), Date.parse(previous) + 1 || 0)).toISOString();
export function entity(
  kind: Entity["kind"],
  fields: Record<string, Json> = {},
): Entity {
  const at = stamp();
  return { id: uid(kind), kind, createdAt: at, updatedAt: at, ...fields };
}
export function newVisit(parkId = ""): Visit {
  return entity("visit", {
    parkId,
    experience: "visited",
    precision: "unknown",
    date: "",
    endDate: "",
    duration: "",
    notes: "",
    companions: "",
    entrance: "",
    travel: "",
    favorite: false,
    returnPlanned: false,
    completed: [],
    imageIds: [],
  }) as Visit;
}
export const entities = (s: Snapshot) =>
  s.records.map((r) => r.value as Entity);
export const visits = (all: Entity[]) =>
  all.filter((e): e is Visit => e.kind === "visit");
export const validId = (x: unknown): x is string =>
  typeof x === "string" && /^[a-z0-9][a-z0-9._-]{0,79}$/.test(x);
const text = (x: unknown, max = 12000): x is string =>
  typeof x === "string" && x.length <= max;
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && Object.getPrototypeOf(x) === Object.prototype;
const strings = (x: unknown) =>
  Array.isArray(x) &&
  x.length <= 1000 &&
  x.every((v) => text(v, 250)) &&
  new Set(x).size === x.length;
export const validDate = (x: unknown) =>
  text(x, 10) &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(Date.parse(x)) &&
  new Date(x).toISOString().slice(0, 10) === x;
const common = ["id", "kind", "createdAt", "updatedAt"];
export function validEntity(x: unknown): x is Json {
  if (
    !object(x) ||
    !validId(x.id) ||
    !text(x.createdAt, 40) ||
    !text(x.updatedAt, 40) ||
    !Number.isFinite(Date.parse(x.createdAt)) ||
    !Number.isFinite(Date.parse(x.updatedAt)) ||
    x.updatedAt < x.createdAt
  )
    return false;
  const keys = (s: string) =>
    Object.keys(x).every((k) => [...common, ...s.split(" ")].includes(k));
  if (x.kind === "visit")
    return (
      keys(
        "parkId experience precision date endDate duration notes companions entrance travel favorite returnPlanned completed imageIds",
      ) &&
      validId(x.parkId) &&
      ["visited", "pass-through"].includes(x.experience as string) &&
      ["unknown", "approximate", "exact"].includes(x.precision as string) &&
      [
        x.date,
        x.endDate,
        x.duration,
        x.notes,
        x.companions,
        x.entrance,
        x.travel,
      ].every((t) => text(t)) &&
      (x.precision === "unknown"
        ? x.date === "" && x.endDate === ""
        : x.precision === "approximate"
          ? !!x.date && x.endDate === ""
          : validDate(x.date) &&
            (x.endDate === "" ||
              (validDate(x.endDate) && String(x.endDate) >= String(x.date)))) &&
      (x.duration === "" ||
        (Number.isFinite(Number(x.duration)) && Number(x.duration) >= 0)) &&
      typeof x.favorite === "boolean" &&
      typeof x.returnPlanned === "boolean" &&
      strings(x.completed) &&
      strings(x.imageIds) &&
      (x.imageIds as string[]).every(validId)
    );
  if (x.kind === "saved")
    return keys("parkId notes") && validId(x.parkId) && text(x.notes);
  if (x.kind === "plan")
    return (
      keys("name notes stops") &&
      text(x.name, 200) &&
      !!x.name.trim() &&
      text(x.notes) &&
      Array.isArray(x.stops) &&
      x.stops.length <= 1000 &&
      new Set(x.stops.map((s) => s?.id)).size === x.stops.length &&
      x.stops.every(
        (s) =>
          object(s) &&
          Object.keys(s).every((k) =>
            ["id", "parkId", "notes", "completed", "attractions"].includes(k),
          ) &&
          validId(s.id) &&
          validId(s.parkId) &&
          text(s.notes) &&
          typeof s.completed === "boolean" &&
          strings(s.attractions),
      )
    );
  if (x.kind === "baseline")
    return (
      keys("total passThrough context") &&
      Number.isSafeInteger(x.total) &&
      Number(x.total) >= 0 &&
      Number.isSafeInteger(x.passThrough) &&
      Number(x.passThrough) >= 0 &&
      Number(x.passThrough) <= Number(x.total) &&
      text(x.context)
    );
  if (x.kind === "image")
    return (
      keys("mime size sha256 caption") &&
      ["image/jpeg", "image/png", "image/webp"].includes(x.mime as string) &&
      Number.isSafeInteger(x.size) &&
      Number(x.size) > 0 &&
      Number(x.size) <= 2097152 &&
      text(x.sha256, 64) &&
      /^[a-f0-9]{64}$/.test(x.sha256) &&
      text(x.caption, 1000)
    );
  return false;
}
export function validSettings(x: unknown): x is Json {
  return (
    object(x) &&
    Object.keys(x).every((k) => k === "goal") &&
    (x.goal === null ||
      (Number.isSafeInteger(x.goal) &&
        Number(x.goal) > 0 &&
        Number(x.goal) <= 100000))
  );
}
export function validSnapshot(s: Snapshot) {
  if (
    s.records.some(
      (r) => !validEntity(r.value) || r.id !== (r.value as Entity).id,
    ) ||
    new Set(s.records.map((r) => r.id)).size !== s.records.length ||
    s.settings.length > 1 ||
    s.settings.some((r) => r.id !== "preferences" || !validSettings(r.value))
  )
    return false;
  const all = entities(s),
    images = all.filter((e) => e.kind === "image"),
    refs = visits(all).flatMap((v) => v.imageIds),
    saved = all.filter((e) => e.kind === "saved");
  return (
    all.filter((e) => e.kind === "baseline").length <= 1 &&
    new Set(saved.map((s) => s.parkId)).size === saved.length &&
    refs.length === images.length &&
    new Set(refs).size === refs.length &&
    refs.every((id) => images.some((i) => i.id === id))
  );
}
export const storageSpec = {
  namespace: "national-parks",
  schemaVersion: 1,
  assets: true,
  entityIndex: true,
  validate: validEntity,
  validateSettings: validSettings,
  validateSnapshot: validSnapshot,
};
function checked(s: Snapshot) {
  if (!validSnapshot(s)) throw Error("Invalid park data. No changes saved.");
  return s;
}
export class Repository {
  constructor(readonly store: Store) {}
  async save(e: Entity, expected?: string) {
    if (!validEntity(e))
      throw Error("Check required fields, dates and numeric values.");
    await this.store.atomic((s) => {
      const old = entities(s).find((v) => v.id === e.id);
      if (old ? old.updatedAt !== expected : expected !== undefined)
        throw Error("Record changed or was removed. Reopen before saving.");
      return checked({
        ...s,
        records: [
          ...s.records.filter((r) => r.id !== e.id),
          {
            id: e.id,
            value: {
              ...e,
              createdAt: old?.createdAt ?? e.createdAt,
              updatedAt: stamp(old?.updatedAt),
            },
          },
        ],
      });
    });
  }
  async remove(e: Entity) {
    const ids = e.kind === "visit" ? (e as Visit).imageIds : [];
    await this.store.atomic(
      (s) => {
        if (entities(s).find((v) => v.id === e.id)?.updatedAt !== e.updatedAt)
          throw Error("Record changed. Reopen before deleting.");
        return checked({
          ...s,
          records: s.records.filter(
            (r) => r.id !== e.id && !ids.includes(r.id),
          ),
        });
      },
      { remove: ids },
    );
  }
  async goal(goal: number | null) {
    if (!validSettings({ goal }))
      throw Error("Goal must be a positive whole number.");
    await this.store.atomic((s) =>
      checked({ ...s, settings: [{ id: "preferences", value: { goal } }] }),
    );
  }
  async photo(visit: Visit, blob: Blob, caption: string) {
    if (!crypto.subtle) throw Error("Photographs require HTTPS or localhost. Open Explorer at its secure address.");
    const sha256 = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
      ),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
    const e = entity("image", {
      mime: blob.type,
      size: blob.size,
      sha256,
      caption,
    });
    await this.store.atomic(
      (s) => {
        if (
          entities(s).find((v) => v.id === visit.id)?.updatedAt !==
          visit.updatedAt
        )
          throw Error("Visit changed. Reopen before adding photos.");
        return checked({
          ...s,
          records: [
            ...s.records.filter((r) => r.id !== visit.id),
            {
              id: visit.id,
              value: {
                ...visit,
                imageIds: [...visit.imageIds, e.id],
                updatedAt: stamp(visit.updatedAt),
              },
            },
            { id: e.id, value: e },
          ],
        });
      },
      { put: [{ id: e.id, blob }] },
    );
  }
  async removePhoto(v: Visit, id: string) {
    await this.store.atomic(
      (s) => {
        if (
          entities(s).find((e) => e.id === v.id)?.updatedAt !== v.updatedAt ||
          !v.imageIds.includes(id)
        )
          throw Error("Visit changed. Reopen before removing photo.");
        return checked({
          ...s,
          records: s.records
            .filter((r) => r.id !== id)
            .map((r) =>
              r.id === v.id
                ? {
                    id: v.id,
                    value: {
                      ...v,
                      imageIds: v.imageIds.filter((i) => i !== id),
                      updatedAt: stamp(v.updatedAt),
                    },
                  }
                : r,
            ),
        });
      },
      { remove: [id] },
    );
  }
}
export function statistics(all: Entity[], parks: Park[]) {
  const vs = visits(all),
    ids = new Set(
      vs.filter((v) => v.experience === "visited").map((v) => v.parkId),
    ),
    units = parks.filter(
      (p) => ids.has(p.id) && p.classification === "system-unit",
    );
  return {
    ids,
    units: units.length,
    national: units.filter((p) => p.designation === "National Park").length,
    passThrough: vs.filter((v) => v.experience === "pass-through").length,
    repeat: vs.filter((v) => v.experience === "visited").length - ids.size,
    activities: vs.reduce((n, v) => n + v.completed.length, 0),
    states: [...new Set(units.flatMap((p) => p.states))],
  };
}
export function validHistory(x: unknown): x is HistoryOffer {
  return (
    object(x) &&
    Number.isSafeInteger(x.total) &&
    Number(x.total) >= 0 &&
    Number.isSafeInteger(x.passThrough) &&
    Number(x.passThrough) >= 0 &&
    Number(x.passThrough) <= Number(x.total) &&
    text(x.context) &&
    Array.isArray(x.parks) &&
    x.parks.length <= 1000 &&
    new Set(x.parks.map((p) => p?.parkCode)).size === x.parks.length &&
    x.parks.every(
      (p) =>
        object(p) &&
        text(p.parkCode, 4) &&
        /^[a-z]{4}$/.test(p.parkCode) &&
        text(p.notes),
    )
  );
}
export function historyPreview(
  s: Snapshot,
  offer: HistoryOffer,
  parks: Park[],
) {
  if (!validHistory(offer)) throw Error("Invalid historical source file.");
  const all = entities(s),
    additions: Entity[] = [],
    held: string[] = [];
  if (!all.some((e) => e.kind === "baseline"))
    additions.push(
      entity("baseline", {
        total: offer.total,
        passThrough: offer.passThrough,
        context: offer.context,
      }),
    );
  else held.push("Existing aggregate preserved.");
  for (const item of offer.parks) {
    const matches = parks.filter(
      (p) =>
        p.parkCode === item.parkCode &&
        p.designation === "National Park" &&
        p.classification === "system-unit",
    );
    if (
      matches.length !== 1 ||
      visits(all).some((v) => v.parkId === matches[0]?.id)
    ) {
      held.push(
        item.parkCode + ": ambiguous or existing visit, preserved for review.",
      );
      continue;
    }
    additions.push({ ...newVisit(matches[0].id), notes: item.notes });
  }
  return { fingerprint: JSON.stringify(s), additions, held };
}
export async function applyHistory(
  store: Store,
  p: ReturnType<typeof historyPreview>,
) {
  await store.atomic((s) => {
    if (JSON.stringify(s) !== p.fingerprint)
      throw Error("Data changed. Preview history again.");
    return checked({
      ...s,
      records: [
        ...s.records,
        ...p.additions.map((e) => ({ id: e.id, value: e })),
      ],
    });
  });
}
