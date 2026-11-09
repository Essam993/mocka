import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { AppstoreAddOutlined } from "@ant-design/icons";
import { Input, Modal, Select, Toggle, getErrorMessage } from "@repo/shared";
import { ENTITIES, type FieldDef, type Kind, type Values } from "../entities";

interface Props {
  open: boolean;
  kind: Kind;
  mode: "create" | "edit";
  /** the values of the item being edited */
  initial?: Values;
  /** e.g. "in Mocka team", or the name of the item being edited */
  context?: string;
  busy: boolean;
  /** throw to keep the modal open and show the message */
  onSubmit: (values: Values) => Promise<void>;
  onClose: () => void;
}

/** one text, select or toggle field: trimmed, required, length and pattern checks in one place */
const validate = (f: FieldDef) => (raw: string | boolean) => {
  if (f.type === "toggle") return true;
  const v = String(raw ?? "").trim();
  if (!v) return f.required ? `Enter the ${f.label.toLowerCase()}` : true;
  if (f.min && v.length < f.min) return `At least ${f.min} characters`;
  if (f.max && v.length > f.max) return `At most ${f.max} characters`;
  if (f.pattern && !f.pattern.regex.test(v)) return f.pattern.message;
  return true;
};

export function EntityFormModal({ open, kind, mode, initial, context, busy, onSubmit, onClose }: Props) {
  const def = ENTITIES[kind];
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({ defaultValues: def.defaults, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    reset(initial ?? def.defaults);
    setServerError(null);
  }, [open, kind, initial, def, reset]);

  const submit = handleSubmit(async (raw) => {
    setServerError(null);
    const values = Object.fromEntries(Object.entries(raw).map(([k, x]) => [k, typeof x === "string" ? x.trim() : x]));
    try {
      await onSubmit(values);
    } catch (e) {
      setServerError(getErrorMessage(e)); // keep the modal open so nothing typed is lost
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      align="center"
      icon={<AppstoreAddOutlined />}
      title={`${mode === "create" ? "Add" : "Update"} ${def.noun}`}
      description={context}
      footer={
        <>
          <Button onClick={onClose} disabled={busy} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="entity-form" loading={busy} size="middle">
            {mode === "create" ? `Add ${def.noun}` : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="entity-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        {def.fields.map((f) => (
          <Controller
            key={f.name}
            name={f.name}
            control={control}
            rules={{ validate: validate(f) }}
            render={({ field }) => {
              const error = errors[f.name]?.message as string | undefined;
              if (f.type === "toggle") {
                const { value, onChange, ...rest } = field;
                return <Toggle {...rest} checked={!!value} onChange={(e) => onChange(e.target.checked)} label={f.label} description={f.description} />;
              }
              if (f.type === "select") {
                return <Select {...field} value={String(field.value ?? "")} label={f.label} required={f.required} options={f.options ?? []} error={error} />;
              }
              return <Input {...field} value={String(field.value ?? "")} label={f.label} required={f.required} autoComplete="off" error={error} />;
            }}
          />
        ))}
      </form>
    </Modal>
  );
}