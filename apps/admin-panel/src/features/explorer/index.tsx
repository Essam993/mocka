import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Alert, Button, Empty, Skeleton } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { ConfirmModal, ExplorerTree, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { explorerWorkspaces } from "../../store/reducers/explorer/explorerWorkspacesSlice";
import { explorerProjects } from "../../store/reducers/explorer/explorerProjectsSlice";
import { explorerCollections } from "../../store/reducers/explorer/explorerCollectionsSlice";
import { deleteEndpoint, explorerApis, insertEndpoint, updateEndpoint } from "../../store/reducers/explorer/explorerApisSlice";
import { EntityFormModal } from "./components/EntityFormModal";
import { ENTITIES, type Kind, type Values } from "./entities";
import { buildTree, type Entity, type ParentKind, type Target, type TreeItem } from "./tree";

interface LoadResult {
  meta: { requestStatus: string; condition?: boolean };
  payload?: unknown;
  error?: { message?: string };
}

interface ModalState {
  open: boolean;
  kind: Kind;
  mode: "create" | "edit";
  /** create: the id of the parent the new item goes under */
  parentId: number;
  /** create: the tree key of that parent, opened after the add */
  parentKey: string | null;
  /** an endpoint needs the collection that holds its API */
  collectionId?: number;
  /** edit: the item being edited */
  entity?: Entity;
  initial?: Values;
  context?: string;
}

const CLOSED: ModalState = { open: false, kind: "workspace", mode: "create", parentId: 0, parentKey: null };

const nameOf = (e: Entity) => (e.kind === "endpoint" ? `${e.item.method} ${e.item.path}` : e.item.name);

const initialOf = (e: Entity): Values => {
  switch (e.kind) {
    case "workspace": return { name: e.item.name, alias: e.item.alias };
    case "project": return { name: e.item.name, description: e.item.description };
    case "collection": return { name: e.item.name, required: e.item.required };
    case "api": return { name: e.item.name, description: e.item.description };
    case "endpoint": return { method: e.item.method, path: e.item.path, description: e.item.description };
  }
};

const WHAT_GOES: Record<Kind, string> = {
  workspace: "and every project, collection and API in it will be permanently deleted.",
  project: "and every collection and API in it will be permanently deleted.",
  collection: "and its APIs will be permanently deleted.",
  api: "and its endpoints will be permanently deleted.",
  endpoint: "will be permanently deleted.",
};

/** a fresh view per user, so switching users never shows another user's tree */
export default function ExplorerPage() {
  const { id } = useParams<{ id: string }>();
  return <Explorer key={id} />;
}

function Explorer() {
  const dispatch = useAppDispatch();
  const { id } = useParams<{ id: string }>();
  const mockaUserId = Number(id);
  const valid = Number.isInteger(mockaUserId) && mockaUserId > 0;

  const W = useAppSelector((s) => s.explorerWorkspaces);
  const P = useAppSelector((s) => s.explorerProjects);
  const C = useAppSelector((s) => s.explorerCollections);
  const A = useAppSelector((s) => s.explorerApis);

  const root = W.byParent[mockaUserId];
  const saving = W.saving || P.saving || C.saving || A.saving;

  const [version, setVersion] = useState(0); // bumping it resets what the tree remembers as loaded
  const [expanded, setExpanded] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>(CLOSED);
  const [pending, setPending] = useState<Entity | null>(null);

  useEffect(() => {
    if (valid) dispatch(explorerWorkspaces.fetchAll({ parentId: mockaUserId }));
  }, [dispatch, valid, mockaUserId]);

  /* -------------------------------- loading -------------------------------- */
  /** loads the children of a workspace, project or collection; failures are reported and thrown so the tree can retry */
  const loadChildren = async (parent: ParentKind, parentId: number, force = false) => {
    const res: LoadResult = await (parent === "workspace"
      ? dispatch(explorerProjects.fetchAll({ parentId, force }))
      : parent === "project"
        ? dispatch(explorerCollections.fetchAll({ parentId, force }))
        : dispatch(explorerApis.fetchAll({ parentId, force })));
    if (res.meta.requestStatus === "rejected" && !res.meta.condition) {
      const msg = typeof res.payload === "string" ? res.payload : (res.error?.message ?? "Request failed");
      toast.error({ workspace: "Couldn't load the projects", project: "Couldn't load the collections", collection: "Couldn't load the APIs" }[parent], { description: msg });
      throw new Error(msg);
    }
  };

  const onLoad = async (node: TreeItem) => {
    const t = node.data;
    if (t?.type !== "entity") return;
    const e = t.entity;
    if (e.kind === "workspace" || e.kind === "project" || e.kind === "collection") await loadChildren(e.kind, e.item.id);
  };

  const onSelect = (node: TreeItem) => {
    const t: Target | undefined = node.data;
    if (t?.type === "retry") loadChildren(t.parent, t.id, true).catch(() => undefined);
  };

  const refresh = () => {
    [explorerWorkspaces, explorerProjects, explorerCollections, explorerApis].forEach((x) => dispatch(x.reset()));
    setExpanded([]);
    setVersion((v) => v + 1);
    dispatch(explorerWorkspaces.fetchAll({ parentId: mockaUserId }));
  };

  /* ------------------------------ add and edit ------------------------------ */
  const openAddWorkspace = () =>
    setModal({ open: true, kind: "workspace", mode: "create", parentId: mockaUserId, parentKey: null, context: "for this user" });

  const openAdd = (parent: Entity) => {
    switch (parent.kind) {
      case "workspace":
        return setModal({ open: true, kind: "project", mode: "create", parentId: parent.item.id, parentKey: `w:${parent.item.id}`, context: `in ${parent.item.name}` });
      case "project":
        return setModal({ open: true, kind: "collection", mode: "create", parentId: parent.item.id, parentKey: `p:${parent.item.id}`, context: `in ${parent.item.name}` });
      case "collection":
        return setModal({ open: true, kind: "api", mode: "create", parentId: parent.item.id, parentKey: `c:${parent.item.id}`, context: `in ${parent.item.name}` });
      case "api":
        return setModal({
          open: true,
          kind: "endpoint",
          mode: "create",
          parentId: parent.item.id,
          parentKey: `a:${parent.item.id}`,
          collectionId: parent.item.collectionId,
          context: `in /${parent.item.name}`,
        });
      default:
    }
  };

  const openEdit = (entity: Entity) =>
    setModal({
      open: true,
      kind: entity.kind,
      mode: "edit",
      parentId: 0,
      parentKey: null,
      entity,
      collectionId: entity.kind === "endpoint" ? entity.collectionId : undefined,
      initial: initialOf(entity),
      context: nameOf(entity),
    });

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  /** throws on failure so the modal keeps its content and shows the message */
  const submitModal = async (v: Values) => {
    const s = (k: string) => String(v[k] ?? "");
    const { kind, mode, parentId, parentKey, collectionId, entity } = modal;

    if (mode === "create") {
      switch (kind) {
        case "workspace":
          await dispatch(explorerWorkspaces.insert({ parentId: mockaUserId, input: { name: s("name"), alias: s("alias") } })).unwrap();
          break;
        case "project":
          await dispatch(explorerProjects.insert({ parentId, input: { name: s("name"), description: s("description") } })).unwrap();
          break;
        case "collection":
          await dispatch(explorerCollections.insert({ parentId, input: { name: s("name"), required: v.required === true } })).unwrap();
          break;
        case "api":
          await dispatch(explorerApis.insert({ parentId, input: { name: s("name"), description: s("description") } })).unwrap();
          break;
        case "endpoint":
          await dispatch(
            insertEndpoint({ collectionId: collectionId!, apiId: parentId, input: { method: s("method"), path: s("path"), description: s("description") } }),
          ).unwrap();
          break;
      }
      toast.success(`${ENTITIES[kind].noun[0].toUpperCase()}${ENTITIES[kind].noun.slice(1)} added`);
      if (parentKey) setExpanded((keys) => (keys.includes(parentKey) ? keys : [...keys, parentKey])); // show what was just added
    } else if (entity) {
      switch (entity.kind) {
        case "workspace":
          await dispatch(explorerWorkspaces.update({ parentId: entity.item.mockaUserId, item: { ...entity.item, name: s("name"), alias: s("alias") } })).unwrap();
          break;
        case "project":
          await dispatch(explorerProjects.update({ parentId: entity.item.workspaceId, item: { ...entity.item, name: s("name"), description: s("description") } })).unwrap();
          break;
        case "collection":
          await dispatch(explorerCollections.update({ parentId: entity.item.projectId, item: { ...entity.item, name: s("name"), required: v.required === true } })).unwrap();
          break;
        case "api":
          await dispatch(explorerApis.update({ parentId: entity.item.collectionId, item: { ...entity.item, name: s("name"), description: s("description") } })).unwrap();
          break;
        case "endpoint":
          await dispatch(
            updateEndpoint({
              collectionId: entity.collectionId,
              endpoint: { ...entity.item, method: s("method").toUpperCase(), path: s("path"), description: s("description") },
            }),
          ).unwrap();
          break;
      }
      toast.success("Saved");
    }
    closeModal();
  };

  /* --------------------------------- delete --------------------------------- */
  /** throws on failure: the confirm dialog reports it through onError */
  const confirmDelete = async () => {
    if (!pending) return;
    switch (pending.kind) {
      case "workspace":
        await dispatch(explorerWorkspaces.remove({ parentId: pending.item.mockaUserId, item: pending.item })).unwrap();
        break;
      case "project":
        await dispatch(explorerProjects.remove({ parentId: pending.item.workspaceId, item: pending.item })).unwrap();
        break;
      case "collection":
        await dispatch(explorerCollections.remove({ parentId: pending.item.projectId, item: pending.item })).unwrap();
        break;
      case "api":
        await dispatch(explorerApis.remove({ parentId: pending.item.collectionId, item: pending.item })).unwrap();
        break;
      case "endpoint":
        await dispatch(deleteEndpoint({ collectionId: pending.collectionId, endpoint: pending.item })).unwrap();
        break;
    }
    toast.success(`${nameOf(pending)} was deleted`);
    setPending(null);
  };

  const nodes = useMemo(
    () => buildTree({ userId: mockaUserId, st: { w: W, p: P, c: C, a: A }, onAdd: openAdd, onEdit: openEdit, onRemove: setPending }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mockaUserId, W, P, C, A],
  );

  /* --------------------------------- render --------------------------------- */
  if (!valid) return <Alert type="error" showIcon message="Invalid user ID" />;

  const initialLoading = !root || (root.status === "loading" && root.items.length === 0);

  return (
    <div className="mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-content">User Workspaces Explorer <span className="text-sm text-primary bg-primary/20 px-2 rounded-md"># {mockaUserId}</span></h2>
          <p className="mt-1 text-sm text-muted">
            Click a row to open it. Hover a row to add something under it, edit it or delete it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={root?.status === "loading"}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddWorkspace}>Add workspace</Button>
        </div>
      </header>

      {root?.status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="Couldn't load the workspaces"
          description={root.error}
          action={<Button size="small" onClick={() => dispatch(explorerWorkspaces.fetchAll({ parentId: mockaUserId, force: true }))}>Try again</Button>}
        />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        {initialLoading && root?.status !== "failed" ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : (
          <ExplorerTree<Target>
            key={version}
            nodes={nodes}
            onLoad={onLoad}
            onSelect={onSelect}
            expandedKeys={expanded}
            onExpandedKeysChange={setExpanded}
            empty={root?.status === "failed" ? null : <Empty description="No workspaces yet" />}
          />
        )}
      </div>

      <EntityFormModal
        open={modal.open}
        kind={modal.kind}
        mode={modal.mode}
        initial={modal.initial}
        context={modal.context}
        busy={saving}
        onSubmit={submitModal}
        onClose={closeModal}
      />

      <ConfirmModal
        open={!!pending}
        title={`Delete this ${pending ? ENTITIES[pending.kind].noun : "item"}?`}
        description="This action cannot be undone."
        content={
          pending && (
            <>
              <span className="font-semibold text-content">{nameOf(pending)}</span> {WHAT_GOES[pending.kind]}
            </>
          )
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
        onError={(error) => toast.error("Couldn't delete", { description: getErrorMessage(error) })}
      />
    </div>
  );
}