
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, Skeleton } from "antd";
import { CheckOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Folder } from "lucide-react";

import {
    ConfirmModal,
    Input,
    getErrorMessage,
    toast,
    useAppSelector as useSharedSelector,
} from "@repo/shared";

import { useAppDispatch, useAppSelector } from "../../store";
import {
    deleteWorkspace,
    fetchWorkspaces,
    updateWorkspace,
} from "../../store/reducers/workspaceSlice";
import { fetchUserProjects } from "../../store/reducers/userProjectSlice";
import { setProject } from "../../store/reducers/scopeSlice";
import { UserProjectFormModal } from "../user-projects/components/UserProjectFormModal";

type FormValues = {
    name: string;
};

function Card({
    title,
    aside,
    children,
    danger,
}: {
    title: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <section
            className={`rounded-2xl border bg-surface p-5 md:p-6 ${danger ? "border-red-500/40" : "border-line"
                }`}
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-content">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

export default function WorkspaceSettings() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const me = useSharedSelector((s) => s.auth.user);

    // The selected workspace comes from the shared scope store.
    const workspaceId = useAppSelector((s) => s.scope.workspaceId);
    const ws = useAppSelector((s) => s.workspaces);
    const pr = useAppSelector((s) => s.userProjects);

    const workspace = ws.items.find((w) => w.id === workspaceId);

    // Never show another workspace's projects.
    const projects =
        workspaceId != null && pr.loadedWorkspaceId === workspaceId
            ? pr.items.filter(Boolean)
            : [];

    const [projectModal, setProjectModal] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<FormValues>({
        defaultValues: { name: "" },
        mode: "onTouched",
    });

    useEffect(() => {
        dispatch(fetchWorkspaces());
    }, [dispatch]);

    // Reload projects whenever the selected workspace changes.
    useEffect(() => {
        if (workspaceId != null) {
            dispatch(fetchUserProjects({ workspaceId }));
        }
    }, [dispatch, workspaceId]);

    // Refill the form when the selected workspace changes.
    useEffect(() => {
        if (workspace) {
            reset({ name: workspace.name });
        }
    }, [workspace?.id, workspace?.name, reset]);

    const save = handleSubmit(async (values) => {
        if (!workspace) return;

        try {
            await dispatch(
                updateWorkspace({
                    ...workspace,
                    name: values.name.trim(),
                })
            ).unwrap();

            toast.success("Workspace updated");
        } catch (error) {
            toast.error("Couldn't save changes", {
                description: getErrorMessage(error),
            });
        }
    });

    // Delete the workspace using the shared confirmation modal.
    const confirmDelete = async () => {
        if (!workspace) return;

        await dispatch(deleteWorkspace(workspace.id)).unwrap();

        toast.success(`${workspace.name} was deleted`);
    };

    const handleDeleteError = (error: unknown) => {
        toast.error("Couldn't delete the workspace", {
            description: getErrorMessage(error),
        });
    };


    const openProject = (id: number) => {
        dispatch(setProject(id));
        navigate(`/projects/${id}/collections`);
    };

    const deleting = useMemo(
        () =>
            workspace
                ? ws.deletingIds.includes(workspace.id)
                : false,
        [ws.deletingIds, workspace]
    );

    if (ws.status === "succeeded" && ws.items.length === 0) {
        return (
            <Alert
                type="info"
                showIcon
                message="You don't have a workspace yet"
                description="Create one from the home page."
            />
        );
    }

    if (!workspace) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
            <header className="flex items-center justify-between gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-content">
                    Workspace settings
                </h1>

                <span className="flex items-center gap-2 text-sm text-muted">
                    <span
                        className={`size-2 rounded-full ${isDirty ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                    />
                    {isDirty ? "Unsaved changes" : "Up to date"}
                </span>
            </header>

            <form
                id="workspace-form"
                onSubmit={save}
                noValidate
                className="space-y-6"
            >
                <Card title="Name">
                    <Controller
                        name="name"
                        control={control}
                        rules={{
                            required: "Enter the workspace name",
                            minLength: {
                                value: 2,
                                message: "At least 2 characters",
                            },
                            maxLength: {
                                value: 50,
                                message: "At most 50 characters",
                            },
                            validate: (value) =>
                                value.trim().length >= 2 ||
                                "Workspace name must contain at least 2 characters",
                        }}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Workspace name"
                                required
                                autoComplete="off"
                                error={errors.name?.message}
                            />
                        )}
                    />
                </Card>
            </form>

            <Card
                title="Projects"
                aside={
                    <Button
                        icon={<PlusOutlined />}
                        onClick={() => setProjectModal(true)}
                    >
                        New project
                    </Button>
                }
            >
                {pr.status === "loading" && projects.length === 0 ? (
                    <Skeleton active paragraph={{ rows: 2 }} />
                ) : projects.length === 0 ? (
                    <p className="text-sm text-muted">
                        No projects in this workspace yet.
                    </p>
                ) : (
                    <ul className="divide-y divide-line">
                        {projects.map((project) => (
                            <li
                                key={project.id}
                                className="flex items-center gap-4 py-4"
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-content/5 text-primary">
                                    <Folder className="size-5" />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium text-content">
                                        {project.name}
                                    </div>
                                    <div className="truncate text-sm text-muted">
                                        {project.description || "No description"}
                                    </div>
                                </div>

                                <Button
                                    type="text"
                                    onClick={() => openProject(project.id)}
                                >
                                    Open
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="mt-4 text-sm text-muted">
                    Deleting a project is done on its own page.
                </p>
            </Card>

            <Card
                title="Members"
                aside={
                    <span className="rounded-full bg-content/5 px-3 py-1 text-sm text-muted">
                        Coming after sign-in
                    </span>
                }
            >
                <div className="flex items-center gap-4">
                    <span className="grid size-11 place-items-center rounded-full bg-content/10 text-sm font-semibold text-content">
                        {`${me?.firstname?.[0] ?? ""}${me?.lastname?.[0] ?? ""
                            }`.toUpperCase() || "?"}
                    </span>

                    <div>
                        <div className="font-medium text-content">
                            {me
                                ? `${me.firstname} ${me.lastname}`
                                : "You"}
                        </div>
                        <div className="text-sm text-muted">
                            Owner · can change everything in this workspace
                        </div>
                    </div>
                </div>

                <p className="mt-4 text-sm text-muted">
                    Inviting people and roles (admin, editor, viewer) will
                    come later. For now this workspace has one owner.
                </p>
            </Card>

            <Card
                danger
                title="Delete this workspace"
                aside={
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleting}
                        onClick={() => setDeleteModalOpen(true)}
                    >
                        Delete workspace
                    </Button>
                }
            >
                <p className="text-sm text-muted">
                    Removes every project in this workspace, with its
                    collections, endpoints and records.
                </p>
            </Card>

            <div className="flex justify-end gap-2">
                <Button
                    onClick={() => reset({ name: workspace.name })}
                    disabled={!isDirty || ws.saving}
                >
                    Discard
                </Button>

                <Button
                    type="primary"
                    htmlType="submit"
                    form="workspace-form"
                    icon={<CheckOutlined />}
                    loading={ws.saving}
                    disabled={!isDirty}
                >
                    Save changes
                </Button>
            </div>

            <ConfirmModal
                open={deleteModalOpen}
                title="Delete this workspace?"
                description="This action cannot be undone."
                content={
                    <>
                        <span className="font-semibold text-content">
                            {workspace.name}
                        </span>{" "}
                        and every project in it will be removed.
                    </>
                }
                okText="Delete workspace"
                cancelText="Cancel"
                danger
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
                onError={handleDeleteError}
            />

            <UserProjectFormModal
                open={projectModal}
                onClose={() => setProjectModal(false)}
            />

        </div>
    );
}
