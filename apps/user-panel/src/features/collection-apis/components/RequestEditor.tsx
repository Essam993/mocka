import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, Input, Popover, Skeleton } from "antd";
import { Braces, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { ConfirmModal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { fetchSchemaFields } from "../../../store/reducers/schemaSlice";
import { fetchProjectVariables } from "../../../store/reducers/projectVariableSlice";
import { ValueSelect, useValueFrom, writeIds } from "./valueFrom";
import {
  deleteEndpointVariable,
  fetchEndpointVariables,
  insertEndpointVariables,
  updateEndpointVariables,
  variableKey,
} from "../../../store/reducers/endpointVariableSlice";
import type { EndpointVariable, VariableSection, VariableWrite } from "../../../types/endpointVariable";

type Tab = VariableSection | "cookies";

const TABS: { key: Tab; label: string }[] = [
  { key: "params", label: "Params" },
  { key: "headers", label: "Headers" },
  { key: "body", label: "Body" },
  { key: "cookies", label: "Cookies" },
];

const NOUN: Record<VariableSection, string> = { params: "parameter", headers: "header", body: "body field" };
const SECTIONS: VariableSection[] = ["params", "headers", "body"];
const NAME_RULE = /^[A-Za-z0-9_.-]+$/; // headers like "App-Key" are allowed

/** A row of the editor: a saved variable (has an id) or a new one */
interface Row {
  key: string; // React key and client id
  id?: number;
  variableId: number | null;
  name: string;
  dataTypeId: number | null;
  defaultValue: string;
  description: string;
  required: boolean;
}

const COLS = "grid grid-cols-[minmax(8rem,1.1fr)_minmax(12rem,1.6fr)_minmax(6rem,0.8fr)_minmax(8rem,1.3fr)_3rem_2.25rem] items-start gap-3";
const uid = () => Math.random().toString(36).slice(2);

const fromStored = (v: EndpointVariable): Row => ({
  key: `s${v.id}`,
  id: v.id,
  variableId: v.variableId,
  name: v.name,
  dataTypeId: v.dataTypeId,
  defaultValue: v.defaultValue,
  description: v.description,
  required: v.required,
});


interface Props {
  projectId: number;
  collectionId: number;
  endpointId: number;
  /** true while any section has unsaved edits */
  onDirtyChange?: (dirty: boolean) => void;
}

export function RequestEditor({ projectId, collectionId, endpointId, onDirtyChange }: Props) {
  const dispatch = useAppDispatch();
  const ctx = useMemo(() => ({ endpointId, collectionId, projectId }), [endpointId, collectionId, projectId]);

  const [tab, setTab] = useState<Tab>("params");
  /** the editable copy of each section, created when its list loads */
  const [drafts, setDrafts] = useState<Partial<Record<VariableSection, Row[]>>>({});
  const [tried, setTried] = useState<VariableSection[]>([]); // sections where Save was pressed, so errors show
  const [toDelete, setToDelete] = useState<{ section: VariableSection; row: Row } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingSchema, setAddingSchema] = useState<number | null>(null);

  const types = useAppSelector((s) => s.dataTypes.items);
  const ev = useAppSelector((s) => s.endpointVariables);
  const { items: schemaItems, loadedProjectId: schemasProject, details } = useAppSelector((s) => s.schemas);

  const { getDataTypeId } = useValueFrom(projectId);

  const schemas = schemasProject === projectId ? schemaItems.filter(Boolean) : [];
  const textType = types.find((t) => t.label.toLowerCase() === "text")?.id ?? types[0]?.id ?? null;

  const section: VariableSection | null = tab === "cookies" ? null : tab;
  const key = section ? variableKey(endpointId, section) : "";
  const stored = section ? ev.byKey[key] : undefined;
  const loading = section ? ev.loading.includes(key) : false;
  const loadError = section ? ev.errors[key] : undefined;
  const draft = section ? drafts[section] : undefined;

  const storedOf = (s: VariableSection) => ev.byKey[variableKey(endpointId, s)];

  /** the data type a row will be saved with: its own, or its global variable's */
  const typeOf = (r: Row): number | null => getDataTypeId(r);

  /** a new row, or a saved row that differs from what the server has */
  const changedIn = (s: VariableSection, r: Row) => {
    if (r.id == null) return true;
    const list = storedOf(s);
    if (!list) return false; // list not loaded yet
    const b = list.find((x) => x.id === r.id);
    return !b || b.name !== r.name || b.variableId !== r.variableId || b.dataTypeId !== typeOf(r) || b.defaultValue !== r.defaultValue || b.description !== r.description || b.required !== r.required;
  };

  /* -------------------------------- loading -------------------------------- */
  // each tab loads its own list when it is opened (cached after the first time)
  useEffect(() => {
    if (section) dispatch(fetchEndpointVariables({ endpointId, section }));
  }, [dispatch, endpointId, section]);

  // the editable copy is created once the list is there
  // merges the saved list into the editable copy once it arrives, keeping any rows added before that
  const seeded = useRef(new Set<VariableSection>());
  useEffect(() => {
    if (!section || !stored || seeded.current.has(section)) return;
    seeded.current.add(section);
    setDrafts((d) => {
      const mine = d[section] ?? [];
      const have = new Set(mine.filter((r) => r.id != null).map((r) => r.id));
      return { ...d, [section]: [...stored.filter((v) => !have.has(v.id)).map(fromStored), ...mine] };
    });
  }, [section, stored]);

  const anyDirty = SECTIONS.some((s) => (drafts[s] ?? []).some((r) => changedIn(s, r)));
  useEffect(() => onDirtyChange?.(anyDirty), [anyDirty, onDirtyChange]);

  /* ------------------------------- validation ------------------------------- */
  const validate = (s: VariableSection, rows: Row[]) => {
    const out: Record<string, { name?: string; type?: string }> = {};
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      const n = r.name.trim().toLowerCase();
      if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
    });
    rows
      .filter((r) => changedIn(s, r)) // unchanged rows are never blocked
      .forEach((r) => {
        const e: { name?: string; type?: string } = {};
        const n = r.name.trim();
        if (!n) e.name = "Enter a name";
        else if (!NAME_RULE.test(n)) e.name = "Letters, digits, - _ . only";
        else if ((seen.get(n.toLowerCase()) ?? 0) > 1) e.name = "Duplicate name";
        if (typeOf(r) == null) e.type = "Select a value";
        if (e.name || e.type) out[r.key] = e;
      });
    return out;
  };

  const errs = section && tried.includes(section) ? validate(section, draft ?? []) : {};

  /* -------------------------------- editing -------------------------------- */
  const setDraft = (s: VariableSection, fn: (rows: Row[]) => Row[]) => setDrafts((d) => ({ ...d, [s]: fn(d[s] ?? []) }));
  const patch = (r: Row, p: Partial<Row>) => section && setDraft(section, (rows) => rows.map((x) => (x.key === r.key ? { ...x, ...p } : x)));

  const addRow = () =>
    section &&
    setDraft(section, (rows) => [...rows, { key: uid(), variableId: null, name: "", dataTypeId: textType, defaultValue: "", description: "", required: false }]);

  const discard = () => {
    if (!section) return;
    setDrafts((d) => ({ ...d, [section]: (storedOf(section) ?? []).map(fromStored) }));
    setTried((t) => t.filter((x) => x !== section));
  };

  const toWrite = (r: Row): VariableWrite => ({
    id: r.id,
    ...writeIds({ ...r, dataTypeId: typeOf(r) }),
    variableId: r.variableId,
    name: r.name.trim(),
    defaultValue: r.defaultValue,
    description: r.description.trim(),
    required: r.required,
  } as VariableWrite);

  /* ---------------------------------- save ---------------------------------- */
  const save = async () => {
    if (!section || !draft) return;
    setTried((t) => (t.includes(section) ? t : [...t, section]));
    const changed = draft.filter((r) => changedIn(section, r));
    if (changed.length === 0 || Object.keys(validate(section, draft)).length > 0) return;

    const toInsert = changed.filter((r) => r.id == null);
    const toUpdate = changed.filter((r) => r.id != null);
    try {
      if (toInsert.length > 0) {
        const res = await dispatch(insertEndpointVariables({ ctx, section, rows: toInsert.map(toWrite) })).unwrap();
        dispatch(fetchProjectVariables({ projectId, force: true }));
        const byRow = new Map(toInsert.map((r, i) => [r.key, res.rows[i]]));
        // the new rows become saved rows, with the id and variableId the server gave them
        setDraft(section, (rows) => rows.map((r) => (byRow.has(r.key) ? { ...fromStored(byRow.get(r.key)!), key: r.key } : r)));
      }
      if (toUpdate.length > 0) {
        const res = await dispatch(updateEndpointVariables({ ctx, section, rows: toUpdate.map(toWrite) })).unwrap();
        const byId = new Map(res.rows.map((r) => [r.id, r]));
        setDraft(section, (rows) => rows.map((r) => (r.id != null && byId.has(r.id) ? { ...fromStored(byId.get(r.id)!), key: r.key } : r)));
      }
      if (!storedOf(section)) dispatch(fetchEndpointVariables({ endpointId, section, force: true }));
      setTried((t) => t.filter((x) => x !== section));
      toast.success(`${NOUN[section][0].toUpperCase()}${NOUN[section].slice(1)}s saved`);
    } catch (e) {
      toast.error("Couldn't save", { description: getErrorMessage(e) }); // what was typed stays in the table
    }
  };

  /* --------------------------------- delete --------------------------------- */
  const askDelete = (r: Row) => {
    if (!section) return;
    // a row the server doesn't know yet is just removed from the table
    if (r.id == null) return setDraft(section, (rows) => rows.filter((x) => x.key !== r.key));
    setToDelete({ section, row: r });
  };

  const confirmDelete = async () => {
    if (!toDelete || toDelete.row.id == null) return;
    const { section: s, row } = toDelete;
    // the payload carries what the server has, not what was edited in the table
    const b = storedOf(s)?.find((x) => x.id === row.id);
    try {
      await dispatch(
        deleteEndpointVariable({
          ctx,
          section: s,
          row: {
            id: row.id!,
            variableId: b?.variableId ?? row.variableId,
            name: b?.name ?? row.name,
            dataTypeId: b?.dataTypeId ?? typeOf(row),
            defaultValue: b?.defaultValue ?? row.defaultValue,
            description: b?.description ?? row.description,
            required: b?.required ?? row.required,
          },
        }),
      ).unwrap();
      setDraft(s, (rows) => rows.filter((x) => x.key !== row.key));
      toast.success(`${row.name} was deleted`);
      setToDelete(null);
    } catch (e) {
      toast.error("Couldn't delete", { description: getErrorMessage(e) });
      throw e; // keeps the dialog as the shared modal decides
    }
  };

  /* ---------------------------- fields from a schema ---------------------------- */
  const addSchema = async (schemaId: number) => {
    if (!section) return;
    setAddingSchema(schemaId);
    try {
      let fields = details[schemaId];
      if (!fields) {
        const res = await dispatch(fetchSchemaFields({ id: schemaId }));
        if (fetchSchemaFields.fulfilled.match(res)) fields = res.payload.fields;
      }
      if (!fields) return void toast.error("Couldn't load the schema fields", { description: "Try again in a moment." });

      const have = new Set((draft ?? []).map((r) => r.name.trim().toLowerCase()));
      const fresh = fields.filter((f) => !have.has(f.name.toLowerCase()));
      if (fresh.length > 0) {
        setDraft(section, (rows) => [
          ...rows,
          ...fresh.map((f) => ({
            key: uid(),
            variableId: null,
            name: f.name,
            dataTypeId: f.dataTypeId,
            defaultValue: "",
            description: f.description,
            required: f.required,
          })),
        ]);
      }
      const skipped = fields.length - fresh.length;
      toast.success(`Added ${fresh.length} field${fresh.length === 1 ? "" : "s"}`, {
        description: skipped > 0 ? `${skipped} already in this section were skipped. Press Save to store them.` : "Press Save to store them.",
      });
      setPickerOpen(false);
    } finally {
      setAddingSchema(null);
    }
  };

  /* --------------------------------- options --------------------------------- */

  const count = (t: Tab) => (t === "cookies" ? undefined : (drafts[t]?.length ?? ev.byKey[variableKey(endpointId, t)]?.length));
  const dirtyHere = section ? (draft ?? []).some((r) => changedIn(section, r)) : false;
  const rows = draft ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Params / Headers / Body / Cookies */}
        <div className="inline-flex rounded-xl border border-line bg-content/5 p-1" role="tablist" aria-label="Request parts">
          {TABS.map((t) => {
            const active = t.key === tab;
            const n = count(t.key);
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${active ? "border-line bg-surface font-medium text-content" : "border-transparent text-muted hover:text-content"
                  }`}
              >
                {t.label}
                {n != null && <span className="ml-1 text-xs text-muted">{n}</span>}
              </button>
            );
          })}
        </div>

        {/* adds the fields of a schema to this section as new rows */}
        {section && (
          <Popover
            trigger="click"
            placement="bottomRight"
            arrow={false}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title="Add fields from a schema"
            content={
              <div className="flex max-h-72 min-w-56 flex-col gap-0.5 overflow-auto">
                {schemas.length === 0 && <p className="px-1 py-2 text-sm text-muted">No schemas in this project yet.</p>}
                {schemas.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addSchema(s.id)}
                    disabled={addingSchema != null}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-content/5 disabled:opacity-60"
                  >
                    {addingSchema === s.id ? <Loader2 className="size-4 animate-spin" /> : <Braces className="size-4 shrink-0 text-violet-500" />}
                    <span className="min-w-0 flex-1 truncate text-sm text-content">{s.name}</span>
                  </button>
                ))}
              </div>
            }
          >
            <button
              type="button"
              disabled={schemas.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-60"
            >
              <Braces className="size-4" />
              Add from schema
              <ChevronDown className="size-4" />
            </button>
          </Popover>
        )}
      </div>

      {!section ? (
        <Alert type="info" showIcon message="Cookies are coming soon" description="They will load here once their API is ready." />
      ) : (
        <>
          {loadError && (
            <Alert
              type="error"
              showIcon
              message={`Couldn't load the ${NOUN[section]}s`}
              description={loadError}
              action={<Button size="small" onClick={() => dispatch(fetchEndpointVariables({ endpointId, section, force: true }))}>Try again</Button>}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-line">
            <div className="min-w-[44rem]">
              <div className={`${COLS} border-b border-line px-4 py-3 text-xs font-medium text-muted`}>
                <span>Key</span>
                <span>Value from</span>
                <span>Default</span>
                <span>Description</span>
                <span>Is Required</span>
                <span />
              </div>

              {loading && !stored && rows.length === 0 ? (
                <div className="border-b border-line px-4 py-4"><Skeleton active paragraph={{ rows: 2 }} title={false} /></div>
              ) : (
                <>
                  {rows.map((r) => {
                    const e = errs[r.key];
                    const removing = r.id != null && ev.deleting.includes(`${key}:${r.id}`);
                    return (
                      <div
                        key={r.key}
                        className={`${COLS} border-b border-line px-4 py-2.5 ${changedIn(section, r) ? "shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]" : ""} ${removing ? "opacity-50" : ""}`}
                      >
                        <div>
                          <Input
                            value={r.name}
                            onChange={(ev2) => patch(r, { name: ev2.target.value })}
                            status={e?.name ? "error" : undefined}
                            placeholder="field_name"
                            autoComplete="off"
                            aria-label="Key"
                            className="!font-mono"
                          />
                          {e?.name && <p className="mt-1 text-xs text-red-500">{e.name}</p>}
                        </div>

                        <div>
                          <ValueSelect
                            projectId={projectId}
                            row={r}
                            onChange={(ids) => patch(r, ids)}
                            placeholder="Select a value"
                            ariaLabel="Value from"
                            status={e?.type ? "error" : undefined}
                          />
                          {e?.type && <p className="mt-1 text-xs text-red-500">{e.type}</p>}
                        </div>

                        <Input value={r.defaultValue} onChange={(ev2) => patch(r, { defaultValue: ev2.target.value })} placeholder="—" autoComplete="off" aria-label="Default" />
                        <Input value={r.description} onChange={(ev2) => patch(r, { description: ev2.target.value })} placeholder="Add a note" autoComplete="off" aria-label="Description" />
                        <div className="grid h-8 place-items-center">
                          <Checkbox checked={r.required} onChange={(ev2) => patch(r, { required: ev2.target.checked })} aria-label="Required" />
                        </div>
                        <Button
                          type="text"
                          shape="circle"
                          danger
                          icon={<Trash2 className="size-4" />}
                          loading={removing}
                          aria-label={`Delete ${r.name || NOUN[section]}`}
                          onClick={() => askDelete(r)}
                        />
                      </div>
                    );
                  })}

                  {rows.length === 0 && (
                    <p className="border-b border-line px-4 py-4 text-sm text-muted">
                      No {NOUN[section]}s yet. Add the first one below, or add fields from a schema.
                    </p>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={addRow}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/5"
              >
                <Plus className="size-4" /> Add {NOUN[section]}
              </button>
            </div>
          </div>

          <p className="text-sm text-muted">
            New rows pick a data type ("Caller" means the app sends it). Saved rows can be pointed at a global variable of this project.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className={`size-2 rounded-full ${dirtyHere ? "bg-amber-500" : "bg-emerald-500"}`} />
              {dirtyHere ? "Unsaved changes" : "Up to date"}
            </span>
            <div className="flex gap-2">
              <Button onClick={discard} disabled={!dirtyHere || ev.saving}>Discard</Button>
              <Button type="primary" onClick={save} loading={ev.saving} disabled={!dirtyHere}>Save</Button>
            </div>
          </div>
        </>
      )}

      {/* delete a saved row: same payload with statusId 0 */}
      <ConfirmModal
        open={!!toDelete}
        title={`Delete this ${toDelete ? NOUN[toDelete.section] : "row"}?`}
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">{toDelete?.row.name}</span> will be permanently deleted from this endpoint.
          </>
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        onError={() => setToDelete(null)}
      />
    </div>
  );
}