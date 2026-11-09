import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, theme } from "antd";
import { ChevronDown, Folder, Layers, LibraryBig, Loader2, Plus, Zap } from "lucide-react";
import { getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../store";
import { createWorkspace } from "../store/reducers/workspaceSlice";
import { fetchUserProjects } from "../store/reducers/userProjectSlice";
import { fetchProjectCollection } from "../store/reducers/projectCollectionSlice";
import { setCollection, setProject, setWorkspace } from "../store/reducers/scopeSlice";
import { userProjectApi } from "../store/services/userProjectApi";
import { projectCollectionsApi } from "../store/services/userProjectCollectionsApi";
import { instantApi } from "../store/services/instantApi";
import type { Workspace } from "../types/workspace";
import type { UserProject, UserProjectInput } from "../types/userProject";
import type { ProjectCollection } from "../types/projectCollection";

type Step = "workspace" | "project" | "collection";

export interface Target {
  workspace?: Workspace;
  project?: UserProject;
  collection?: ProjectCollection;
}

const META = {
  workspace: { label: "Workspace", icon: Layers, placeholder: "New workspace, e.g. Mocka", hint: "Groups your projects." },
  project: { label: "Project", icon: Folder, placeholder: "New project, e.g. Storefront API", hint: "One base URL per project. Every collection and endpoint you create goes inside it." },
  collection: { label: "Collection", icon: LibraryBig, placeholder: "New collection, e.g. Orders", hint: "Groups related endpoints inside the project." },
} as const;

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9_-]/g, "");

interface Props {
  isAuthed: boolean;
  /** Called whenever the selection changes, so the page can show where things are created */
  onChange?: (t: Target) => void;
}

export function InstantApiCard({ isAuthed, onChange }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token } = theme.useToken();

  // the selection is the one in the sidebar (scope store), and the lists are the ones it already loaded
const { workspaceId, projectId, collectionId } = useAppSelector((s) => s.scope);
  const ws = useAppSelector((s) => s.workspaces);
  const pr = useAppSelector((s) => s.userProjects);
  const co = useAppSelector((s) => s.projectCollections);

  const workspaces = ws.items.filter(Boolean);
  const projects = workspaceId != null && pr.loadedWorkspaceId === workspaceId ? pr.items.filter(Boolean) : [];
  const collections = projectId != null && co.loadedProjectId === projectId ? co.items.filter(Boolean) : [];

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const project = projects.find((p) => p.id === projectId);

  // the collection is only chosen here, and defaults to the project's first one
  const collection = collections.find((c) => c.id === collectionId) ?? collections[0];

  const [open, setOpen] = useState<Step | null>(null);
  const [newName, setNewName] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [adding, setAdding] = useState(false);
  const [resource, setResource] = useState("users");
  const [creating, setCreating] = useState(false);

  // tell the page what is selected
  useEffect(() => {
    onChange?.({ workspace, project, collection });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, project?.id, collection?.id]);

  /* ------------------------------ selecting ------------------------------ */
  const goTo = (step: Step | null) => {
    setOpen(step);
    setNewName("");
    setNewAlias("");
  };

  const pickWorkspace = (id: number) => {
    dispatch(setWorkspace(id)); // the project falls back to that workspace's first one
    goTo(null);
  };

  const pickProject = (id: number) => {
    dispatch(setProject(id));
    goTo(null);
  };

const pickCollection = (id: number) => {
  dispatch(setCollection(id));
  goTo(null);
};

  const toggle = (step: Step) => goTo(open === step ? null : step);

  /* ------------------------------- inserting ------------------------------ */
  const add = async () => {
    const name = newName.trim();
    if (!name || !open) return;

    setAdding(true);
    try {
      if (open === "workspace") {
        const alias = newAlias.trim();
        if (!alias) return void toast.warning("Enter a workspace alias");
        const created = await dispatch(createWorkspace({ name, alias })).unwrap();
        pickWorkspace(created.id);
      } else if (open === "project" && workspace) {
        const input = { name, description: "", workspaceId: workspace.id } as UserProjectInput;
        const id = await userProjectApi.create(input); // throws without an id
        await dispatch(fetchUserProjects({ workspaceId: workspace.id, force: true }));
        pickProject(id);
      } else if (open === "collection" && project) {
        const id = await projectCollectionsApi.create({ name, required: false, projectId: project.id });
        await dispatch(fetchProjectCollection({ projectId: project.id, force: true }));
        pickCollection(id);
      }
      setNewName("");
      setNewAlias("");
    } catch (e) {
      toast.error("Couldn't add it", { description: getErrorMessage(e) });
    } finally {
      setAdding(false);
    }
  };

  /* ------------------------------- creating ------------------------------- */
  const create = async () => {
    if (!isAuthed) return navigate("/login");
    // a missing level opens the list for it
    if (!workspace) return goTo("workspace");
    if (!project) return goTo("project");
    if (!collection) return goTo("collection");

    const path = resource.replace(/^\/+/, "").trim(); // no leading slash
    if (!path) return void toast.warning("Enter a resource name");

    setCreating(true);
    try {
      const endpoints = await instantApi.create({ collectionId: collection.id, workspaceId: workspace.id, path });
      // the setup screen refreshes the list and lands on the APIs page
      navigate("/setup", {
        state: {
          projectId: project.id,
          collectionId: collection.id,
          projectName: project.name,
          collectionName: collection.name,
          endpointCount: endpoints.length,
        },
      });
    } catch (e) {
      toast.error("Couldn't create the API", { description: getErrorMessage(e) });
    } finally {
      setCreating(false);
    }
  };

  /* -------------------------------- render -------------------------------- */
  const rows =
    open === "workspace"
      ? workspaces.map((w) => ({
          id: w.id,
          title: w.name,
          sub: [w.type, w.projectsCount != null ? `${w.projectsCount} project${w.projectsCount === 1 ? "" : "s"}` : null].filter(Boolean).join(" · "),
          pick: () => pickWorkspace(w.id),
        }))
      : open === "project"
        ? projects.map((p) => ({ id: p.id, title: p.name, sub: p.description ?? "", pick: () => pickProject(p.id) }))
        : collections.map((c) => ({ id: c.id, title: c.name, sub: c.required ? "Auth required" : "Auth optional", pick: () => pickCollection(c.id) }));

  const selectedId = open === "workspace" ? workspace?.id : open === "project" ? project?.id : collection?.id;
  const busy =
    open === "workspace"
      ? ws.status === "loading"
      : open === "project"
        ? pr.status === "loading" && projects.length === 0
        : co.status === "loading" && collections.length === 0;

  const chip = (step: Step, text?: string) => {
    const Icon = META[step].icon;
    const active = open === step;
    return (
      <button
        type="button"
        onClick={() => toggle(step)}
        aria-expanded={active}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium text-content transition ${
          active ? "border-line bg-content/5" : "border-transparent hover:bg-content/5"
        }`}
      >
        <Icon className="size-4 text-muted" />
        <span className="max-w-[10rem] truncate">{text ?? `Select ${META[step].label.toLowerCase()}`}</span>
        <ChevronDown className={`size-4 text-muted transition-transform ${active ? "rotate-180" : ""}`} />
      </button>
    );
  };

  const slash = <span aria-hidden className="px-0.5 text-muted">/</span>;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-line text-left"
      style={{ background: `color-mix(in srgb, ${token.colorBgContainer} 80%, transparent)` }}
    >
      {/* creates in */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2.5">
        <span className="mr-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">Creates in</span>
        {isAuthed ? (
          <>
            {chip("workspace", workspace?.name)}
            {workspace && (
              <>
                {slash}
                {chip("project", project?.name)}
              </>
            )}
            {project && (
              <>
                {slash}
                {chip("collection", collection?.name)}
              </>
            )}
          </>
        ) : (
          <span className="text-sm text-muted">Sign in to choose a workspace, project and collection</span>
        )}
        <span className="ml-auto hidden text-sm text-muted sm:block">{isAuthed ? "Same as the sidebar" : "Kept when you sign in"}</span>
      </div>

      {/* one list at a time */}
      {isAuthed && open && (
        <div className="border-b border-line p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-content">{META[open].label}</span>
            <Button size="small" onClick={() => goTo(null)}>Done</Button>
          </div>

          <div role="radiogroup" aria-label={META[open].label} className="grid max-h-72 gap-2 overflow-auto">
            {busy ? (
              <div className="grid place-items-center py-8 text-muted"><Loader2 className="size-5 animate-spin" /></div>
            ) : (
              rows.map((r) => {
                const sel = r.id === selectedId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={r.pick}
                    className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-primary/60"
                    style={sel ? { borderColor: token.colorPrimary, background: token.colorPrimaryBg } : undefined}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: sel ? token.colorPrimary : token.colorBorder }}>
                      {sel && <span className="size-2.5 rounded-full" style={{ background: token.colorPrimary }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-content">{r.title}</span>
                      {r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}
                    </span>
                  </button>
                );
              })
            )}
            {!busy && rows.length === 0 && <p className="py-2 text-center text-sm text-muted">Nothing here yet. Add one below.</p>}

            {/* insert */}
            <div className="rounded-xl border border-dashed border-line p-3">
              <div className="flex items-center gap-2">
                <Plus className="size-4 shrink-0 text-muted" />
                <input
                  value={newName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewName(name);
                    if (open === "workspace" && !newAlias) setNewAlias(slug(name));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                  }}
                  placeholder={META[open].placeholder}
                  aria-label={`New ${META[open].label.toLowerCase()} name`}
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-muted"
                />
                <Button size="small" type="primary" loading={adding} disabled={!newName.trim() || (open === "workspace" && !newAlias.trim())} onClick={add}>
                  Add
                </Button>
              </div>

              {open === "workspace" && (
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <span className="shrink-0 text-xs text-muted">Alias</span>
                  <input
                    value={newAlias}
                    onChange={(e) => setNewAlias(slug(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add();
                      }
                    }}
                    placeholder="e.g. mocka"
                    aria-label="Workspace alias"
                    autoComplete="off"
                    className="h-8 min-w-0 flex-1 rounded-lg bg-transparent text-sm text-content outline-none placeholder:text-muted"
                  />
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted">{META[open].hint}</p>
        </div>
      )}

      {/* resource */}
      <div className="flex flex-wrap items-center gap-3 p-3 md:p-4">
        <label htmlFor="resource" className="pl-1 font-mono text-xs uppercase tracking-[0.2em] text-muted">Your resource</label>
        <span className="font-mono text-2xl" style={{ color: token.colorPrimary }}>/</span>
        <input
          id="resource"
          value={resource}
          onChange={(e) => setResource(slug(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="users"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-mono text-xl text-content outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="flex h-12 items-center gap-2 rounded-xl px-5 text-base font-semibold transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          style={{ background: token.colorInfo, color: token.colorTextLightSolid }}
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          Create instant API
        </button>
      </div>
    </div>
  );
}