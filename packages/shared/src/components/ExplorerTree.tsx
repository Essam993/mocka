import { useMemo, type ReactNode, type SyntheticEvent } from "react";
import { Tree } from "antd";
import type { TreeDataNode } from "antd";

const { DirectoryTree } = Tree;

export interface ExplorerNode<T = unknown> {
  /** unique across the whole tree */
  key: string;
  /** plain text: the default title */
  label: string;
  /** replaces the label (e.g. a method badge + path) */
  title?: ReactNode;
  /** muted text on the right, e.g. "4 endpoints" */
  extra?: ReactNode;
  /** buttons shown on the right when the row is hovered or selected */
  actions?: ReactNode;
  icon?: ReactNode;
  /** true = no arrow and nothing to load */
  isLeaf?: boolean;
  disabled?: boolean;
  /** leave undefined while the children are not loaded yet */
  children?: ExplorerNode<T>[];
  data?: T;
}

export interface ExplorerTreeProps<T = unknown> {
  nodes: ExplorerNode<T>[];
  /** Called the first time a node is expanded and its children are not loaded. Reject to retry on the next expand. */
  onLoad?: (node: ExplorerNode<T>) => Promise<void>;
  onSelect?: (node: ExplorerNode<T>) => void;
  /** omit to let the tree keep the selection itself */
  selectedKey?: string | null;
  /** controlled expansion: pass both, so the page can open nodes (e.g. after adding a child) */
  expandedKeys?: string[];
  onExpandedKeysChange?: (keys: string[]) => void;
  defaultExpandedKeys?: string[];
  /** shown when there are no nodes */
  empty?: ReactNode;
  className?: string;
}

const stop = (e: SyntheticEvent) => e.stopPropagation();

const SKIN = [
  "[&_.ant-tree-node-content-wrapper]:!flex [&_.ant-tree-node-content-wrapper]:!min-h-9 [&_.ant-tree-node-content-wrapper]:!items-center",
  "[&_.ant-tree-title]:!min-w-0 [&_.ant-tree-title]:!flex-1",
  // selected rows get a soft tint instead of antd's solid primary fill
  "[&_.ant-tree-treenode-selected::before]:!bg-primary/10",
  "[&_.ant-tree-treenode-selected_.ant-tree-node-content-wrapper]:!text-content",
  "[&_.ant-tree-treenode-selected_.ant-tree-switcher]:!text-content",
  // row actions appear on hover and on the selected row
  "[&_.ant-tree-treenode:hover_.explorer-actions]:opacity-100",
  "[&_.ant-tree-treenode-selected_.explorer-actions]:opacity-100",
].join(" ");

function toAntd<T>(nodes: ExplorerNode<T>[]): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.key,
    icon: n.icon,
    isLeaf: n.isLeaf,
    disabled: n.disabled,
    children: n.children ? toAntd(n.children) : undefined,
    title: (
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{n.title ?? n.label}</span>
        {n.extra != null && <span className="shrink-0 text-xs text-muted">{n.extra}</span>}
        {n.actions && (
          // clicks and keys on the buttons must not select, expand or navigate the row
          <span
            className="explorer-actions flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 [@media(hover:none)]:opacity-100"
            onClick={stop}
            onDoubleClick={stop}
            onKeyDown={stop}
          >
            {n.actions}
          </span>
        )}
      </span>
    ),
  }));
}

/** A lazy-loading directory tree. Click a row to expand it (and load its children the first time). */
export function ExplorerTree<T = unknown>({
  nodes,
  onLoad,
  onSelect,
  selectedKey,
  expandedKeys,
  onExpandedKeysChange,
  defaultExpandedKeys,
  empty,
  className,
}: ExplorerTreeProps<T>) {
  const treeData = useMemo(() => toAntd(nodes), [nodes]);
  const index = useMemo(() => {
    const map = new Map<string, ExplorerNode<T>>();
    const walk = (list: ExplorerNode<T>[]) =>
      list.forEach((n) => {
        map.set(n.key, n);
        if (n.children) walk(n.children);
      });
    walk(nodes);
    return map;
  }, [nodes]);

  if (nodes.length === 0) return <>{empty ?? null}</>;

  return (
    <DirectoryTree
      className={`${SKIN} ${className ?? ""}`}
      style={{ background: "transparent" }}
      treeData={treeData}
      {...(expandedKeys
        ? { expandedKeys, autoExpandParent: false, onExpand: (keys: React.Key[]) => onExpandedKeysChange?.(keys.map(String)) }
        : { defaultExpandedKeys })}
      {...(selectedKey !== undefined ? { selectedKeys: selectedKey ? [selectedKey] : [] } : {})}
      loadData={
        onLoad
          ? async (treeNode) => {
              const node = index.get(String(treeNode.key));
              if (node) await onLoad(node);
            }
          : undefined
      }
      onSelect={(_, info) => {
        const node = index.get(String(info.node.key));
        if (node) onSelect?.(node);
      }}
    />
  );
}