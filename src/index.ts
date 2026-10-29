import type { Host, ModuleProps } from "./host";
import { storageSpec } from "./domain";
import { loadReference, matchesParkSearch, parkSearchRank } from "./reference";
export function createNationalParksModule(host: Host) {
  if (host.apiVersion !== 1)
    throw Error("National Parks Explorer requires host API 1");
  return {
    id: "national-parks",
    name: "National Parks Explorer",
    description:
      "Explore the National Park System, record visits, and plan future discoveries",
    icon: "△",
    category: "parks",
    version: "0.7.0",
    entry: async () => ({
      default: (await import("./screen")).createScreen(host),
    }),
    routes: [
      "",
      "catalog",
      "atlas",
      "discover",
      "trails",
      "attraction/:park/:id",
      "visits",
      "visit/new",
      "visit/new/:park",
      "visit/:id",
      "park/:id",
      "plans",
      "plan/new",
      "plan/:id",
      "itinerary/:id",
      "statistics",
      "settings",
    ] as const,
    storage: storageSpec,
    settings: {
      description:
        "Park catalog, exploration milestones, and private history imports",
      route: "settings",
    },
    backup: {
      kind: "local-json-v1" as const,
      description:
        "Private park visits, local photos, saved destinations, ordered trip plans, historical baseline and preferences",
      merge: "unsupported" as const,
      assets: "blobs-v1" as const,
    },
    dependencies: ["storage", "events", "errors"] as const,
    keywords: [
      "national parks",
      "NPS",
      "monuments",
      "history",
      "visits",
      "hiking",
    ],
    search: async (
      _services: ModuleProps["services"],
      request: { query: string; signal: AbortSignal; limit: number },
    ) => {
      const reference = await loadReference();
      if (request.signal.aborted)
        throw new DOMException("Search cancelled", "AbortError");
      return reference.units
        .filter((p) =>
          matchesParkSearch(p,request.query),
        )
        .sort((a,b)=>parkSearchRank(b,request.query)-parkSearchRank(a,request.query))
        .slice(0, request.limit)
        .map((p) => ({
          moduleId: "national-parks",
          id: p.id,
          title: p.name,
          snippet: [p.designation, p.states.join(", "), p.description]
            .join(" · ")
            .slice(0, 400),
          route: "park/" + p.id,
        }));
    },
  };
}
export type { Host } from "./host";
