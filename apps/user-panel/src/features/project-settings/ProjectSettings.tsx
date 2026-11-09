import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, Skeleton } from "antd";
import { CheckOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { LibraryBig } from "lucide-react";
import { AuthBadge, ConfirmModal, Input, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { deleteUserProject, fetchUserProjects, updateUserProject } from "../../store/reducers/userProjectSlice";
import { fetchProjectCollection } from "../../store/reducers/projectCollectionSlice";
import { CollectionFormModal } from "../collections/components/CollectionFormModal";

type FormValues = {
  name: string;
  description: string;
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
    <section className={`rounded-2xl border bg-surface p-5 md:p-6 ${danger ? "border-red-500/40" : "border-line"}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-content">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function ProjectSettings() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // the selected workspace and project come from the scope store, the same values the sidebar pickers change
  const workspaceId = useAppSelector((s) => s.scope.workspaceId);
  const projectId = useAppSelector((s) => s.scope.projectId);
  const pr = useAppSelector((s) => s.userProjects);
  const co = useAppSelector((s) => s.projectCollections);

  // never show another workspace's projects or another project's collections
  const projects = workspaceId != null && pr.loadedWorkspaceId === workspaceId ? pr.items.filter(Boolean) : [];
  const project = projects.find((p) => p.id === projectId);
  const collections = projectId != null && co.loadedProjectId === projectId ? co.items.filter(Boolean) : [];

  const [collectionModal, setCollectionModal] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: { name: "", description: "" }, mode: "onTouched" });

  // make sure the project list is there even when this page is opened first
  useEffect(() => {
    if (workspaceId != null) dispatch(fetchUserProjects({ workspaceId }));
  }, [dispatch, workspaceId]);

  // reload the collections whenever the selected project changes
  useEffect(() => {
    if (projectId != null) dispatch(fetchProjectCollection({ projectId }));
  }, [dispatch, projectId]);

  // refill the form when another project is selected (and after a successful save)
  useEffect(() => {
    if (project) reset({ name: project.name, description: project.description ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.name, project?.description, reset]);

  const save = handleSubmit(async (values) => {
    if (!project) return;
    try {
      await dispatch(updateUserProject({ ...project, name: values.name.trim(), description: values.description.trim() })).unwrap();
      toast.success("Project updated");
    } catch (error) {
      toast.error("Couldn't save changes", { description: getErrorMessage(error) });
    }
  });

  // used by the shared confirmation modal; a failure goes to onError and the dialog stays as the modal decides
  const confirmDelete = async () => {
    if (!project) return;
    await dispatch(deleteUserProject(project.id)).unwrap();
    toast.success(`${project.name} was deleted`);
    setDeleteOpen(false);
    navigate("/projects", { replace: true });
  };

  const handleDeleteError = (error: unknown) => {
    toast.error("Couldn't delete the project", { description: getErrorMessage(error) });
  };

  const deleting = useMemo(() => (project ? pr.deletingIds.includes(project.id) : false), [pr.deletingIds, project]);

  const openCollection = (id: number) => navigate(`/projects/${projectId}/collections/${id}/apis`);

  if (projectId == null) {
    return <Alert type="info" showIcon message="Select a project in the sidebar to see its settings" />;
  }
  if (pr.status === "succeeded" && pr.loadedWorkspaceId === workspaceId && !project) {
    return <Alert type="warning" showIcon message="This project doesn't exist in the selected workspace" />;
  }
  if (!project) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-content">Project settings</h1>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`size-2 rounded-full ${isDirty ? "bg-amber-500" : "bg-emerald-500"}`} />
          {isDirty ? "Unsaved changes" : "Up to date"}
        </span>
      </header>

      <form id="project-form" onSubmit={save} noValidate className="space-y-6">
        <Card title="Name and description">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="name"
              control={control}
              rules={{
                required: "Enter the project name",
                minLength: { value: 2, message: "At least 2 characters" },
                maxLength: { value: 50, message: "At most 50 characters" },
                validate: (v) => v.trim().length >= 2 || "Project name must contain at least 2 characters",
              }}
              render={({ field }) => <Input {...field} label="Project name" required autoComplete="off" error={errors.name?.message} />}
            />
            <Controller
              name="description"
              control={control}
              rules={{ maxLength: { value: 100, message: "At most 100 characters" } }}
              render={({ field }) => <Input {...field} label="Description" autoComplete="off" error={errors.description?.message} />}
            />
          </div>
        </Card>
      </form>

      <Card
        title="Collections"
        aside={
          <Button icon={<PlusOutlined />} onClick={() => setCollectionModal(true)}>
            New collection
          </Button>
        }
      >
        {co.status === "loading" && collections.length === 0 ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : co.status === "failed" && collections.length === 0 ? (
          <Alert
            type="error"
            showIcon
            message="Couldn't load collections"
            description={co.error}
            action={<Button size="small" onClick={() => dispatch(fetchProjectCollection({ projectId, force: true }))}>Try again</Button>}
          />
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted">No collections in this project yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {collections.map((c) => (
              <li key={c.id} className="flex items-center gap-4 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-content/5 text-primary">
                  <LibraryBig className="size-5" />
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="truncate font-medium text-content">{c.name}</div>
                  <AuthBadge required={!!c.required} />
                </div>

                <Button type="text" onClick={() => openCollection(c.id)}>
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-muted">Deleting a collection is done on its own page.</p>
      </Card>

      <Card
        danger
        title="Delete this project"
        aside={
          <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={() => setDeleteOpen(true)}>
            Delete project
          </Button>
        }
      >
        <p className="text-sm text-muted">Removes this project with its collections, endpoints, schemas and variables.</p>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={() => reset({ name: project.name, description: project.description ?? "" })} disabled={!isDirty || pr.saving}>
          Discard
        </Button>
        <Button type="primary" htmlType="submit" form="project-form" icon={<CheckOutlined />} loading={pr.saving} disabled={!isDirty}>
          Save changes
        </Button>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete this project?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">{project.name}</span> and everything in it will be removed.
          </>
        }
        okText="Delete project"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        onError={handleDeleteError}
      />

      <CollectionFormModal open={collectionModal} projectId={projectId} onClose={() => setCollectionModal(false)} />
    </div>
  );
}