
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, message } from "antd";
import { FolderOutlined } from "@ant-design/icons";
import {
    Input,
    Modal,
    getErrorMessage,
    useAppDispatch,
} from "@repo/shared";
import { useAppSelector } from "../../../store";
import {
    createWorkspace,
    updateWorkspace,
} from "../../../store/reducers/workspaceSlice";
import { Workspace, WorkspaceInput } from "../../../types/workspace";

type FormValues = Pick<WorkspaceInput, "name" | "alias">;

const emptyValues: FormValues = {
    name: "",
    alias: "",
};

interface Props {
    open: boolean;
    mockaUserId: number;
    workspace?: Workspace;
    onClose: () => void;
}

export function WorkspaceFormModal({
    open,
    mockaUserId,
    workspace,
    onClose,
}: Props) {
    const dispatch = useAppDispatch();

    const { saving } = useAppSelector(
        (state) => state.workspaces
    );

    const [serverError, setServerError] = useState<string | null>(
        null
    );

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: emptyValues,
        mode: "onTouched",
    });

    useEffect(() => {
        if (!open) return;

        reset(
            workspace
                ? {
                      name: workspace.name,
                      alias: workspace.alias,
                  }
                : emptyValues
        );

        setServerError(null);
    }, [open, workspace, reset]);

    const submit = handleSubmit(async (values) => {
        setServerError(null);

        const input: WorkspaceInput = {
            userId: mockaUserId,
            name: values.name.trim(),
            alias: values.alias.trim(),
        };

        try {
            if (workspace) {
                await dispatch(
                    updateWorkspace({
                        ...input,
                        id: workspace.id,
                    })
                ).unwrap();

                message.success("Workspace updated successfully");
            } else {
                await dispatch(createWorkspace(input)).unwrap();

                message.success("Workspace created successfully");
            }

            onClose();
        } catch (error) {
            setServerError(getErrorMessage(error));
        }
    });

    const nameRules = {
        required: "Enter the workspace name",
        minLength: {
            value: 2,
            message: "At least 2 characters",
        },
        maxLength: {
            value: 50,
            message: "At most 50 characters",
        },
    };

    const aliasRules = {
        required: "Enter the workspace alias",
        minLength: {
            value: 2,
            message: "At least 2 characters",
        },
        maxLength: {
            value: 50,
            message: "At most 50 characters",
        },
        pattern: {
            value: /^[a-zA-Z0-9_-]+$/,
            message: "Only letters, numbers, hyphens and underscores",
        },
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            busy={saving}
            size="md"
            align="center"
            icon={<FolderOutlined />}
            title={workspace ? "Edit workspace" : "Create workspace"}
            description={
                workspace?.name ||
                "Fill in the details to create a new workspace."
            }
            footer={
                <>
                    <Button
                        onClick={onClose}
                        disabled={saving}
                        size="middle"
                    >
                        Cancel
                    </Button>

                    <Button
                        type="primary"
                        htmlType="submit"
                        form="workspace-form"
                        loading={saving}
                        size="middle"
                    >
                        {workspace ? "Save changes" : "Create workspace"}
                    </Button>
                </>
            }
        >
            <form
                id="workspace-form"
                onSubmit={submit}
                noValidate
                className="flex flex-col gap-4"
            >
                {serverError && (
                    <Alert
                        type="error"
                        showIcon
                        message={serverError}
                        closable
                        onClose={() => setServerError(null)}
                    />
                )}

                <Controller
                    name="name"
                    control={control}
                    rules={nameRules}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Workspace Name"
                            required
                            autoComplete="off"
                            error={errors.name?.message}
                        />
                    )}
                />

                <Controller
                    name="alias"
                    control={control}
                    rules={aliasRules}
                    render={({ field }) => (
                        <Input
                            {...field}
                            label="Workspace Alias"
                            required
                            autoComplete="off"
                            error={errors.alias?.message}
                        />
                    )}
                />
            </form>
        </Modal>
    );
}
