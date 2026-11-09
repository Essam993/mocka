import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Input, InputNumber, Select, Skeleton } from "antd";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { ConfirmModal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { fetchProjectVariables } from "../../../store/reducers/projectVariableSlice";
import { ValueSelect, useValueFrom, writeIds } from "./valueFrom";
import {
  deleteEndpointResponse,
  deleteResponseVariable,
  fetchContentTypes,
  fetchEndpointResponses,
  fetchHttpCodes,
  insertEndpointResponses,
  updateEndpointResponses,
} from "../../../store/reducers/endpointResponseSlice";
import { savedWrite } from "../../../store/services/endpointResponseApi";
import type { EndpointResponse, ResponseVariable, ResponseWrite } from "../../../types/endpointResponse";

/* ------------------------------- editor model ------------------------------- */

/** A variable row of a response: saved (has an id) or new */
interface Row {
  key: string;
  id?: number;
  variableId: number | null;
  name: string;
  dataTypeId: number | null;
  defaultValue: string;
  description: string;
  required: boolean;
}

/** A response: saved (has an id) or new. `isMain` is an editor idea: the main response takes what the others leave. */
interface Resp {
  key: string;
  id?: number;
  isMain: boolean;
  httpCodeId: number | null;
  contentTypeId: number | null;
  name: string;
  percentage: number;
  delay: number;
  rows: Row[];
}

type Mode = "single" | "weighted";
type Pending = { kind: "row"; resp: Resp; row: Row } | { kind: "response"; resp: Resp } | null;
interface RespErr { code?: string; body?: string; name?: string; share?: string; delay?: string }
interface RowErr { name?: string; type?: string }

const FIELD_NAME = /^[A-Za-z0-9_.-]+$/; // headers like "App-Key" are allowed
const RESPONSE_NAME = /^[A-Za-z0-9 _.-]+$/;
const MAX_DELAY = 60_000; // ★ adjust: the longest delay a mock may add, in ms
const COLS = "grid grid-cols-[minmax(8rem,1.1fr)_minmax(12rem,1.6fr)_minmax(6rem,0.8fr)_minmax(8rem,1.3fr)_3rem_2.25rem] items-start gap-3";
const WCOLS = "grid grid-cols-[minmax(10rem,1.3fr)_minmax(8rem,1fr)_6.5rem_7.5rem_2.25rem] items-start gap-3";

const uid = () => Math.random().toString(36).slice(2);
const search = (input: string, option?: { search?: string }) => String(option?.search ?? "").includes(input.toLowerCase());

const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null);
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <span className="mb-1.5 block text-sm text-muted">{label}</span>
    {children}
  </div>
);


/** the names from getHttpCodes start with the number, e.g. "201 Created" */
const codeNumber = (name?: string) => {
  const n = parseInt(name ?? "", 10);
  return Number.isFinite(n) ? n : null;
};
const isOk = (name?: string) => (codeNumber(name) ?? 200) < 400;
const statusBadge = (name: string): ReactNode => {
  const n = codeNumber(name);
  if (n == null) return null;
  const cls =
    n < 300 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : n < 400 ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
    : n < 500 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  return <span className={`mr-2 rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>{n}</span>;
};

const rowFrom = (v: ResponseVariable): Row => ({
  key: `v${v.id}`, id: v.id, variableId: v.variableId, name: v.name, dataTypeId: v.dataTypeId,
  defaultValue: v.defaultValue, description: v.description, required: v.required,
});

const respFrom = (r: EndpointResponse, isMain: boolean): Resp => ({
  key: `r${r.id}`, id: r.id, isMain, httpCodeId: r.httpCodeId, contentTypeId: r.contentTypeId,
  name: r.name, percentage: r.percentage, delay: r.delay, rows: r.variables.map(rowFrom),
});

const blank = (name: string, isMain: boolean, httpCodeId: number | null, contentTypeId: number | null, percentage: number): Resp => ({
  key: uid(), isMain, httpCodeId, contentTypeId, name, percentage, delay: 0, rows: [],
});

/** the biggest share is the main response (ties: the oldest) */
const seed = (rows: EndpointResponse[]): Resp[] =>
  [...rows].sort((a, b) => b.percentage - a.percentage || a.id - b.id).map((r, i) => respFrom(r, i === 0));

/* ---------------------------------- editor ---------------------------------- */

interface Props {
  projectId: number;
  collectionId: number;
  endpointId: number;
  /** true while there are unsaved edits */
  onDirtyChange?: (dirty: boolean) => void;
}

export function ResponseEditor({ projectId, collectionId, endpointId, onDirtyChange }: Props) {
  const dispatch = useAppDispatch();
  const ctx = useMemo(() => ({ endpointId, collectionId, projectId }), [endpointId, collectionId, projectId]);

  const er = useAppSelector((s) => s.endpointResponses);
  const types = useAppSelector((s) => s.dataTypes.items);

  const stored = er.byEndpoint[endpointId];
  const loadError = er.errors[endpointId];
  const codes = er.httpCodes.items;
  const bodies = er.contentTypes.items;

  const { getDataTypeId } = useValueFrom(projectId);
  const storedById = useMemo(() => new Map((stored ?? []).map((r) => [r.id, r] as const)), [stored]);
  const codeById = useMemo(() => new Map(codes.map((c) => [c.id, c])), [codes]);
  /** the data type of variables saved from here (the list endpoint doesn't send it) */
  const typeByVariable = useRef(new Map<number, number>());

  const okCode = (codes.find((c) => codeNumber(c.name) === 201) ?? codes.find((c) => codeNumber(c.name) === 200) ?? codes[0])?.id ?? null;
  const errCode = (codes.find((c) => codeNumber(c.name) === 503) ?? codes.find((c) => (codeNumber(c.name) ?? 0) >= 500))?.id ?? okCode;
  const defaultBody = bodies[0]?.id ?? null;
  const textType = types.find((t) => t.label.toLowerCase() === "text")?.id ?? types[0]?.id ?? null;

  const [drafts, setDrafts] = useState<Resp[] | null>(null);
  const [mode, setMode] = useState<Mode>("single");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  /* -------------------------------- loading -------------------------------- */
  // this component is mounted the first time the Response tab is opened, so this is the only place it loads
  useEffect(() => {
    dispatch(fetchEndpointResponses({ endpointId }));
    dispatch(fetchHttpCodes());
    dispatch(fetchContentTypes());
  }, [dispatch, endpointId]);

  const reseed = (rows: EndpointResponse[]) => {
    const list = seed(rows);
    const next = list.length > 0 ? list : [blank("response1", true, okCode, defaultBody, 100)];
    setDrafts(next);
    setMode(next.length > 1 ? "weighted" : "single");
    setActiveKey(next[0].key);
    setTouched(false);
    setTried(false);
  };

  // the editable copy is created once, when the list is there
  const seeded = useRef(false);
  useEffect(() => {
    if (stored === undefined || seeded.current) return;
    seeded.current = true;
    reseed(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  // a new response takes its status and body as soon as those lists arrive
  useEffect(() => {
    setDrafts((d) =>
      d && d.some((r) => r.id == null && (r.httpCodeId == null || r.contentTypeId == null))
        ? d.map((r) => (r.id == null ? { ...r, httpCodeId: r.httpCodeId ?? okCode, contentTypeId: r.contentTypeId ?? defaultBody } : r))
        : d,
    );
  }, [okCode, defaultBody]);

  /* ------------------------------ derived state ------------------------------ */
  /** what will be saved: in single mode only the main response counts */
  const effective = useMemo(() => {
    const all = drafts ?? [];
    return mode === "single" ? all.filter((r) => r.isMain) : all;
  }, [drafts, mode]);
  const main = effective.find((r) => r.isMain);
  const cur = effective.find((r) => r.key === activeKey) ?? main ?? effective[0];

  const othersSum = effective.filter((r) => !r.isMain).reduce((n, r) => n + (Number(r.percentage) || 0), 0);
  /** the main response takes what the others leave */
  const shareOf = (r: Resp) => (!r.isMain ? r.percentage : mode === "single" ? 100 : Math.max(0, 100 - othersSum));

  /** the data type a row will be saved with: its own, or the one of its global variable */
  const typeOf = (r: { id?: number; dataTypeId: number | null; variableId: number | null }): number | null =>
    r.dataTypeId ?? (r.variableId != null ? (typeByVariable.current.get(r.variableId) ?? getDataTypeId(r)) : null);

  const rowChanged = (resp: Resp, r: Row) => {
    if (r.id == null) return true;
    if (!stored) return false; // list not loaded yet
    const b = storedById.get(resp.id ?? -1)?.variables.find((v) => v.id === r.id);
    return !b || b.name !== r.name.trim() || b.variableId !== r.variableId || b.dataTypeId !== typeOf(r) || b.defaultValue !== r.defaultValue || b.description !== r.description.trim() || b.required !== r.required;
  };

  /** the response's own settings (not its rows) */
  const metaChanged = (r: Resp) => {
    if (r.id == null) return true;
    const b = storedById.get(r.id);
    return !!b && (b.httpCodeId !== r.httpCodeId || b.contentTypeId !== r.contentTypeId || b.name !== r.name.trim() || b.delay !== r.delay || b.percentage !== shareOf(r));
  };
  const respChanged = (r: Resp) => metaChanged(r) || r.rows.some((x) => rowChanged(r, x));

  const changed = effective.filter(respChanged);
  const dirty = drafts != null && stored !== undefined && (touched || stored.length > 0) && changed.length > 0;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const storedSum = (stored ?? []).reduce((n, r) => n + r.percentage, 0);
  const unbalanced = (stored?.length ?? 0) > 0 && storedSum !== 100;

  /* ------------------------------- validation ------------------------------- */
  // only what was added or edited is validated, so old data (like duplicate names) never blocks unrelated edits
  const problems = (() => {
    const resp = new Map<string, RespErr>();
    const rows = new Map<string, RowErr>();
    const taken = new Map<string, number>();
    effective.forEach((r) => {
      const n = r.name.trim().toLowerCase();
      if (n) taken.set(n, (taken.get(n) ?? 0) + 1);
    });

    for (const r of effective) {
      if (metaChanged(r)) {
        const e: RespErr = {};
        const n = r.name.trim();
        if (r.httpCodeId == null) e.code = "Select the status";
        if (r.contentTypeId == null) e.body = "Select the body";
        if (!n) e.name = "Enter a name";
        else if (n.length > 50) e.name = "At most 50 characters";
        else if (!RESPONSE_NAME.test(n)) e.name = "Letters, digits, space - _ . only";
        else if ((taken.get(n.toLowerCase()) ?? 0) > 1) e.name = "Duplicate name";
        if (!Number.isInteger(r.delay) || r.delay < 0 || r.delay > MAX_DELAY) e.delay = `0 to ${MAX_DELAY}`;
        if (mode === "weighted" && !r.isMain && (!Number.isInteger(r.percentage) || r.percentage < 1 || r.percentage > 99)) e.share = "1 to 99";
        if (Object.keys(e).length > 0) resp.set(r.key, e);
      }

      const seen = new Map<string, number>();
      r.rows.forEach((x) => {
        const n = x.name.trim().toLowerCase();
        if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
      });
      for (const x of r.rows) {
        if (!rowChanged(r, x)) continue;
        const e: RowErr = {};
        const n = x.name.trim();
        if (!n) e.name = "Enter a name";
        else if (!FIELD_NAME.test(n)) e.name = "Letters, digits, - _ . only";
        else if ((seen.get(n.toLowerCase()) ?? 0) > 1) e.name = "Duplicate name";
        if (typeOf(x) == null) e.type = "Select a value";
        if (e.name || e.type) rows.set(x.key, e);
      }
    }

    const share = mode === "weighted" && othersSum > 99 ? "The other responses can take at most 99% so the main response keeps a share." : undefined;
    return { resp, rows, share };
  })();

  const respErr = (r: Resp) => (tried ? problems.resp.get(r.key) : undefined);
  const hasProblem = (r: Resp) => problems.resp.has(r.key) || r.rows.some((x) => problems.rows.has(x.key));

  /* -------------------------------- editing -------------------------------- */
  const setResp = (key: string, fn: (r: Resp) => Resp) => setDrafts((d) => d && d.map((r) => (r.key === key ? fn(r) : r)));
  const patchResp = (key: string, p: Partial<Resp>) => {
    setTouched(true);
    setResp(key, (r) => ({ ...r, ...p }));
  };
  const patchRow = (resp: Resp, rowKey: string, p: Partial<Row>) => patchResp(resp.key, { rows: resp.rows.map((x) => (x.key === rowKey ? { ...x, ...p } : x)) });
  const addRow = (resp: Resp) =>
    patchResp(resp.key, { rows: [...resp.rows, { key: uid(), variableId: null, name: "", dataTypeId: textType, defaultValue: "", description: "", required: false }] });

  const chooseMode = (m: Mode) => {
    if (m === mode || !drafts) return;
    if (m === "single") {
      if (drafts.some((r) => !r.isMain && r.id != null)) {
        return void toast.warning("Delete the other responses first", { description: "Saved responses stay until you delete them." });
      }
      setDrafts(drafts.filter((r) => r.isMain)); // responses that were never saved are dropped
      setActiveKey(main?.key ?? null);
    }
    setMode(m);
    setTouched(true);
  };

  const addResponse = () => {
    if (!drafts) return;
    if (othersSum >= 99) return void toast.warning("No share left", { description: "Lower another response's share first." });
    const names = new Set(drafts.map((r) => r.name.trim().toLowerCase()));
    let n = drafts.length + 1;
    while (names.has(`response${n}`)) n++;
    const next = blank(`response${n}`, false, errCode, main?.contentTypeId ?? defaultBody, Math.max(1, Math.min(10, 99 - othersSum)));
    setTouched(true);
    setDrafts([...drafts, next]);
    setActiveKey(next.key);
  };

  const discard = () => reseed(stored ?? []);

  /* ---------------------------------- save ---------------------------------- */
  const writeOf = (r: Resp): ResponseWrite => ({
    id: r.id,
    httpCodeId: r.httpCodeId,
    contentTypeId: r.contentTypeId,
    name: r.name.trim(),
    percentage: shareOf(r),
    delay: r.delay,
    // a new response sends all its rows; a saved one only the rows that changed
    variables: (r.id == null ? r.rows : r.rows.filter((x) => rowChanged(r, x))).map((x) => ({
      id: x.id,
      ...writeIds({ ...x, dataTypeId: typeOf(x) }),
      name: x.name.trim(),
      defaultValue: x.defaultValue,
      description: x.description.trim(),
      required: x.required,
      statusId: 1 as const,
    } as ResponseWrite["variables"][number])),
  });

  /** the saved responses (with the ids the server gave them) replace the unsaved ones in the editor */
  const apply = (sent: Resp[], saved: EndpointResponse[]) => {
    saved.forEach((s) => s.variables.forEach((v) => v.variableId != null && v.dataTypeId != null && typeByVariable.current.set(v.variableId, v.dataTypeId)));
    const byKey = new Map(sent.map((d, i) => [d.key, saved[i]] as const));
    setDrafts((prev) =>
      prev &&
      prev.map((d) => {
        const s = byKey.get(d.key);
        if (!s) return d;
        const back = new Set(s.variables.map((v) => v.id));
        const kept = d.rows.filter((x) => x.id != null && !back.has(x.id)); // unchanged rows the server didn't send back
        return { ...respFrom(s, d.isMain), key: d.key, rows: [...kept, ...s.variables.map(rowFrom)] };
      }),
    );
  };

  const save = async () => {
    setTried(true);
    if (!dirty) return;
    const bad = effective.find(hasProblem);
    if (bad || problems.share) {
      if (bad) setActiveKey(bad.key); // show the first response that needs fixing
      return;
    }

    const updates = changed.filter((r) => r.id != null);
    const inserts = changed.filter((r) => r.id == null);
    const newVariables = changed.some((r) => r.id == null || r.rows.some((x) => x.id == null));

    setSaving(true);
    try {
      // updates first, so the main response gives its share back before a new response takes it
      if (updates.length > 0) apply(updates, (await dispatch(updateEndpointResponses({ ctx, rows: updates.map(writeOf) })).unwrap()).rows);
      if (inserts.length > 0) apply(inserts, (await dispatch(insertEndpointResponses({ ctx, rows: inserts.map(writeOf) })).unwrap()).rows);
      // new variables are created in the project, so the dropdown of global variables needs a refresh
      if (newVariables) dispatch(fetchProjectVariables({ projectId, force: true }));
      setTouched(false);
      setTried(false);
      toast.success("Responses saved");
    } catch (e) {
      toast.error("Couldn't save", { description: getErrorMessage(e) }); // what was typed stays in the editor
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- delete --------------------------------- */
  const askRemoveRow = (resp: Resp, row: Row) => {
    // a row the server doesn't know yet is just removed from the table
    if (row.id == null) return patchResp(resp.key, { rows: resp.rows.filter((x) => x.key !== row.key) });
    setPending({ kind: "row", resp, row });
  };

  const askRemoveResponse = (resp: Resp) => {
    if (resp.id != null) return setPending({ kind: "response", resp });
    setTouched(true);
    setDrafts((d) => d && d.filter((r) => r.key !== resp.key));
    setActiveKey(main?.key ?? null);
  };

  const confirmDelete = async () => {
    if (!pending) return;
    const { resp } = pending;
    const saved = resp.id != null ? storedById.get(resp.id) : undefined;
    if (!saved) {
      setPending(null);
      return void toast.error("Couldn't delete", { description: "Reload the responses and try again." });
    }
    const resolve = (v: ResponseVariable): ResponseVariable => ({ ...v, dataTypeId: typeOf(v) });

    try {
      if (pending.kind === "row") {
        const sv = saved.variables.find((v) => v.id === pending.row.id); // the payload carries what the server has, not what was edited
        if (sv) {
          await dispatch(deleteResponseVariable({ ctx, responseId: saved.id, rowId: sv.id, response: savedWrite(saved, [resolve(sv)], false) })).unwrap();
        }
        setResp(resp.key, (r) => ({ ...r, rows: r.rows.filter((x) => x.key !== pending.row.key) }));
        toast.success(`${pending.row.name} was deleted`);
      } else {
        await dispatch(deleteEndpointResponse({ ctx, responseId: saved.id, response: savedWrite(saved, saved.variables.map(resolve), true) })).unwrap();
        setDrafts((d) => d && d.filter((r) => r.key !== resp.key));
        setActiveKey(main?.key ?? null);
        toast.success(`${resp.name} was deleted`, { description: "The main response's share changed. Press Save to store it." });
      }
      setPending(null);
    } catch (e) {
      toast.error("Couldn't delete", { description: getErrorMessage(e) });
      throw e; // the shared modal decides what happens to the dialog
    }
  };

  /* --------------------------------- options --------------------------------- */
  const codeOptions = useMemo(
    () => codes.map((c) => ({ value: c.id, label: <>{statusBadge(c.name)}{c.name.replace(/^\d+\s*/, "") || c.name}</>, search: c.name.toLowerCase() })),
    [codes],
  );
  const bodyOptions = useMemo(() => bodies.map((c) => ({ value: c.id, label: c.name, search: c.name.toLowerCase() })), [bodies]);

  /* --------------------------------- render --------------------------------- */
  if (!drafts) {
    return loadError ? (
      <Alert
        type="error"
        showIcon
        message="Couldn't load the responses"
        description={loadError}
        action={<Button size="small" onClick={() => dispatch(fetchEndpointResponses({ endpointId, force: true }))}>Try again</Button>}
      />
    ) : (
      <Skeleton active paragraph={{ rows: 6 }} />
    );
  }
  if (!cur) return <Skeleton active paragraph={{ rows: 6 }} />;

  const statusSelect = (r: Resp) => (
    <div>
      <Select
        value={r.httpCodeId ?? undefined}
        onChange={(v) => patchResp(r.key, { httpCodeId: v })}
        options={codeOptions}
        placeholder="Select the status"
        aria-label="Status"
        status={respErr(r)?.code ? "error" : undefined}
        showSearch
        filterOption={search}
        popupMatchSelectWidth={false}
        className="w-full"
      />
      <Err msg={respErr(r)?.code} />
    </div>
  );

  const bodySelect = (r: Resp) => (
    <div>
      <Select
        value={r.contentTypeId ?? undefined}
        onChange={(v) => patchResp(r.key, { contentTypeId: v })}
        options={bodyOptions}
        placeholder="Select the body"
        aria-label="Body"
        status={respErr(r)?.body ? "error" : undefined}
        showSearch
        filterOption={search}
        className="w-full"
      />
      <Err msg={respErr(r)?.body} />
    </div>
  );

  const nameInput = (r: Resp) => (
    <div>
      <Input
        value={r.name}
        onChange={(e) => patchResp(r.key, { name: e.target.value })}
        status={respErr(r)?.name ? "error" : undefined}
        placeholder="response1"
        autoComplete="off"
        aria-label="Response name"
        className="!font-mono"
      />
      <Err msg={respErr(r)?.name} />
    </div>
  );

  const delayInput = (r: Resp) => (
    <div>
      <InputNumber
        value={r.delay}
        onChange={(v) => patchResp(r.key, { delay: Number(v) || 0 })}
        min={0}
        max={MAX_DELAY}
        step={50}
        precision={0}
        addonAfter="ms"
        aria-label="Delay in milliseconds"
        status={respErr(r)?.delay ? "error" : undefined}
        className="!w-full"
      />
      <Err msg={respErr(r)?.delay} />
    </div>
  );

  const barColors = (r: Resp) => (isOk(codeById.get(r.httpCodeId ?? -1)?.name) ? "bg-emerald-500" : "bg-red-500");

  return (
    <div className="space-y-6">
      {er.httpCodes.status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load the status codes" description={er.httpCodes.error}
          action={<Button size="small" onClick={() => dispatch(fetchHttpCodes({ force: true }))}>Try again</Button>} />
      )}
      {er.contentTypes.status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load the body types" description={er.contentTypes.error}
          action={<Button size="small" onClick={() => dispatch(fetchContentTypes({ force: true }))}>Try again</Button>} />
      )}

      {/* single or weighted */}
      <fieldset>
        <legend className="mb-2 text-sm text-muted">How should this endpoint answer?</legend>
        <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Response mode">
          {([
            { key: "single", title: "Single response", hint: "One answer every time" },
            { key: "weighted", title: "Weighted responses", hint: "Split calls between several answers" },
          ] as const).map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={mode === o.key}
              onClick={() => chooseMode(o.key)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                mode === o.key ? "border-primary bg-primary/10" : "border-line hover:bg-content/5"
              }`}
            >
              <span className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border ${mode === o.key ? "border-primary" : "border-muted"}`}>
                {mode === o.key && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-content">{o.title}</span>
                <span className="block text-sm text-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {unbalanced && (
        <Alert
          type="warning"
          showIcon
          message={`The saved shares add up to ${storedSum}%`}
          description={`They will be stored as ${effective.map(shareOf).join(" · ")} so the total is 100%. Press Save to store the change.`}
        />
      )}

      {/* the split */}
      {mode === "weighted" && (
        <section className="space-y-3 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-content">
              <GitBranch className="size-4 text-primary" /> Weighted responses
            </h3>
            <span className="font-mono text-sm text-muted">{effective.map(shareOf).join(" · ")}</span>
          </div>
          <p className="text-sm text-muted">Splits the calls no rule matched between these responses. The main response keeps whatever the others leave.</p>

          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-content/10" role="img" aria-label={`Shares: ${effective.map((r) => `${shareOf(r)}%`).join(", ")}`}>
            {effective.map((r) => (
              <span key={r.key} style={{ width: `${shareOf(r)}%` }} className={barColors(r)} />
            ))}
          </div>

          {tried && problems.share && <Alert type="error" showIcon message={problems.share} />}

          <div className="overflow-x-auto rounded-2xl border border-line">
            <div className="min-w-[46rem]">
              <div className={`${WCOLS} border-b border-line px-4 py-3 text-xs font-medium text-muted`}>
                <span>Response</span><span>Name</span><span>Share</span><span>Delay</span><span />
              </div>

              {effective.map((r) => {
                const removing = r.id != null && er.deleting.includes(`r:${r.id}`);
                return (
                  <div
                    key={r.key}
                    onClick={() => setActiveKey(r.key)}
                    onFocusCapture={() => setActiveKey(r.key)}
                    className={`${WCOLS} border-b border-line px-4 py-2.5 ${r.key === cur.key ? "bg-primary/[0.06] shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]" : ""} ${
                      tried && hasProblem(r) ? "bg-red-500/5" : ""
                    } ${removing ? "opacity-50" : ""}`}
                  >
                    {statusSelect(r)}
                    {nameInput(r)}
                    {r.isMain ? (
                      <span className="pt-1.5 text-sm text-content">{shareOf(r)} % <span className="text-xs text-muted">· main</span></span>
                    ) : (
                      <div>
                        <InputNumber
                          value={r.percentage}
                          onChange={(v) => patchResp(r.key, { percentage: Number(v) || 0 })}
                          min={1}
                          max={99}
                          precision={0}
                          addonAfter="%"
                          aria-label="Share"
                          status={respErr(r)?.share ? "error" : undefined}
                          className="!w-full"
                        />
                        <Err msg={respErr(r)?.share} />
                      </div>
                    )}
                    {delayInput(r)}
                    {r.isMain ? (
                      <span />
                    ) : (
                      <Button type="text" shape="circle" danger icon={<Trash2 className="size-4" />} loading={removing} aria-label={`Delete ${r.name || "response"}`} onClick={() => askRemoveResponse(r)} />
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={addResponse} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/5">
                <Plus className="size-4" /> Add a response
              </button>
            </div>
          </div>
        </section>
      )}

      {/* the selected response */}
      <section className="space-y-4 border-t border-line pt-5">
        {mode === "single" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">{statusSelect(cur)}</Field>
            <Field label="Body">{bodySelect(cur)}</Field>
            <Field label="Name">{nameInput(cur)}</Field>
            <Field label="Delay">{delayInput(cur)}</Field>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-content">{cur.isMain ? "Main response" : cur.name || "Response"}</h3>
              <span className="text-sm text-muted">{shareOf(cur)}% of calls</span>
            </div>
            <div className="w-full sm:w-64">
              <Field label="Body">{bodySelect(cur)}</Field>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-line">
          <div className="min-w-[44rem]">
            {/* <div className={`${COLS} border-b border-line px-4 py-3 text-xs font-medium text-muted`}>
              <span>Key</span><span>Value from</span><span>Default</span><span>Description</span><span>Req</span><span />
            </div> */}

            {cur.rows.map((r) => {
              const e = tried ? problems.rows.get(r.key) : undefined;
              const removing = r.id != null && er.deleting.includes(`v:${r.id}`);
              return (
                <div key={r.key} className={`${COLS} border-b border-line px-4 py-2.5 ${rowChanged(cur, r) ? "shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]" : ""} ${removing ? "opacity-50" : ""}`}>
                  <div>
                    <Input value={r.name} onChange={(ev) => patchRow(cur, r.key, { name: ev.target.value })} status={e?.name ? "error" : undefined}
                      placeholder="field_name" autoComplete="off" aria-label="Key" className="!font-mono" />
                    <Err msg={e?.name} />
                  </div>

                  <div>
                    <ValueSelect
                      projectId={projectId}
                      row={r}
                      onChange={(ids) => patchRow(cur, r.key, ids)}
                      placeholder="Select a value"
                      ariaLabel="Value from"
                      status={e?.type ? "error" : undefined}
                    />
                    <Err msg={e?.type} />
                  </div>

                  <Input value={r.defaultValue} onChange={(ev) => patchRow(cur, r.key, { defaultValue: ev.target.value })} placeholder="—" autoComplete="off" aria-label="Default" />
                  <Input value={r.description} onChange={(ev) => patchRow(cur, r.key, { description: ev.target.value })} placeholder="Add a note" autoComplete="off" aria-label="Description" />
                  {/* <div className="grid h-8 place-items-center">
                    <Checkbox checked={r.required} onChange={(ev) => patchRow(cur, r.key, { required: ev.target.checked })} aria-label="Required" />
                  </div> */}
                  <Button type="text" shape="circle" danger icon={<Trash2 className="size-4" />} loading={removing} aria-label={`Delete ${r.name || "field"}`} onClick={() => askRemoveRow(cur, r)} />
                </div>
              );
            })}

            {cur.rows.length === 0 && <p className="border-b border-line px-4 py-4 text-sm text-muted">No fields yet. Add the first one below.</p>}

            <button type="button" onClick={() => addRow(cur)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/5">
              <Plus className="size-4" /> Add field
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">New fields pick a data type ("Caller" means the app sends it). Saved fields can be pointed at a global variable of this project.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`size-2 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
          {dirty ? "Unsaved changes" : "Up to date"}
        </span>
        <div className="flex gap-2">
          <Button onClick={discard} disabled={!dirty || saving}>Discard</Button>
          <Button type="primary" onClick={save} loading={saving} disabled={!dirty}>Save</Button>
        </div>
      </div>

      {/* delete a saved field or a whole response: the same payload with statusId 0 */}
      <ConfirmModal
        open={!!pending}
        title={pending?.kind === "response" ? "Delete this response?" : "Delete this field?"}
        description="This action cannot be undone."
        content={
          pending?.kind === "response" ? (
            <><span className="font-semibold text-content">{pending.resp.name}</span> and all its fields will be permanently deleted.</>
          ) : (
            <><span className="font-semibold text-content">{pending?.row.name}</span> will be permanently deleted from <span className="font-semibold text-content">{pending?.resp.name}</span>.</>
          )
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
        onError={() => setPending(null)}
      />
    </div>
  );
}