import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { App, Button, Checkbox, Dropdown, Form, Input, InputNumber, Modal, Radio, Tabs, theme, type FormInstance } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { CheckOutlined, DeleteOutlined, PlusOutlined, TagOutlined } from "@ant-design/icons";
import { getErrorMessage } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { createCollectionApi } from "../../../store/reducers/collectionApiSlice";
import { LookupSelect, useLookup } from "../../../components/LookupSelect";
import type { CreateCollectionApiPayload, LookupItem } from "../../../types/collectionApi";

/* ------------------------------ form types ------------------------------ */

interface ConditionForm {
  operatorId?: number;
  value: string;
}
interface HeaderForm {
  headerNameId?: number;
  value: string;
}
interface ResponseForm {
  /** client-only id so tabs keep their identity when others are removed */
  uid: string;
  description: string;
  statusCodeId?: number;
  delayMs: number;
  headers: HeaderForm[];
  body: string;
  dynamic: boolean;
  weight: number;
}
interface FormValues {
  methodId?: number;
  conditions: ConditionForm[];
  responseMode: "single" | "weighted";
  responses: ResponseForm[];
  description: string;
}
interface Defaults {
  methodId?: number;
  operatorId?: number;
  statusCodeId?: number;
  headerNameId?: number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const newResponse = (n: number, weight: number, d: Defaults): ResponseForm => ({
  uid: uid(),
  description: `Response ${n}`,
  statusCodeId: d.statusCodeId,
  delayMs: 0,
  headers: [{ headerNameId: d.headerNameId, value: "application/json" }],
  body: '{\n  "status": "OK"\n}',
  dynamic: false,
  weight,
});

const pick = (items: LookupItem[], prefix: string) => items?.find((i) => i.name.toLowerCase().startsWith(prefix)) ?? items?.[0];

/* ------------------------------- layout bits ------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <h3 className="border-b border-line px-5 py-3 text-base font-semibold text-content" style={{ background: token.colorFillAlter }}>
        {title}
      </h3>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ----------------------------- one response ------------------------------ */

function ResponseFields({ name, weighted }: { name: number; weighted: boolean }) {
  const form = Form.useFormInstance(); // untyped on purpose: field paths are built dynamically
  const { message } = App.useApp();
  const dynamicValues = useLookup("dynamicValues");
  const bodyRef = useRef<TextAreaRef>(null);
  const bodyPath = ["responses", name, "body"];

  const insertDynamic = (text: string) => {
    const el = bodyRef.current?.resizableTextArea?.textArea;
    const current: string = form.getFieldValue(bodyPath) ?? "";
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    form.setFieldValue(bodyPath, current.slice(0, start) + text + current.slice(end));
    form.setFieldValue(["responses", name, "dynamic"], true);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(form.getFieldValue(bodyPath) ?? "");
      form.setFieldValue(bodyPath, JSON.stringify(parsed, null, 2));
    } catch {
      message.error("The body isn't valid JSON");
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <Form.Item name={["responses", name, "uid"]} hidden>
        <Input />
      </Form.Item>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <Form.Item label="Description" name={["responses", name, "description"]} rules={[{ required: true, message: "Give this response a name" }]} className="!mb-0">
          <Input placeholder="Response 1" />
        </Form.Item>
        <Form.Item label="Status code" name={["responses", name, "statusCodeId"]} rules={[{ required: true, message: "Pick a status code" }]} className="!mb-0">
          <LookupSelect lookup="statusCodes" placeholder="Status code" />
        </Form.Item>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <Form.Item label="Response delayed by" name={["responses", name, "delayMs"]} className="!mb-0">
          <InputNumber min={0} max={60000} step={100} addonAfter="ms" className="w-full" />
        </Form.Item>
        {weighted && (
          <Form.Item label="Weight" name={["responses", name, "weight"]} rules={[{ required: true, message: "Enter a weight" }]} className="!mb-0">
            <InputNumber min={0} max={100} addonAfter="%" className="w-full" />
          </Form.Item>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* headers */}
        <div>
          <div className="mb-1.5 font-medium text-content">Response headers</div>
          <Form.List name={["responses", name, "headers"]}>
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-start gap-2">
                    <Form.Item name={[f.name, "headerNameId"]} className="!mb-0 w-44 shrink-0">
                      <LookupSelect lookup="headerNames" placeholder="Header" />
                    </Form.Item>
                    <Form.Item name={[f.name, "value"]} className="!mb-0 min-w-0 flex-1">
                      <Input placeholder="Value" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(f.name)} aria-label="Remove header" />
                  </div>
                ))}
                <Button type="link" size="small" icon={<PlusOutlined />} className="!px-0" onClick={() => add({ value: "" })}>
                  Add header
                </Button>
              </div>
            )}
          </Form.List>
        </div>

        {/* body */}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-content">Response body</span>
            <div className="flex items-center gap-1">
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: dynamicValues.items?.length
                    ? dynamicValues.items?.map((d) => ({ key: String(d.id), label: d.name }))
                    : [{ key: "none", label: dynamicValues.loading ? "Loading…" : "No dynamic values", disabled: true }],
                  onClick: ({ key }) => {
                    const item = dynamicValues.items?.find((d) => String(d.id) === key);
                    if (item) insertDynamic(item.name);
                  },
                }}
              >
                <Button size="small" type="text" icon={<TagOutlined />}>
                  Insert dynamic value
                </Button>
              </Dropdown>
              <Button size="small" type="text" onClick={formatJson}>
                Format JSON
              </Button>
            </div>
          </div>
          <Form.Item name={bodyPath} className="!mb-2">
            <Input.TextArea ref={bodyRef} rows={10} spellCheck={false} className="!font-mono text-sm" />
          </Form.Item>
          <Form.Item name={["responses", name, "dynamic"]} valuePropName="checked" className="!mb-0">
            <Checkbox>Enable dynamic mock responses</Checkbox>
          </Form.Item>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- form ---------------------------------- */

interface FormProps {
  collectionId: number;
  onClose: () => void;
  onCreated: () => void;
}

function RuleForm({ collectionId, onClose, onCreated }: FormProps) {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const creating = useAppSelector((s) => s.collectionApis.creating);
  const [form] = Form.useForm<FormValues>();

  const methods = useLookup("methods");
  const operators = useLookup("conditions");
  const statusCodes = useLookup("statusCodes");

  /** sensible picks once the dropdowns have loaded */
  const defaults = useMemo<Defaults>(
    () => ({
      methodId: pick(methods.items, "get")?.id,
      operatorId: operators.items?.[0]?.id,
      statusCodeId: pick(statusCodes.items, "200")?.id,
    }),
    [methods.items, operators.items, statusCodes.items],
  );

  const [initial] = useState<FormValues>(() => ({
    conditions: [{ value: "" }],
    responseMode: "single",
    responses: [newResponse(1, 100, {})],
    description: "",
  }));
  const [activeUid, setActiveUid] = useState(initial.responses[0].uid);

  // fill the first row of everything once the lookups arrive (only where the user hasn't chosen yet)
  useEffect(() => {
    const f: FormInstance = form; // untyped view: the paths below are dynamic
    const setIfEmpty = (path: (string | number)[], value?: number) => {
      if (value != null && f.getFieldValue(path) == null) f.setFieldValue(path, value);
    };
    setIfEmpty(["methodId"], defaults.methodId);
    setIfEmpty(["conditions", 0, "operatorId"], defaults.operatorId);
    setIfEmpty(["responses", 0, "statusCodeId"], defaults.statusCodeId);
    setIfEmpty(["responses", 0, "headers", 0, "headerNameId"], defaults.headerNameId);
  }, [form, defaults]);

  const mode = Form.useWatch("responseMode", form) ?? "single";
  const watched = Form.useWatch("responses", form);
  const list = watched ?? initial.responses;
  const total = list.reduce((sum, r) => sum + (Number(r?.weight) || 0), 0);

  const submit = async (v: FormValues) => {
    const weighted = v.responseMode === "weighted";
    const used = weighted ? v.responses : v.responses.slice(0, 1);

    if (weighted && used.reduce((s, r) => s + (Number(r.weight) || 0), 0) !== 100) {
      message.error("Response weights must add up to 100%");
      return;
    }

    const payload: CreateCollectionApiPayload = {
      collectionId,
      methodId: v.methodId!,
      conditions: v.conditions.map((c) => ({ operatorId: c.operatorId!, value: c.value.trim() })),
      responseMode: v.responseMode,
      responses: used.map((r) => ({
        description: r.description.trim(),
        statusCodeId: r.statusCodeId!,
        delayMs: r.delayMs ?? 0,
        headers: (r.headers ?? []).filter((h) => h.headerNameId != null).map((h) => ({ headerNameId: h.headerNameId!, value: h.value ?? "" })),
        body: r.body ?? "",
        dynamic: !!r.dynamic,
        weight: weighted ? Number(r.weight) || 0 : 100,
      })),
      description: (v.description ?? "").trim(),
    };

    try {
      await dispatch(createCollectionApi(payload)).unwrap();
      onCreated();
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  return (
    <Form form={form} layout="vertical" requiredMark={false} initialValues={initial} onFinish={submit} scrollToFirstError>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
        {/* ------------------------------ request ----------------------------- */}
        <Section title="When this condition is matched (for request)">
          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field, i) => (
                  <div key={field.key} className="grid items-start gap-4 md:grid-cols-[180px_minmax(0,300px)_minmax(0,1fr)_32px]">
                    {i === 0 ? (
                      <Form.Item label="Method" name="methodId" rules={[{ required: true, message: "Pick a method" }]} className="!mb-0">
                        <LookupSelect lookup="methods" placeholder="Method" />
                      </Form.Item>
                    ) : (
                      <div className="hidden md:block" />
                    )}
                    <Form.Item
                      label={i === 0 ? "Request condition" : undefined}
                      name={[field.name, "operatorId"]}
                      rules={[{ required: true, message: "Pick a condition" }]}
                      className="!mb-0"
                    >
                      <LookupSelect lookup="conditions" placeholder="Select operator" />
                    </Form.Item>
                    <Form.Item
                      label={i === 0 ? "Match value / expression" : undefined}
                      name={[field.name, "value"]}
                      rules={[{ required: true, whitespace: true, message: "Enter a value to match" }]}
                      className="!mb-0"
                    >
                      <Input placeholder="/test" />
                    </Form.Item>
                    {i > 0 ? (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove condition" />
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
                <div className="text-right">
                  <Button type="link" icon={<PlusOutlined />} onClick={() => add({ operatorId: defaults.operatorId, value: "" })}>
                    Add condition
                  </Button>
                </div>
              </div>
            )}
          </Form.List>
        </Section>

        {/* ----------------------------- response ----------------------------- */}
        <Section title="Do the following (for response)">
          <Form.Item name="responseMode" className="!mb-3">
            <Radio.Group>
              <Radio value="single">Single response</Radio>
              <Radio value="weighted">Weighted response</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.List name="responses">
            {(fields, { add, remove }) =>
              mode === "weighted" ? (
                <Tabs
                  type="editable-card"
                  hideAdd
                  activeKey={activeUid}
                  onChange={setActiveUid}
                  onEdit={(key, action) => {
                    if (action !== "remove") return;
                    const idx = list.findIndex((r) => r.uid === key);
                    if (idx < 0) return;
                    remove(idx);
                    if (activeUid === key) setActiveUid(list.find((r) => r.uid !== key)?.uid ?? "");
                  }}
                  tabBarExtraContent={
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: total === 100 ? token.colorSuccess : token.colorError }}>
                        Total {total}%
                      </span>
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          const r = newResponse(fields.length + 1, 0, defaults);
                          add(r);
                          setActiveUid(r.uid);
                        }}
                      >
                        Add response
                      </Button>
                    </div>
                  }
                  items={fields.map((field) => ({
                    key: list[field.name]?.uid ?? String(field.key),
                    forceRender: true,
                    closable: fields.length > 1,
                    label: `Response ${field.name + 1} (${Number(list[field.name]?.weight) || 0}%)`,
                    children: <ResponseFields name={field.name} weighted />,
                  }))}
                />
              ) : fields[0] ? (
                <ResponseFields name={fields[0].name} weighted={false} />
              ) : null
            }
          </Form.List>
        </Section>

        {/* ------------------------------- extra ------------------------------ */}
        <Section title="Additional information">
          <Form.Item label="Rule description" name="description" className="!mb-0">
            <Input placeholder="Description" />
          </Form.Item>
        </Section>
      </div>

      <div className="flex justify-center gap-2 border-t border-line p-4">
        <Button onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" icon={<CheckOutlined />} loading={creating}>
          Save
        </Button>
      </div>
    </Form>
  );
}

/* --------------------------------- modal --------------------------------- */

interface Props {
  open: boolean;
  collectionId: number;
  onClose: () => void;
  onCreated: () => void;
}

export function ApiRuleModal({ open, collectionId, onClose, onCreated }: Props) {
  // a new key after the close animation gives the next opening a fresh form
  const [formKey, setFormKey] = useState(0);

  return (
    <Modal
      open={open}
      title="Create custom API"
      width={1100}
      centered
      footer={null}
      onCancel={onClose}
      afterClose={() => setFormKey((k) => k + 1)}
      styles={{ body: { padding: 0 } }}
    >
      <RuleForm key={formKey} collectionId={collectionId} onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}
