import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Modal as AntModal, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Braces } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { SchemaEditor } from "./components/SchemaEditor";
import { SchemaField } from "../../types/schema";
import { fetchSchemaFields, fetchSchemas } from "../../store/reducers/schemaSlice";
import { fetchDataTypes } from "../../store/reducers/dataTypeSlice";

type Selected = number | "draft" | null;
interface Draft {
  name: string;
  fields: SchemaField[];
}

export default function Schemas() {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((s) => s.scope.projectId);
  const { items, status, error, loadedProjectId, details, loadingFieldIds, fieldErrors } = useAppSelector((s) => s.schemas);

  const [selected, setSelected] = useState<Selected>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);

  // never show another project's schemas
  const schemas = projectId != null && loadedProjectId === projectId ? items.filter(Boolean) : [];
  const saved = typeof selected === "number" ? schemas.find((s) => s.id === selected) : undefined;
  const fields = typeof selected === "number" ? details[selected] : undefined;
  const loadingFields = typeof selected === "number" && loadingFieldIds.includes(selected);
  const fieldError = typeof selected === "number" ? fieldErrors[selected] : undefined;

  useEffect(() => {
    dispatch(fetchDataTypes());
  }, [dispatch]);

  // reload whenever the project selected in the sidebar changes
  useEffect(() => {
    setSelected(null);
    setDraft(null);
    setDirty(false);
    if (projectId != null) dispatch(fetchSchemas({ projectId }));
  }, [dispatch, projectId]);

  // select the first schema once they load
  useEffect(() => {
    if (selected == null && !draft && schemas.length > 0) setSelected(schemas[0].id);
  }, [selected, draft, schemas]);

  // load the fields of the selected schema (cached after the first time)
  useEffect(() => {
    if (typeof selected === "number") dispatch(fetchSchemaFields({ id: selected }));
  }, [dispatch, selected]);

  const onDirty = useCallback((d: boolean) => setDirty(d), []);

  /** runs `go` right away, or after the user confirms losing unsaved changes */
  const guard = (go: () => void) => {
    if (!dirty) return go();
    AntModal.confirm({
      title: "Discard unsaved changes?",
      content: "You have changes that are not saved yet.",
      okText: "Discard",
      okButtonProps: { danger: true },
      onOk: () => {
        setDirty(false);
        go();
      },
    });
  };

  const select = (id: number) =>
    id !== selected &&
    guard(() => {
      setDraft(null);
      setSelected(id);
    });

  const newSchema = () =>
    guard(() => {
      setDraft({ name: "", fields: [] });
      setSelected("draft");
    });

  const duplicate = () =>
    guard(() => {
      if (!saved || !fields) return;
      setDraft({ name: `${saved.name} copy`, fields: fields.map(({ id: _id, ...f }) => f) });
      setSelected("draft");
    });

  const discardDraft = () => {
    setDraft(null);
    setDirty(false);
    setSelected(schemas[0]?.id ?? null);
  };

  if (projectId == null) return <Alert type="info" showIcon message="Select a project in the sidebar to see its schemas" />;

  const rowClass = (active: boolean) =>
    `flex w-full items-center gap-4 px-5 py-3.5 text-left outline-none transition-colors focus-visible:bg-content/5 ${
      active ? "bg-primary/15 shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]" : "hover:bg-content/5"
    }`;

  return (
    // the negative margin cancels the layout's content padding, so the panel sits flush against the edges
    <div className="grid min-h-[calc(100dvh)] lg:grid-cols-[20rem_minmax(0,1fr)]  pl-0 md:pl-0">
      {/* list */}
      <aside className="border-b border-line lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-content">Schemas</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={newSchema}>New schema</Button>
        </div>
        <p className="border-y border-line px-5 py-4 text-sm leading-relaxed text-muted">
          A schema is a shape of data, like a User. Variables and fields can use one as a Record.
        </p>

        {status === "loading" && schemas.length === 0 ? (
          <div className="p-5"><Skeleton active paragraph={{ rows: 3 }} /></div>
        ) : (
          <ul>
            {schemas.map((s) => {
              const count = details[s.id]?.length;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => select(s.id)} aria-current={selected === s.id ? "true" : undefined} className={rowClass(selected === s.id)}>
                    <Braces className="size-5 shrink-0 text-violet-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-content">{s.name}</span>
                      {count != null && <span className="block truncate text-sm text-muted">{count} field{count === 1 ? "" : "s"}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {draft && (
              <li>
                <button type="button" onClick={() => setSelected("draft")} aria-current={selected === "draft" ? "true" : undefined} className={rowClass(selected === "draft")}>
                  <Braces className="size-5 shrink-0 text-violet-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium text-content">{draft.name || "Untitled schema"}</span>
                    <span className="block truncate text-sm text-muted">Draft · not saved yet</span>
                  </span>
                </button>
              </li>
            )}
            {schemas.length === 0 && !draft && status !== "loading" && <li className="px-5 py-8 text-center text-sm text-muted">No schemas yet</li>}
          </ul>
        )}
      </aside>

      {/* editor: carries the page padding that the wrapper cancelled */}
      <main className="min-w-0 p-6 md:p-8">
        {status === "failed" && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message="Couldn't load schemas"
            description={error}
            action={<Button size="small" onClick={() => dispatch(fetchSchemas({ projectId, force: true }))}>Try again</Button>}
          />
        )}

        {selected === "draft" && draft ? (
          <SchemaEditor
            key="draft"
            projectId={projectId}
            fields={draft.fields}
            seedName={draft.name}
            onDirtyChange={onDirty}
            onSaved={(id) => {
              setDraft(null);
              setDirty(false);
              setSelected(id);
            }}
            onDeleted={() => undefined}
            onDiscardDraft={discardDraft}
            onDuplicate={duplicate}
          />
        ) : saved && fields ? (
          <SchemaEditor
            key={`schema-${saved.id}`}
            projectId={projectId}
            schema={saved}
            fields={fields}
            onDirtyChange={onDirty}
            onSaved={() => undefined}
            onDeleted={() => {
              setDirty(false);
              setSelected(null);
            }}
            onDiscardDraft={discardDraft}
            onDuplicate={duplicate}
          />
        ) : saved && fieldError ? (
          <Alert
            type="error"
            showIcon
            message="Couldn't load the fields of this schema"
            description={fieldError}
            action={<Button size="small" onClick={() => dispatch(fetchSchemaFields({ id: saved.id, force: true }))}>Try again</Button>}
          />
        ) : saved && loadingFields ? (
          <div className="rounded-2xl border border-line p-6"><Skeleton active paragraph={{ rows: 6 }} /></div>
        ) : (
          <div className="rounded-2xl border border-line py-16">
            <Empty description="Select a schema, or create a new one" />
          </div>
        )}
      </main>
    </div>
  );
}