import { useEffect, useState, type KeyboardEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, Popconfirm } from "antd";
import { CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import { ConfirmModal, Input, Select, getErrorMessage, toast, useAppDispatch } from "@repo/shared";
import { useAppSelector } from "../../../store";
import { ProjectVariable, ProjectVariableInput } from "../../../types/projectVariable";
import { createProjectVariable, deleteProjectVariable, updateProjectVariable } from "../../../store/reducers/projectVariableSlice";
import { fetchDataTypes } from "../../../store/reducers/dataTypeSlice";
import { fetchSchemas } from "../../../store/reducers/schemaSlice";

interface FormValues {
    name: string;
    dataTypeId: number;
    recordDefId: number; // 0 = none selected
    description: string;
}

const emptyValues: FormValues = { name: "", dataTypeId: 1, recordDefId: 0, description: "" };
const toValues = (v?: ProjectVariable): FormValues =>
    v ? { name: v.name, dataTypeId: v.dataTypeId, recordDefId: v.recordDefId ?? 0, description: v.description } : emptyValues;

interface Props {
    open: boolean;
    projectId: number;
    /** Pass a variable to edit, omit to create */
    variable?: ProjectVariable;
    onClose: () => void;
}

export function VariablePanel({ open, projectId, variable, onClose }: Props) {
    const dispatch = useAppDispatch();
    const { saving, deletingIds } = useAppSelector((s) => s.projectVariables);
    const types = useAppSelector((s) => s.dataTypes);
    const records = useAppSelector((s) => s.schemas);
    const [serverError, setServerError] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const { control, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({ defaultValues: emptyValues, mode: "onTouched" });

    // fresh form every time the panel opens or another variable is selected
    useEffect(() => {
        if (!open) return;
        reset(toValues(variable));
        setServerError(null);
        dispatch(fetchDataTypes());
        dispatch(fetchSchemas({ projectId }));
    }, [open, variable, reset, dispatch]);

    const isRecord = types.items.find((t) => t.id === watch("dataTypeId"))?.label.toLowerCase() === "record";
    const deleting = variable ? deletingIds.includes(variable.id) : false;

    const submit = handleSubmit(async (v) => {
        setServerError(null);
        const input: ProjectVariableInput = {
            name: v.name.trim(),
            dataTypeId: v.dataTypeId,
            projectId,
            description: v.description.trim(),
            recordDefId: isRecord && v.recordDefId > 0 ? v.recordDefId : null,
        };
        try {
            if (variable) {
                await dispatch(updateProjectVariable({ ...input, id: variable.id })).unwrap();
                toast.success("Variable updated"); // stays open, the form refills from the store
            } else {
                await dispatch(createProjectVariable(input)).unwrap();
                toast.success("Variable created");
                onClose();
            }
        } catch (e) {
            setServerError(getErrorMessage(e)); // keep the panel open so nothing typed is lost
        }
    });

    const remove = async () => {
        if (!variable) return;
        try {
            await dispatch(deleteProjectVariable(variable.id)).unwrap();
            toast.success(`${variable.name} was deleted`);
            onClose();
        } catch (e) {
            toast.error("Couldn't delete the variable", { description: getErrorMessage(e) });
        }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.key !== "Escape" || saving) return;
        if ((e.target as HTMLElement).closest('[aria-expanded="true"]')) return; // let an open dropdown take Esc first
        onClose();
    };

    return (
        <>
            <section onKeyDown={onKeyDown} aria-label={variable ? "Edit variable" : "Add variable"} className="flex h-full flex-col overflow-hidden border border-line bg-surface/50">
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-content">{variable ? "Edit variable" : "Add variable"}</h2>
                        <p className="mt-0.5 truncate text-sm text-muted">{variable ? `Id ${variable.id} · ${variable.name}` : "Available to every endpoint in this project"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <span className="mr-1 flex items-center gap-2 text-sm text-muted">
                            <span className={`size-2 rounded-full ${isDirty ? "bg-amber-500" : "bg-emerald-500"}`} />
                            {isDirty ? "Unsaved" : "Up to date"}
                        </span>
                        <Button type="text" shape="circle" danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)} disabled={saving} aria-label="Delete variable" />
                        <Button type="text" shape="circle" icon={<CloseOutlined />} onClick={onClose} disabled={saving} aria-label="Close panel" />
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    <form id="variable-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}
                        {types.status === "failed" && (
                            <Alert
                                type="error"
                                showIcon
                                message="Couldn't load the data types"
                                description={types.error}
                                action={<Button size="small" onClick={() => dispatch(fetchDataTypes({ force: true }))}>Try again</Button>}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                name="name"
                                control={control}
                                rules={{
                                    required: "Enter the name",
                                    minLength: { value: 2, message: "At least 2 characters" },
                                    maxLength: { value: 50, message: "At most 50 characters" },
                                }}
                                render={({ field }) => <Input {...field} label="Variable name" required autoComplete="off" error={errors.name?.message} />}
                            />

                            <Controller
                                name="dataTypeId"
                                control={control}
                                rules={{ validate: (v) => v > 0 || "Select the data type" }}
                                render={({ field }) => (
                                    <Select
                                        {...field}
                                        label="Data type"
                                        required
                                        options={types.items.map((t) => ({ value: t.id, label: t.label }))}
                                        error={errors.dataTypeId?.message}
                                    />
                                )}
                            />
                        </div>

                        <Controller
                            name="description"
                            control={control}
                            rules={{ maxLength: { value: 200, message: "At most 200 characters" } }}
                            render={({ field }) => <Input {...field} label="Description (optional)" autoComplete="off" error={errors.description?.message} />}
                        />

                        {isRecord && (
                            <>
                                {records.status === "failed" && (
                                    <Alert
                                        type="error"
                                        showIcon
                                        message="Couldn't load the records"
                                        description={records.error}
                                        action={<Button size="small" onClick={() => dispatch(fetchSchemas({ projectId, force: true }))}>Try again</Button>}
                                    />
                                )}
                                <Controller
                                    name="recordDefId"
                                    control={control}
                                    rules={{ validate: (v) => v > 0 || "Select the record" }}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            value={field.value || undefined} // 0 shows as empty
                                            label="Child record"
                                            required
                                            options={records.items.map((r) => ({ value: r.id, label: r.name }))}
                                            error={errors.recordDefId?.message}
                                        />
                                    )}
                                />
                            </>
                        )}


                    </form>
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line/70 bg-page/40 px-5 py-3">
                    <span className="text-sm text-muted">{isDirty ? "Unsaved changes" : "No changes"}</span>
                    <div className="flex gap-2">
                        <Button onClick={() => (variable ? reset(toValues(variable)) : onClose())} disabled={saving}>
                            {variable ? "Discard" : "Cancel"}
                        </Button>
                        <Button type="primary" htmlType="submit" form="variable-form" loading={saving} disabled={variable ? !isDirty : false}>
                            {variable ? "Save changes" : "Create variable"}
                        </Button>
                    </div>
                </footer>
            </section>


            <ConfirmModal
                open={deleteModalOpen}
                title="Delete this Variable?"
                description="This action cannot be undone."
                content={
                    <>
                        <span className="font-semibold text-content">
                            {variable?.name}
                        </span>{" "}
                        will be permanently deleted.
                    </>
                }
                okText="Delete Variable"
                cancelText="Cancel"
                danger
                onConfirm={remove}
                onCancel={() => setDeleteModalOpen(false)}
                onError={() => setDeleteModalOpen(false)}
            />
        </>
    );
}