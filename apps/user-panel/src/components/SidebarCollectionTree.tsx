import { useState } from "react";
import { Braces, ChevronDown, ChevronRight, Code, Database, LibraryBig, Loader2, Plus, Zap } from "lucide-react";
import type { ProjectCollection } from "../types/projectCollection";
import type { CollectionApi } from "../types/collectionApi";

const OPTIONS = [
  { key: "endpoints", label: "Endpoints", icon: Code },
  { key: "data", label: "Data", icon: Database },
  { key: "schema", label: "Schema", icon: Braces },
  { key: "behavior", label: "Behavior", icon: Zap },
] as const;

const rowBase = "flex w-full items-center gap-2 rounded-xl text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60";
const idle = "text-muted hover:bg-content/5 hover:text-content";
const on = "bg-primary/15 font-medium text-primary shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]";

interface Props {
  projectId?: number;
  collections: ProjectCollection[];
  selectedId?: number | null;
  loadingCollections: boolean;
  /** the APIs of the selected collection */
  apis: CollectionApi[];
  loadingApis: boolean;
  /** the sidebar search text */
  query: string;
  pathname: string;
  search: string;
  onSelectCollection: (id: number) => void;
  onNavigate: (path: string) => void;
  onNew: () => void;
}

const Spinner = () => (
  <div className="grid place-items-center py-3 text-muted">
    <Loader2 className="size-4 animate-spin" />
  </div>
);

export default function SidebarCollectionTree({
  projectId,
  collections,
  selectedId,
  loadingCollections,
  apis,
  loadingApis,
  query,
  pathname,
  search,
  onSelectCollection,
  onNavigate,
  onNew,
}: Props) {
  const [folded, setFolded] = useState<Record<number, boolean>>({}); // the selected collection, closed by the user
  const [apiOpen, setApiOpen] = useState<Record<number, boolean>>({}); // overrides "the first API is open"

  if (projectId == null) return <p className="px-3 py-2 text-xs text-muted">Select a project to see its collections.</p>;

  const q = query.trim().toLowerCase();
  const nameHas = (name: string) => name.toLowerCase().includes(q);
  const urlParams = new URLSearchParams(search);
  const apiParam = Number(urlParams.get("api")); // the API the Endpoints screen is filtered to
  const endpointParam = Number(urlParams.get("endpoint"));

  const rows = q ? collections.filter((c) => nameHas(c.name) || (c.id === selectedId && apis.some((a) => nameHas(a.name)))) : collections;

  const clickCollection = (c: ProjectCollection) => {
    if (c.id === selectedId) return setFolded((f) => ({ ...f, [c.id]: !f[c.id] })); // the open one just folds
    setFolded((f) => ({ ...f, [c.id]: false }));
    onSelectCollection(c.id);
    onNavigate(`/projects/${projectId}/collections/${c.id}/apis`); // no filter: every API of the collection
  };

  return (
    <div className="space-y-0.5">
      {loadingCollections && collections.length === 0 ? (
        <Spinner />
      ) : (
        rows.map((c) => {
          const selected = c.id === selectedId;
          const expanded = selected && (!!q || !folded[c.id]);
          const shown = q && !nameHas(c.name) ? apis.filter((a) => nameHas(a.name)) : apis;
          const base = `/projects/${projectId}/collections/${c.id}/apis`;

          return (
            <div key={c.id}>
              <button
                type="button"
                onClick={() => clickCollection(c)}
                aria-expanded={expanded}
                className={`${rowBase} h-10 px-3 ${selected ? "font-medium text-content hover:bg-content/5" : idle}`}
              >
                {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                <LibraryBig className={`size-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {selected && apis.length > 0 && <span className="text-xs text-muted">{apis.length}</span>}
              </button>

              {expanded && (
                <div className="mt-0.5 space-y-0.5 pl-3">
                  {loadingApis && apis.length === 0 ? (
                    <Spinner />
                  ) : (
                    shown.map((a, i) => {
                      const open = q ? true : (apiOpen[a.id] ?? i === 0); // the first API is open by default
                      const onList = pathname === base;

                      return (
                        <div key={a.id}>
                          <button
                            type="button"
                            onClick={() => setApiOpen((o) => ({ ...o, [a.id]: !open }))}
                            aria-expanded={open}
                            className={`${rowBase} h-9 px-3 ${idle}`}
                          >
                            {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                            <span className="min-w-0 flex-1 truncate font-mono text-content">
                              <span className="text-secondary">/</span>
                              {a.name}
                            </span>
                            <span className="text-xs">{a.endpoints.length}</span>
                          </button>

                          {open && (
                            <div className="space-y-0.5 pl-5">
                              {OPTIONS.map(({ key, label, icon: Icon }) => {
                                const first = a.endpoints[0];
                                // Endpoints opens the screen filtered to THIS api, on its first endpoint
                                const to =
                                  key === "endpoints"
                                    ? `${base}?api=${a.id}${first ? `&endpoint=${first.id}` : ""}`
                                    : `${base}/${a.id}/${key}`;
                                const active =
                                  key === "endpoints"
                                    ? onList && (apiParam ? apiParam === a.id : a.endpoints.some((e) => e.id === endpointParam))
                                    : pathname === `${base}/${a.id}/${key}`;

                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => onNavigate(to)}
                                    aria-current={active ? "page" : undefined}
                                    className={`${rowBase} h-9 px-3 ${active ? on : idle}`}
                                  >
                                    <Icon className="size-4 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{label}</span>
                                    {key === "endpoints" && <span className="text-xs">{a.endpoints.length}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {!loadingApis && shown.length === 0 && <p className="px-3 py-2 text-xs text-muted">{q ? "No match" : "No APIs yet"}</p>}
                </div>
              )}
            </div>
          );
        })
      )}

      {!loadingCollections && rows.length === 0 && <p className="px-3 py-2 text-xs text-muted">{q ? "No match" : "No collections yet"}</p>}

      <button type="button" onClick={onNew} className={`${rowBase} h-10 px-3 ${idle}`}>
        <Plus className="size-4 shrink-0" />
        New collection
      </button>
    </div>
  );
}