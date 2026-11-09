import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Alert, Button, Checkbox, Input as AntInput, Modal as AntModal, Select as AntSelect } from "antd";
import { CheckOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ConfirmModal, getErrorMessage, toast, useAppDispatch } from "@repo/shared";
import { useAppSelector } from "../../../store";
import { Schema, SchemaField, SchemaInput } from "../../../types/schema";
import { createSchema, deleteSchema, fetchSchemaFields, updateSchema } from "../../../store/reducers/schemaSlice";

interface FieldValues {
  fieldId?: number;
  name: string;
  dataTypeId: number;
  recordDefId: number; // 0 = none selected
  description: string;
  required: boolean;
}
interface FormValues {
  name: string;
  fields: FieldValues[];
}

const COLS = "grid grid-cols-[minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(10rem,2fr)_5rem_2.5rem] items-start gap-3";

interface Props {
  projectId: number;
  /** the saved schema being edited; omit for a new (draft) schema */
  schema?: Schema;
  /** its fields (saved fields, or the starting fields of a draft / duplicate) */
  fields: SchemaField[];
  /** starting name of a draft (duplicate) */
  seedName?: string;
  onDirtyChange: (dirty: boolean) => void;
  /** a new schema was saved */
  onSaved: (id: number) => void;
  /** a saved schema was deleted */
  onDeleted: () => void;
  /** the draft was thrown away */
  onDiscardDraft: () => void;
  onDuplicate: () => void;
}

export function SchemaEditor({ projectId, schema, fields: initialFields, seedName, onDirtyChange, onSaved, onDeleted, onDiscardDraft, onDuplicate }: Props) {
  const dispatch = useAppDispatch();
  const { saving, deletingIds, items, details, loadedProjectId } = useAppSelector((s) => s.schemas);
  const types = useAppSelector((s) => s.dataTypes.items);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleteSchema, setIsDeleteSchema] = useState<boolean>(false);

  const isNew = !schema;
  const schemas = loadedProjectId === projectId ? items : [];
  const typeId = (label: string) => types.find((t) => t.label.toLowerCase() === label)?.id;
  const typeLabel = (id: number) => types.find((t) => t.id === id)?.label ?? `Type ${id}`;
  const isRecordType = (id: number) => typeLabel(id).toLowerCase() === "record";
  const textType = typeId("text") ?? types[0]?.id ?? 1;

  const toValues = (): FormValues => ({
    name: schema?.name ?? seedName ?? "",
    fields:
      initialFields.length > 0
        ? initialFields.map((f) => ({
          fieldId: f.id,
          name: f.name,
          dataTypeId: f.dataTypeId,
          recordDefId: f.recordDefId ?? 0,
          description: f.description,
          required: f.required,
        }))
        : isNew
          ? // a brand new schema starts with an "id" field, like in the design
          [{ name: "id", dataTypeId: typeId("id") ?? textType, recordDefId: 0, description: "", required: true }]
          : [],
  });

  const { control, handleSubmit, reset, watch, getValues, setValue, formState: { errors, isDirty } } = useForm<FormValues>({
    defaultValues: toValues(),
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({ control, name: "fields" });

  // refill after a save / reload, and once the data types are known
  useEffect(() => {
    reset(toValues());
    setServerError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, initialFields, types.length]);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const watched = watch("fields");

  // load the fields of every schema nested in a Record row, for the preview under it
  const linkedKey = (watched ?? []).map((r) => (r && isRecordType(r.dataTypeId) ? r.recordDefId : 0)).join(",");
  useEffect(() => {
    linkedKey
      .split(",")
      .map(Number)
      .filter((id) => id > 0)
      .forEach((id) => dispatch(fetchSchemaFields({ id })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKey, types.length, dispatch]);

  const deleting = schema ? deletingIds.includes(schema.id) : false;
  // a record can't contain itself
  const recordOptions = schemas.filter((s) => s.id !== schema?.id).map((s) => ({ value: s.id, label: s.name }));

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const input: SchemaInput = {
      name: v.name.trim(),
      projectId,
      fields: v.fields.map((f) => ({
        id: f.fieldId,
        name: f.name.trim(),
        dataTypeId: f.dataTypeId,
        description: f.description.trim(),
        required: f.required,
        recordDefId: isRecordType(f.dataTypeId) && f.recordDefId > 0 ? f.recordDefId : null,
      })),
    };
    try {
      let id: number;
      if (schema) {
        await dispatch(updateSchema({ ...input, id: schema.id })).unwrap();
        id = schema.id;
      } else {
        id = (await dispatch(createSchema(input)).unwrap()).schema.id;
      }
      dispatch(fetchSchemaFields({ id, force: true })); // reload so new fields get their server ids
      toast.success(schema ? "Schema updated" : "Schema created");
      if (!schema) onSaved(id);
      if (!schema) onSaved(id); ``
    } catch (e) {
      setServerError(getErrorMessage(e)); // keep the editor as it is so nothing typed is lost
    }
  });

  const confirmDelete = () => {
    if (!schema) return onDiscardDraft();
    setIsDeleteSchema(true);
    // AntModal.confirm({
    //   title: "Delete this schema?",
    //   content: `${schema.name} will be removed. Variables and fields that use it will lose their child record.`,
    //   okText: "Delete schema",
    //   okButtonProps: { danger: true },
    //   onOk: async () => {
    //     try {
    //       await dispatch(deleteSchema(schema.id)).unwrap();
    //       toast.success(`${schema.name} was deleted`);
    //       onDeleted();
    //     } catch (e) {
    //       toast.error("Couldn't delete the schema", { description: getErrorMessage(e) });
    //       throw e; // keeps the dialog open
    //     }
    //   },
    // });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Enter the schema name",
            minLength: { value: 2, message: "At least 2 characters" },
            maxLength: { value: 50, message: "At most 50 characters" },
          }}
          render={({ field }) => (
            <div className="w-full max-w-md">
              <input
                {...field}
                aria-label="Schema name"
                placeholder="Untitled schema"
                autoComplete="off"
                className={`h-14 w-full rounded-xl border bg-transparent px-4 text-2xl font-semibold tracking-tight text-content outline-none transition placeholder:text-muted focus:border-primary ${errors.name ? "border-red-500" : "border-line"}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
          )}
        />
        <div className="flex gap-2">
          <Button icon={<CopyOutlined />} onClick={onDuplicate} disabled={isNew}>Duplicate</Button>
          <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={confirmDelete}>
            {isNew ? "Discard schema" : "Delete schema"}
          </Button>
        </div>
      </header>

      {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

      {/* fields */}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <div className="min-w-[46rem]">
          <div className={`${COLS} border-b border-line px-4 py-3 text-xs font-medium text-muted`}>
            <span>Field</span>
            <span>Type</span>
            <span>Description</span>
            <span>Is Required</span>
            <span />
          </div>

          {fields.map((f, i) => {
            const row = watched?.[i];
            const record = row ? isRecordType(row.dataTypeId) : false;
            const childFields = row && row.recordDefId > 0 ? details[row.recordDefId] : undefined;
            return (
              <div key={f.id} className="border-b border-line px-4 py-3">
                <div className={COLS}>
                  <Controller
                    name={`fields.${i}.name`}
                    control={control}
                    rules={{
                      required: "Enter a name",
                      pattern: { value: /^[A-Za-z_][A-Za-z0-9_]*$/, message: "Letters, digits and _ only" },
                      validate: (v) => getValues("fields").filter((x) => x.name.trim() === v.trim()).length === 1 || "Duplicate name",
                    }}
                    render={({ field }) => (
                      <div>
                        <AntInput {...field} aria-label="Field name" placeholder="fieldName" autoComplete="off" status={errors.fields?.[i]?.name ? "error" : undefined} className="!font-mono" />
                        {errors.fields?.[i]?.name && <p className="mt-1 text-xs text-red-500">{errors.fields[i]!.name!.message}</p>}
                      </div>
                    )}
                  />
                  <Controller
                    name={`fields.${i}.dataTypeId`}
                    control={control}
                    render={({ field }) => (
                      <AntSelect
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          if (!isRecordType(v)) setValue(`fields.${i}.recordDefId`, 0, { shouldDirty: true }); // leaving Record clears the child
                        }}
                        aria-label="Data type"
                        options={types.map((t) => ({ value: t.id, label: t.label }))}
                        className="w-full"
                      />
                    )}
                  />
                  <Controller
                    name={`fields.${i}.description`}
                    control={control}
                    render={({ field }) => <AntInput {...field} aria-label="Description" placeholder="Add a note" autoComplete="off" />}
                  />
                  <Controller
                    name={`fields.${i}.required`}
                    control={control}
                    render={({ field }) => (
                      <div className="grid h-8 place-items-center">
                        <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} aria-label="Required" />
                      </div>
                    )}
                  />
                  <Button type="text" shape="circle" icon={<DeleteOutlined />} aria-label="Remove field" disabled={fields.length === 1} onClick={() => remove(i)} />
                </div>

                {record && (
                  <div className="mt-3 pl-1 sm:pl-4">
                    <Controller
                      name={`fields.${i}.recordDefId`}
                      control={control}
                      rules={{ validate: (v) => v > 0 || "Select the child record" }}
                      render={({ field }) => (
                        <div className="max-w-md">
                          <label className="mb-1 block text-sm font-medium text-content">Child record</label>
                          <AntSelect
                            value={field.value || undefined}
                            onChange={field.onChange}
                            placeholder="Select a record"
                            options={recordOptions}
                            status={errors.fields?.[i]?.recordDefId ? "error" : undefined}
                            className="w-full"
                            showSearch
                            optionFilterProp="label"
                          />
                          {errors.fields?.[i]?.recordDefId && <p className="mt-1 text-xs text-red-500">{errors.fields[i]!.recordDefId!.message}</p>}
                        </div>
                      )}
                    />
                    {childFields && childFields.length > 0 && (
                      <ul className="mt-2 space-y-0.5 border-l border-dashed border-line pl-3 font-mono text-xs text-muted">
                        {childFields.map((cf) => (
                          <li key={cf.id ?? cf.name}>{cf.name} · {typeLabel(cf.dataTypeId)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => append({ name: "", dataTypeId: textType, recordDefId: 0, description: "", required: false })}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-primary/5"
          >
            <PlusOutlined /> Add field
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">Deleting a field removes it from every variable and record that uses this schema.</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`size-2 rounded-full ${isDirty ? "bg-amber-500" : "bg-emerald-500"}`} />
          {isDirty ? "Unsaved changes" : "Up to date"}
        </span>
        <div className="flex gap-2">
          <Button onClick={() => (isNew ? onDiscardDraft() : reset(toValues()))} disabled={saving || (!isNew && !isDirty)}>
            Discard
          </Button>
          <Button type="primary" htmlType="submit" icon={<CheckOutlined />} loading={saving} disabled={!isNew && !isDirty}>
            Save
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-content">How the columns work</h3>
        <p className="text-sm text-muted">
          <b className="text-content">Type</b> is what kind of value it is. <b className="text-content">Required</b> fields must be present when a caller creates a record.
          A field of type <b className="text-content">Record</b> nests another schema inside this one.
        </p>
      </section>

      <ConfirmModal
        open={isDeleteSchema}
        title="Delete this Schema?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">
              {schema?.name}
            </span>{" "}
            will be permanently deleted.
          </>
        }
        okText="Delete Schema"
        cancelText="Cancel"
        danger
        onConfirm={async () => {
          if (!schema) return;
          try {
            await dispatch(deleteSchema(schema.id)).unwrap();
            toast.success(`${schema.name} was deleted`);
            setIsDeleteSchema(false);
            onDeleted();
          } catch (e) {
            toast.error("Couldn't delete the schema", { description: getErrorMessage(e) });
            throw e; // keeps the dialog open
          }
        }}
        onCancel={() => setIsDeleteSchema(false)}
        onError={() => setIsDeleteSchema(false)}
      />

    </form>
  );
}