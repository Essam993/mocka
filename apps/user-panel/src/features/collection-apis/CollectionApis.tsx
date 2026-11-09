import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Alert, Button, Empty, Input, Modal as AntModal, Skeleton } from "antd";
import { ChevronDown, ChevronRight, Clock, Copy, Download, GitBranch, Layers, List, Search, SlidersHorizontal, Upload, Users, X } from "lucide-react";
import { ConfirmModal, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchCollectionApis } from "../../store/reducers/collectionApiSlice";
import { fetchSchemas } from "../../store/reducers/schemaSlice";
import { fetchDataTypes } from "../../store/reducers/dataTypeSlice";
import { fetchProjectVariables } from "../../store/reducers/projectVariableSlice";
import { MethodBadge, methodRank } from "./components/MethodBadge";
import { RequestEditor } from "./components/RequestEditor";
import type { ApiEndpoint } from "../../types/collectionApi";
import { ResponseEditor } from "./components/ResponseEditor";

const MAIN_TABS = [
  { key: "request", label: "Request", icon: Download },
  { key: "response", label: "Response", icon: Upload },
  { key: "rules", label: "Rules", icon: GitBranch },
  { key: "general", label: "General", icon: Clock },
  { key: "access", label: "Access", icon: Users },
] as const;
type MainTab = (typeof MAIN_TABS)[number]["key"];

const byPathThenMethod = (a: ApiEndpoint, b: ApiEndpoint) => a.path.localeCompare(b.path) || methodRank(a.method) - methodRank(b.method);

export default function CollectionApis() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projectId: pid, collectionId: cid } = useParams<{ projectId: string; collectionId: string }>();
  const projectId = Number(pid);
  const collectionId = Number(cid);
  const valid = Number.isFinite(projectId) && Number.isFinite(collectionId);

  const [params, setParams] = useSearchParams();
  const endpointId = Number(params.get("endpoint"));
  const apiParam = Number(params.get("api")); // set by the sidebar's Endpoints link

  const { items, status, error, loadedCollectionId } = useAppSelector((s) => s.collectionApis);
  const collection = useAppSelector((s) => s.projectCollections.items.find((c) => c?.id === collectionId));

  const [mode, setMode] = useState<"configure" | "test">("configure");
  const [tab, setTab] = useState<MainTab>("request");
  const [filter, setFilter] = useState("");
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const [nextEndpoint, setNextEndpoint] = useState<number | null>(null); // endpoint waiting for "Discard" to be confirmed

  // true while the editor has unsaved edits
  const dirty = useRef(false);
  const onDirty = useCallback((d: boolean) => void (dirty.current = d), []);
  const reqDirty = useRef(false);
  const respDirty = useRef(false);
  const onReqDirty = useCallback((d: boolean) => void (reqDirty.current = d), []);
  const onRespDirty = useCallback((d: boolean) => void (respDirty.current = d), []);

  // never show another collection's APIs
  const apis = loadedCollectionId === collectionId ? items : [];

  const groups = useMemo(() => apis.map((a) => ({ ...a, endpoints: [...a.endpoints].sort(byPathThenMethod) })), [apis]);

  // the API chosen in the sidebar; an unknown id (or none) means every API of the collection
  const filterApi = apiParam ? groups.find((g) => g.id === apiParam) : undefined;
  const shownGroups = useMemo(() => (filterApi ? [filterApi] : groups), [filterApi, groups]);

  const all = useMemo(() => shownGroups.flatMap((g) => g.endpoints.map((e) => ({ ...e, apiName: g.name }))), [shownGroups]);
  const selected = all.find((e) => e.id === endpointId);

  /** the URL for an endpoint, keeping the API filter */
  const urlFor = (endpoint?: number) => {
    const p = new URLSearchParams();
    if (filterApi) p.set("api", String(filterApi.id));
    if (endpoint) p.set("endpoint", String(endpoint));
    return p;
  };

  /* -------------------------------- loading -------------------------------- */
  useEffect(() => {
    if (!valid) return;
    dispatch(fetchCollectionApis({ collectionId }));
    dispatch(fetchSchemas({ projectId })); // "Add from schema"
    dispatch(fetchProjectVariables({ projectId })); // the global variables a saved row can point at
    dispatch(fetchDataTypes()); // the types a new row can pick
  }, [dispatch, valid, collectionId, projectId]);

  // the first endpoint of what is shown is selected by default (kept in the URL, so refresh and the breadcrumb follow it)
  useEffect(() => {
    if (all.length > 0 && !selected) setParams(urlFor(all[0].id), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, selected]);

  /** switching endpoint asks first when there are unsaved edits */
  const go = (id: number) => {
    reqDirty.current = false;
    respDirty.current = false;
    setParams(urlFor(id));
  };

  /** switching endpoint asks first when there are unsaved edits */
  const select = (id: number) => {
    if (id === endpointId) return;
    if (!reqDirty.current && !respDirty.current) return go(id);
    setNextEndpoint(id);
  };

  const [responseSeen, setResponseSeen] = useState<number[]>([]);
  useEffect(() => {
    if (tab === "response" && selected) setResponseSeen((s) => (s.includes(selected.id) ? s : [...s, selected.id]));
  }, [tab, selected?.id]);

  /** drops the API filter and keeps the selected endpoint */
  const showAll = () => {
    const p = new URLSearchParams();
    if (selected) p.set("endpoint", String(selected.id));
    setParams(p);
  };

  /* -------------------------------- filtering ------------------------------- */
  const q = filter.trim().toLowerCase();
  const visible = shownGroups
    .map((g) => ({
      ...g,
      endpoints: q ? g.endpoints.filter((e) => `${e.method} ${e.path} ${e.description} ${g.name}`.toLowerCase().includes(q)) : g.endpoints,
    }))
    .filter((g) => !q || g.endpoints.length > 0);

  const copyPath = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.path);
      toast.success("Path copied", { description: selected.path, duration: 2 });
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  if (!valid) return <Alert type="error" showIcon message="Invalid project or collection id" />;

  return (
    <div className="min-w-0">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <List className="size-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight text-content">Endpoints</h1>
        <p className="hidden truncate text-sm text-muted md:block">
          {filterApi ? (
            <>
              Endpoints of <span className="font-mono text-content">/{filterApi.name}</span> in {collection?.name ?? "this collection"}.
            </>
          ) : (
            <>Every endpoint in {collection?.name ?? "this collection"}, grouped by API.</>
          )}
        </p>
        {filterApi && (
          <button
            type="button"
            onClick={showAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="font-mono">/{filterApi.name}</span>
            <span className="text-muted">·</span>
            Show all APIs
            <X className="size-3.5" />
          </button>
        )}
      </header>

      <div className="grid min-h-[calc(100dvh-8rem)] lg:grid-cols-[26rem_minmax(0,1fr)]">
        {/* ------------------------------ endpoint list ------------------------------ */}
        <aside className="border-b border-line lg:sticky lg:top-16 lg:h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="px-5 pb-4 pt-5">
            <h2 className="text-xl font-semibold tracking-tight text-content">{filterApi ? `/${filterApi.name}` : "All endpoints"}</h2>
            <p className="mt-1 text-sm text-muted">Select an endpoint to configure or test it.</p>
            <Input
              allowClear
              size="large"
              prefix={<Search className="size-4 text-muted" />}
              placeholder="Filter by path or name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-4 !rounded-xl"
            />
          </div>

          {status === "failed" && (
            <div className="px-5 pb-4">
              <Alert type="error" showIcon message="Couldn't load the APIs" description={error} action={<Button size="small" onClick={() => dispatch(fetchCollectionApis({ collectionId, force: true }))}>Try again</Button>} />
            </div>
          )}

          {status === "loading" && apis.length === 0 ? (
            <div className="px-5 pb-5"><Skeleton active paragraph={{ rows: 5 }} /></div>
          ) : visible.length === 0 && status !== "failed" ? (
            <div className="px-5 py-10">
              <Empty description={q ? "No endpoints match your filter" : "No APIs in this collection yet"}>
                {!q && <Button type="primary" onClick={() => navigate("/")}>Create an instant API</Button>}
              </Empty>
            </div>
          ) : (
            visible.map((g) => {
              const open = q ? true : !closed[g.id];
              return (
                <section key={g.id} className="border-t border-line">
                  <button
                    type="button"
                    onClick={() => setClosed((c) => ({ ...c, [g.id]: open }))}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-content/5"
                  >
                    {open ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
                    <Layers className="size-4 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-content">{g.name}</span>
                    <span className="text-sm text-muted">{g.endpoints.length}</span>
                  </button>

                  {open && (
                    <ul className="space-y-1 px-3 pb-3">
                      {g.endpoints.map((e) => {
                        const active = e.id === selected?.id;
                        return (
                          <li key={e.id}>
                            <button
                              type="button"
                              onClick={() => select(e.id)}
                              aria-current={active ? "true" : undefined}
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 ${active ? "border-primary bg-primary/10" : "border-transparent hover:bg-content/5"
                                }`}
                            >
                              <MethodBadge method={e.method} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-mono text-sm font-semibold text-content">{e.path}</span>
                                <span className="block truncate text-sm text-muted">{e.description || "No description"}</span>
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-muted" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </aside>

        {/* -------------------------------- editor -------------------------------- */}
        <main className="min-w-0">
          <div className="grid grid-cols-2 gap-2 border-b border-line p-2" role="tablist" aria-label="Mode">
            {(
              [
                { key: "configure", label: "Configure", icon: SlidersHorizontal },
                { key: "test", label: "Test request", icon: Upload },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${mode === key ? "border-primary bg-primary/5 text-content" : "border-transparent text-muted hover:text-content"
                  }`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {!selected ? (
            <div className="px-6 py-16">
              <Empty description={status === "loading" ? "Loading…" : "Select an endpoint"} />
            </div>
          ) : (
            <>
              {mode === "test" && (
                <div className="p-6 md:p-8">
                  <Alert type="info" showIcon message="Test request is coming soon" description="It will send a real request to this endpoint once its API is connected." />
                </div>
              )}

              {/* hidden (not unmounted) while in Test mode, so unsaved edits survive */}
              <div hidden={mode !== "configure"}>
                {/* endpoint header */}
                <div className="flex flex-wrap items-center gap-4 px-6 py-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                    <SlidersHorizontal className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl font-semibold tracking-tight text-content">{selected.description || selected.path}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <MethodBadge method={selected.method} />
                      <span className="font-mono text-sm text-muted">{selected.path}</span>
                      <span className="font-mono text-xs uppercase tracking-widest text-muted">· {selected.apiName}</span>
                    </div>
                  </div>
                  <Button icon={<Copy className="size-4" />} onClick={copyPath} aria-label="Copy path" />
                </div>

                {/* Request / Response / Rules / General / Access */}
                <div className="flex overflow-x-auto border-y border-line" role="tablist" aria-label="Endpoint settings">
                  {MAIN_TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      onClick={() => setTab(key)}
                      className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${tab === key ? "border-primary text-content" : "border-transparent text-muted hover:text-content"
                        }`}
                    >
                      <Icon className={`size-4 ${tab === key ? "text-primary" : ""}`} /> {label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* hidden (not unmounted) on the other tabs, so unsaved edits survive */}
                  <div hidden={tab !== "request"}>
                    <RequestEditor
                      key={selected.id}
                      projectId={projectId}
                      collectionId={collectionId}
                      endpointId={selected.id}
                      onDirtyChange={onReqDirty}   // was onDirty
                    />
                  </div>
                  {selected && responseSeen.includes(selected.id) && (
                    <div hidden={tab !== "response"}>
                      <ResponseEditor
                        key={selected.id}
                        projectId={projectId}
                        collectionId={collectionId}
                        endpointId={selected.id}
                        onDirtyChange={onRespDirty}
                      />
                    </div>
                  )}
                  {tab !== "request" && tab !== "response" && (
                    <Alert type="info" showIcon message={`${MAIN_TABS.find((t) => t.key === tab)?.label} is coming soon`} description="This section will load once its API is ready." />
                  )}
                </div>
              </div>
            </>
          )}
        </main>


        {/* delete ConfirmModal */}

        <ConfirmModal
          open={nextEndpoint != null}
          title="Discard unsaved changes?"
          description="You have changes on this endpoint that are not saved yet."
          content="If you switch now, those changes will be lost."
          okText="Discard"
          cancelText="Keep editing"
          danger
          onConfirm={() => {
            if (nextEndpoint != null) go(nextEndpoint);
            setNextEndpoint(null);
          }}
          onCancel={() => setNextEndpoint(null)}
          onError={() => setNextEndpoint(null)}
        />
      </div>
    </div>
  );
}