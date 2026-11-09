import { Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Building2, Code, Folder, Layers, LibraryBig, RefreshCw } from "lucide-react";
import type { ExplorerNode } from "@repo/shared";
import type { ExplorerApi, ExplorerCollection, ExplorerEndpoint, ExplorerProject, ExplorerWorkspace } from "../../types/explorer";
import { Bucket, LevelState } from "../../store/reducers/levelSlice";

export type ParentKind = "workspace" | "project" | "collection";

export type Entity =
  | { kind: "workspace"; item: ExplorerWorkspace }
  | { kind: "project"; item: ExplorerProject }
  | { kind: "collection"; item: ExplorerCollection }
  | { kind: "api"; item: ExplorerApi }
  | { kind: "endpoint"; item: ExplorerEndpoint; collectionId: number };

export type Target = { type: "entity"; entity: Entity } | { type: "retry"; parent: ParentKind; id: number } | { type: "empty" };
export type TreeItem = ExplorerNode<Target>;

export interface TreeCtx {
  userId: number;
  st: {
    w: LevelState<ExplorerWorkspace>;
    p: LevelState<ExplorerProject>;
    c: LevelState<ExplorerCollection>;
    a: LevelState<ExplorerApi>;
  };
  /** adds a child under this node (a project under a workspace, an endpoint under an API…) */
  onAdd: (parent: Entity) => void;
  onEdit: (entity: Entity) => void;
  onRemove: (entity: Entity) => void;
}

const METHOD_COLOR: Record<string, string> = { GET: "blue", POST: "green", PUT: "orange", PATCH: "purple", DELETE: "red" };
const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const rank = (m: string) => {
  const i = METHOD_ORDER.indexOf(m);
  return i < 0 ? METHOD_ORDER.length : i;
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const MethodTag = ({ method }: { method: string }) => (
  <Tag color={METHOD_COLOR[method] ?? "default"} className="!m-0 min-w-[3.75rem] text-center font-mono text-xs font-semibold">
    {method}
  </Tag>
);

interface Actions {
  /** e.g. ["project", fn] → an "Add project" button */
  add?: [string, () => void];
  edit: () => void;
  remove: () => void;
}

const rowActions = (name: string, busy: boolean, a: Actions) => (
  <>
    {a.add && (
      <Tooltip title={`Add ${a.add[0]}`}>
        <Button type="text" size="small" shape="circle" icon={<PlusOutlined />} aria-label={`Add ${a.add[0]} to ${name}`} onClick={a.add[1]} />
      </Tooltip>
    )}
    <Tooltip title="Edit">
      <Button type="text" size="small" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${name}`} onClick={a.edit} />
    </Tooltip>
    <Tooltip title="Delete">
      <Button type="text" size="small" shape="circle" danger icon={<DeleteOutlined />} aria-label={`Delete ${name}`} loading={busy} onClick={a.remove} />
    </Tooltip>
  </>
);

const emptyItem = (key: string, label: string): TreeItem => ({
  key,
  label,
  title: <span className="text-muted">{label}</span>,
  isLeaf: true,
  disabled: true,
  data: { type: "empty" },
});

const retryItem = (key: string, parent: ParentKind, id: number, error?: string | null): TreeItem => ({
  key,
  label: "Couldn't load. Click to try again",
  title: <span className="text-red-500" title={error ?? undefined}>Couldn't load. Click to try again</span>,
  icon: <RefreshCw className="size-4 text-red-500" />,
  isLeaf: true,
  data: { type: "retry", parent, id },
});

/** the children of a node from what is loaded: undefined = not loaded yet (or loading) */
function childrenOf<T>(b: Bucket<T> | undefined, make: (x: T) => TreeItem, emptyKey: string, emptyLabel: string, retry: () => TreeItem): TreeItem[] | undefined {
  if (!b) return undefined;
  if (b.items.length > 0) return b.items.map(make);
  if (b.status === "failed") return [retry()];
  if (b.status === "succeeded") return [emptyItem(emptyKey, emptyLabel)];
  return undefined;
}

export function buildTree(ctx: TreeCtx): TreeItem[] {
  const { st, userId } = ctx;
  const tag = (list: string[], id: number | string) => list.includes(String(id));

  const endpointNode = (e: ExplorerEndpoint, collectionId: number): TreeItem => {
    const entity: Entity = { kind: "endpoint", item: e, collectionId };
    const busy = tag(st.a.deleting, `e${e.id}`);
    return {
      key: `e:${e.id}`,
      label: `${e.method} ${e.path}`,
      icon: <Code className="size-4 text-muted" />,
      isLeaf: true,
      title: (
        <span className={`flex min-w-0 items-center gap-2 ${busy ? "opacity-50" : ""}`} title={e.description || undefined}>
          <MethodTag method={e.method} />
          <span className="truncate font-mono text-sm">{e.path}</span>
        </span>
      ),
      actions: rowActions(`${e.method} ${e.path}`, busy, { edit: () => ctx.onEdit(entity), remove: () => ctx.onRemove(entity) }),
      data: { type: "entity", entity },
    };
  };

  const apiNode = (a: ExplorerApi): TreeItem => {
    const entity: Entity = { kind: "api", item: a };
    const busy = tag(st.a.deleting, a.id);
    const endpoints = [...a.endpoints].sort((x, y) => x.path.localeCompare(y.path) || rank(x.method) - rank(y.method));
    return {
      key: `a:${a.id}`,
      label: a.name,
      icon: <Layers className="size-4 text-violet-500" />,
      title: <span className={`font-mono text-sm ${busy ? "opacity-50" : ""}`}>/{a.name}</span>,
      extra: plural(endpoints.length, "endpoint"),
      actions: rowActions(a.name, busy, { add: ["endpoint", () => ctx.onAdd(entity)], edit: () => ctx.onEdit(entity), remove: () => ctx.onRemove(entity) }),
      isLeaf: endpoints.length === 0 ? true : undefined,
      children: endpoints.length > 0 ? endpoints.map((e) => endpointNode(e, a.collectionId)) : undefined,
      data: { type: "entity", entity },
    };
  };

  const collectionNode = (c: ExplorerCollection): TreeItem => {
    const entity: Entity = { kind: "collection", item: c };
    const busy = tag(st.c.deleting, c.id);
    const b = st.a.byParent[c.id];
    const auth = c.required ? "Auth required" : "Auth optional";
    return {
      key: `c:${c.id}`,
      label: c.name,
      icon: <LibraryBig className="size-4 text-primary" />,
      title: <span className={`font-medium ${busy ? "opacity-50" : ""}`}>{c.name}</span>,
      extra: b?.status === "succeeded" ? `${plural(b.items.length, "API")} · ${auth}` : auth,
      actions: rowActions(c.name, busy, { add: ["API", () => ctx.onAdd(entity)], edit: () => ctx.onEdit(entity), remove: () => ctx.onRemove(entity) }),
      children: childrenOf(b, apiNode, `c:${c.id}:empty`, "No APIs yet", () => retryItem(`c:${c.id}:retry`, "collection", c.id, b?.error)),
      data: { type: "entity", entity },
    };
  };

  const projectNode = (p: ExplorerProject): TreeItem => {
    const entity: Entity = { kind: "project", item: p };
    const busy = tag(st.p.deleting, p.id);
    const b = st.c.byParent[p.id];
    return {
      key: `p:${p.id}`,
      label: p.name,
      icon: <Folder className="size-4 text-primary" />,
      title: (
        <span className={`flex min-w-0 items-baseline gap-2 ${busy ? "opacity-50" : ""}`}>
          <span className="shrink-0 font-medium">{p.name}</span>
          {p.description && <span className="truncate text-xs text-muted">{p.description}</span>}
        </span>
      ),
      extra: b?.status === "succeeded" ? plural(b.items.length, "collection") : undefined,
      actions: rowActions(p.name, busy, { add: ["collection", () => ctx.onAdd(entity)], edit: () => ctx.onEdit(entity), remove: () => ctx.onRemove(entity) }),
      children: childrenOf(b, collectionNode, `p:${p.id}:empty`, "No collections yet", () => retryItem(`p:${p.id}:retry`, "project", p.id, b?.error)),
      data: { type: "entity", entity },
    };
  };

  const workspaceNode = (w: ExplorerWorkspace): TreeItem => {
    const entity: Entity = { kind: "workspace", item: w };
    const busy = tag(st.w.deleting, w.id);
    const b = st.p.byParent[w.id];
    return {
      key: `w:${w.id}`,
      label: w.name,
      icon: <Building2 className="size-4 text-primary" />,
      title: (
        <span className={`flex min-w-0 items-baseline gap-2 ${busy ? "opacity-50" : ""}`}>
          <span className="shrink-0 font-semibold">{w.name}</span>
          {w.alias && <span className="truncate font-mono text-xs text-muted">{w.alias}</span>}
        </span>
      ),
      extra: b?.status === "succeeded" ? plural(b.items.length, "project") : undefined,
      actions: rowActions(w.name, busy, { add: ["project", () => ctx.onAdd(entity)], edit: () => ctx.onEdit(entity), remove: () => ctx.onRemove(entity) }),
      children: childrenOf(b, projectNode, `w:${w.id}:empty`, "No projects yet", () => retryItem(`w:${w.id}:retry`, "workspace", w.id, b?.error)),
      data: { type: "entity", entity },
    };
  };

  return (st.w.byParent[userId]?.items ?? []).map(workspaceNode);
}