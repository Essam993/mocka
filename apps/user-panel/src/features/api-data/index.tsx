import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, Button, Checkbox, Dropdown, Empty, Input, InputNumber, Pagination, Skeleton, Space } from "antd";
import { Database, Download, Plus, RefreshCw, Search, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchCollectionApis } from "../../store/reducers/collectionApiSlice";
import { fetchEndpointResponses } from "../../store/reducers/endpointResponseSlice";
import { fetchProjectVariables } from "../../store/reducers/projectVariableSlice";
import { fetchDataTypes } from "../../store/reducers/dataTypeSlice";
import { fetchApiData, saveApiData } from "../../store/reducers/apiDataSlice";
import { MethodBadge } from "../collection-apis/components/MethodBadge";
import { DataCell } from "./components/DataCell";
import { blankRow, cellText, download, fillMissing, generateRows, kindOf, plain, toRow, validateCell } from "./data";
import type { Cell, DataColumn, DataRow } from "../../types/apiData";

const PAGE_SIZE = 10;
const INITIAL = 25; // records generated for a fresh API, and after "Reset sample data"
const MAX_GENERATE = 500;
const MAX_ROWS = 2000;

/** a fresh view per API, so switching APIs never shows another API's records */
export default function ApiData() {
    const { apiId } = useParams<{ apiId: string }>();
    return <ApiDataView key={apiId} />;
}

function ApiDataView() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { projectId: pid, collectionId: cid, apiId: aid } = useParams<{ projectId: string; collectionId: string; apiId: string }>();
    const projectId = Number(pid);
    const collectionId = Number(cid);
    const apiId = Number(aid);
    const valid = [projectId, collectionId, apiId].every(Number.isFinite);

    const apis = useAppSelector((s) => s.collectionApis);
    const er = useAppSelector((s) => s.endpointResponses);
    const dt = useAppSelector((s) => s.dataTypes);
    const vars = useAppSelector((s) => s.projectVariables);
    const ad = useAppSelector((s) => s.apiData);

    const [rows, setRows] = useState<DataRow[]>([]);
    const [seeded, setSeeded] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [count, setCount] = useState(5);
    const [confirmReset, setConfirmReset] = useState(false);
    const [tried, setTried] = useState(false);

    /* ------------------- the API, its GET endpoint and its response ------------------- */
    const group = apis.loadedCollectionId === collectionId ? apis.items.find((a) => a.id === apiId) : undefined;

    // the GET endpoint without a path parameter is the list endpoint
    const endpoint = useMemo(() => {
        const gets = group?.endpoints.filter((e) => e.method === "GET") ?? [];
        return gets.find((e) => !e.path.includes(":")) ?? gets[0];
    }, [group]);

    const responses = er.byEndpoint[endpoint?.id ?? -1];
    // the main response: the biggest share, the oldest on a tie
    const main = useMemo(() => (responses ? [...responses].sort((a, b) => b.percentage - a.percentage || a.id - b.id)[0] : undefined), [responses]);

    /** one column per variable of the main response: its name, and the data type of its global variable */
    const columns = useMemo<DataColumn[]>(() => {
        const globalById = new Map((vars.loadedProjectId === projectId ? vars.items : []).filter(Boolean).map((g) => [g.id, g] as const));
        const seen = new Set<string>();
        const out: DataColumn[] = [];
        for (const v of main?.variables ?? []) {
            const name = v.name.trim();
            if (!name || seen.has(name)) continue; // a name can only be a column once
            seen.add(name);
            const dataTypeId = v.dataTypeId ?? (v.variableId != null ? (globalById.get(v.variableId)?.dataTypeId ?? null) : null);
            const label = dt.items.find((t) => t.id === dataTypeId)?.label ?? "";
            out.push({ name, dataTypeId, typeLabel: label || "Text", kind: kindOf(label, name), required: v.required, defaultValue: v.defaultValue });
        }
        return out;
    }, [main, dt.items, vars.items, vars.loadedProjectId, projectId]);


const savedRows = ad.saved[apiId] ?? [];

const ready =
    !!endpoint &&
    responses !== undefined &&
    dt.status === "succeeded" &&
    vars.status === "succeeded" &&
    vars.loadedProjectId === projectId;


    /* -------------------------------- loading -------------------------------- */
    useEffect(() => {
        if (!valid) return;
        dispatch(fetchCollectionApis({ collectionId }));
        dispatch(fetchProjectVariables({ projectId })); // the data types of the response variables
        dispatch(fetchDataTypes());
        dispatch(fetchApiData({ apiId })); // the records saved earlier
    }, [dispatch, valid, collectionId, projectId, apiId]);

    useEffect(() => {
        if (endpoint) dispatch(fetchEndpointResponses({ endpointId: endpoint.id }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, endpoint?.id]);

    /** saved records if there are any (filling columns added since), otherwise freshly generated ones */
    const seed = useCallback(() => {
        const server = ad.saved[apiId] ?? [];
        setRows(server.length > 0 ? fillMissing(columns, server.map(toRow)) : generateRows(columns, INITIAL));
        setSelected(new Set());
        setPage(1);
        setSearch("");
        setTried(false);
    }, [ad.saved, apiId, columns]);

    // the first records appear once everything the columns depend on is there
    useEffect(() => {
        if (!ready || seeded || columns.length === 0) return;
        seed();
        setSeeded(true);
    }, [ready, seeded, columns.length, seed]);

    /* ------------------------------ derived state ------------------------------ */
    const savedJson = useMemo(() => JSON.stringify(plain(columns, (savedRows ?? []).map((values) => ({ values })))), [columns, savedRows]);
    const draftJson = useMemo(() => JSON.stringify(plain(columns, rows)), [columns, rows]);
    const dirty = seeded && draftJson !== savedJson;

    // closing or refreshing the tab with unsaved records asks first
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const problems = useMemo(() => {
        const map = new Map<string, Map<string, string>>();
        const first: string[] = [];
        let n = 0;
        rows.forEach((r, i) => {
            for (const c of columns) {
                const msg = validateCell(c, r.values[c.name]);
                if (!msg) continue;
                n++;
                if (first.length < 3) first.push(`Record ${i + 1} · ${c.name}: ${msg}`);
                const m = map.get(r.key) ?? new Map<string, string>();
                m.set(c.name, msg);
                map.set(r.key, m);
            }
        });
        return { map, count: n, first };
    }, [rows, columns]);

    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => (q ? rows.filter((r) => columns.some((c) => cellText(r.values[c.name]).toLowerCase().includes(q))) : rows), [rows, columns, q]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;

    const pageKeys = visible.map((r) => r.key);
    const allOnPage = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
    const someOnPage = pageKeys.some((k) => selected.has(k));

    /* -------------------------------- editing -------------------------------- */
    const setCell = (key: string, name: string, v: Cell) =>
        setRows((rs) => rs.map((r) => (r.key === key ? { ...r, values: { ...r.values, [name]: v } } : r)));

    const addRecord = () => {
        if (rows.length >= MAX_ROWS) return void toast.warning("That's the most records one API can hold here", { description: `${MAX_ROWS} records.` });
        setSearch("");
        setPage(Math.ceil((rows.length + 1) / PAGE_SIZE));
        setRows((rs) => [...rs, blankRow(columns, rs)]);
    };

    const generateMore = () => {
        const n = Math.max(1, Math.min(MAX_GENERATE, Math.floor(count) || 1));
        if (rows.length + n > MAX_ROWS) return void toast.warning("Too many records", { description: `One API holds at most ${MAX_ROWS} records here.` });
        setRows((rs) => [...rs, ...generateRows(columns, n, rs)]);
        toast.success(`Added ${n} generated record${n === 1 ? "" : "s"}`, { duration: 2 });
    };

    const removeRows = (keys: string[]) => {
        const gone = new Set(keys);
        setRows((rs) => rs.filter((r) => !gone.has(r.key)));
        setSelected((s) => new Set([...s].filter((k) => !gone.has(k))));
    };

    const resetSample = () => {
        setRows(generateRows(columns, INITIAL));
        setSelected(new Set());
        setPage(1);
        setSearch("");
        setConfirmReset(false);
    };

    const toggleAllOnPage = (on: boolean) =>
        setSelected((s) => {
            const next = new Set(s);
            pageKeys.forEach((k) => (on ? next.add(k) : next.delete(k)));
            return next;
        });

    /* ---------------------------------- save ---------------------------------- */
    const save = async () => {
        setTried(true);
        if (!dirty) return;
        if (problems.count > 0) {
            // jump to the first record that needs attention
            const i = rows.findIndex((r) => problems.map.has(r.key));
            setSearch("");
            setPage(Math.floor(i / PAGE_SIZE) + 1);
            return;
        }
        try {
            await dispatch(saveApiData({ apiId, rows: plain(columns, rows) })).unwrap();
            setTried(false);
            toast.success("Data saved", { description: `${rows.length} record${rows.length === 1 ? "" : "s"} stored.` });
        } catch (e) {
            toast.error("Couldn't save", { description: getErrorMessage(e) }); // the records stay in the table
        }
    };

    /* ---------------------------------- render ---------------------------------- */
    const loadErrors = [
        { id: "apis", msg: apis.status === "failed" ? apis.error : null, label: "the APIs", retry: () => dispatch(fetchCollectionApis({ collectionId, force: true })) },
        { id: "resp", msg: endpoint ? er.errors[endpoint.id] : null, label: "the response", retry: () => endpoint && dispatch(fetchEndpointResponses({ endpointId: endpoint.id, force: true })) },
        { id: "types", msg: dt.status === "failed" ? dt.error : null, label: "the data types", retry: () => dispatch(fetchDataTypes({ force: true })) },
        { id: "vars", msg: vars.status === "failed" ? vars.error : null, label: "the global variables", retry: () => dispatch(fetchProjectVariables({ projectId, force: true })) },
        { id: "saved", msg: ad.errors[apiId], label: "the saved data", retry: () => dispatch(fetchApiData({ apiId, force: true })) },
    ].filter((e) => e.msg);

    if (!valid) return <Alert type="error" showIcon message="Invalid project, collection or API id" className="m-6" />;

    const backToApis = () => navigate(`/projects/${projectId}/collections/${collectionId}/apis?api=${apiId}${endpoint ? `&endpoint=${endpoint.id}` : ""}`);
    const title = group ? `/${group.name}` : "Data";

    const header = (
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Database className="size-5" />
                </span>
                <h1 className="font-mono text-2xl font-semibold tracking-tight text-content">{title}</h1>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Data collection</span>
            </div>
            {endpoint && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 font-mono text-sm text-content">
                    <MethodBadge method={endpoint.method} />
                    {endpoint.path}
                </span>
            )}
        </header>
    );

    let body;
    if (group === undefined) {
        const notFound = apis.status === "succeeded" && apis.loadedCollectionId === collectionId;
        body = notFound ? <Alert type="warning" showIcon message="This API doesn't exist in the collection" /> : loadErrors.length === 0 ? <Skeleton active paragraph={{ rows: 8 }} /> : null;
    } else if (!endpoint) {
        body = (
            <Alert
                type="info"
                showIcon
                message="This API has no GET endpoint"
                description="The records are built from the response of the GET endpoint, and this API doesn't have one."
                action={<Button size="small" onClick={backToApis}>Open the endpoints</Button>}
            />
        );
    } else if (!ready || !seeded) {
        // a response with no fields can't produce columns
        body =
            ready && columns.length === 0 ? (
                <div className="rounded-2xl border border-line py-14">
                    <Empty description={`The response of GET ${endpoint.path} has no fields yet`}>
                        <Button type="primary" onClick={backToApis}>Define the response</Button>
                    </Empty>
                </div>
            ) : loadErrors.length === 0 ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : null;
    } else {
        body = (
            <>
                {/* toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        allowClear
                        prefix={<Search className="size-4 text-muted" />}
                        placeholder="Search records"
                        value={search}
                        onChange={(e) => (setSearch(e.target.value), setPage(1))}
                        aria-label="Search records"
                        className="!w-full sm:!w-72 !rounded-xl"
                    />
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <span className="mr-1 flex items-center gap-2 text-sm text-muted">
                            <span className={`size-2 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
                            {dirty ? "Unsaved changes" : "All saved"}
                        </span>
                        <Button icon={<RefreshCw className="size-4" />} onClick={() => setConfirmReset(true)}>Reset sample data</Button>
                        <Space>
                            <InputNumber min={1} max={MAX_GENERATE} precision={0} value={count} onChange={(v) => setCount(Number(v) || 1)} aria-label="How many records to generate" className="!w-20" />
                            <Button icon={<Sparkles className="size-4" />} onClick={generateMore}>Generate more</Button>
                        </Space>
                        <Dropdown
                            disabled={rows.length === 0}
                            menu={{
                                items: [
                                    { key: "csv", label: "CSV (opens in Excel)" },
                                    { key: "json", label: "JSON" },
                                ],
                                onClick: ({ key }) => download(key as "csv" | "json", group?.name ?? "data", columns, rows),
                            }}
                        >
                            <Button icon={<Download className="size-4" />} disabled={rows.length === 0}>Export</Button>
                        </Dropdown>
                        <Button type="primary" icon={<Plus className="size-4" />} onClick={addRecord}>Add record</Button>
                    </div>
                </div>

                {confirmReset && (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-content">
                        <TriangleAlert className="size-4 shrink-0 text-red-500" />
                        <p className="min-w-0 flex-1">
                            Reset {title} to fresh sample data? Every change made here is lost and the record count goes back to {INITIAL}. Nothing is stored until you press Save.
                        </p>
                        <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
                        <Button danger type="primary" icon={<RefreshCw className="size-4" />} onClick={resetSample}>Reset records</Button>
                    </div>
                )}

                {tried && problems.count > 0 && (
                    <Alert
                        type="error"
                        showIcon
                        message={`${problems.count} value${problems.count === 1 ? "" : "s"} need attention before saving`}
                        description={
                            <ul className="list-disc pl-5">
                                {problems.first.map((p) => <li key={p}>{p}</li>)}
                                {problems.count > problems.first.length && <li>and {problems.count - problems.first.length} more</li>}
                            </ul>
                        }
                    />
                )}

                {selected.size > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-content">
                        <span>{selected.size} selected</span>
                        <Button danger size="small" icon={<Trash2 className="size-3.5" />} onClick={() => removeRows([...selected])}>Delete selected</Button>
                        <Button type="link" size="small" onClick={() => setSelected(new Set())}>Clear</Button>
                    </div>
                )}

                {/* the records */}
                <div className="overflow-hidden rounded-2xl border border-line">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm" style={{ minWidth: `${Math.max(36, 6 + columns.length * 12)}rem` }}>
                            <thead>
                                <tr className="border-b border-line">
                                    <th className="w-10 px-4 py-3">
                                        <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={(e) => toggleAllOnPage(e.target.checked)} aria-label="Select all records on this page" />
                                    </th>
                                    {columns.map((c) => (
                                        <th key={c.name} className="px-2 py-3 align-bottom font-normal">
                                            <span className="block px-2 text-sm text-content">
                                                {c.name}
                                                {c.required && <span className="ml-0.5 text-red-500" aria-label="required">*</span>}
                                            </span>
                                            <span className="block px-2 font-mono text-[10px] uppercase tracking-widest text-muted">{c.typeLabel}</span>
                                        </th>
                                    ))}
                                    <th className="w-12" />
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((r) => (
                                    <tr key={r.key} className={`border-b border-line last:border-0 ${selected.has(r.key) ? "bg-primary/[0.06]" : ""}`}>
                                        <td className="px-4 py-1.5">
                                            <Checkbox
                                                checked={selected.has(r.key)}
                                                onChange={(e) =>
                                                    setSelected((s) => {
                                                        const next = new Set(s);
                                                        if (e.target.checked) next.add(r.key);
                                                        else next.delete(r.key);
                                                        return next;
                                                    })
                                                }
                                                aria-label="Select record"
                                            />
                                        </td>
                                        {columns.map((c) => (
                                            <td key={c.name} className="px-2 py-1.5 align-middle">
                                                <DataCell column={c} value={r.values[c.name]} error={tried ? problems.map.get(r.key)?.get(c.name) : undefined} onChange={(v: Cell) => setCell(r.key, c.name, v)} />
                                            </td>
                                        ))}
                                        <td className="px-2 py-1.5 text-right">
                                            <Button type="text" shape="circle" danger icon={<Trash2 className="size-4" />} aria-label="Delete record" onClick={() => removeRows([r.key])} />
                                        </td>
                                    </tr>
                                ))}
                                {visible.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + 2} className="px-4 py-10 text-center text-muted">
                                            {q ? "No records match your search" : "No records yet. Add one, or generate some."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
                        <span>
                            Showing {from === 0 ? 0 : `${from}–${from + visible.length - 1}`} of {filtered.length}
                            {q ? ` (${rows.length} in total)` : ""} · click a cell to edit · columns come from the response of GET {endpoint.path}
                        </span>
                        {pages > 1 && <Pagination size="small" current={current} total={filtered.length} pageSize={PAGE_SIZE} showSizeChanger={false} onChange={setPage} />}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted">Records stay in this page until you press Save, which stores them for {title}.</p>
                    <div className="flex gap-2">
                        <Button onClick={seed} disabled={!dirty || ad.saving}>Discard</Button>
                        <Button type="primary" onClick={save} loading={ad.saving} disabled={!dirty}>Save</Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="space-y-5 p-6 md:p-8">
            {header}
            {loadErrors.map((e) => (
                <Alert key={e.id} type="error" showIcon message={`Couldn't load ${e.label}`} description={e.msg} action={<Button size="small" onClick={e.retry}>Try again</Button>} />
            ))}
            {body}
        </div>
    );
}