import { useState, type ReactNode } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

export interface TreeNode<T = unknown> {
  /** Unique key. Using the route path makes selection and highlighting trivial. */
  key: string;
  label: string;
  /** One icon per category (project / collection / api) */
  icon?: ReactNode;
  /** Shows an arrow even if children are not loaded yet */
  isParent?: boolean;
  children?: TreeNode<T>[];
  data?: T;
}

interface Props<T> {
  nodes: TreeNode<T>[];
  activeKey?: string;
  onSelect: (node: TreeNode<T>) => void;
  /** Called every time a node is expanded. Use it to load (or refresh) its children. */
  onExpand?: (node: TreeNode<T>) => void;
  loadingKeys?: string[];
  defaultOpenKeys?: string[];
}

export function TreeNav<T>({ nodes, activeKey, onSelect, onExpand, loadingKeys = [], defaultOpenKeys = [] }: Props<T>) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(defaultOpenKeys.map((k) => [k, true])));

  const toggle = (n: TreeNode<T>) => {
    const next = !open[n.key];
    setOpen((o) => ({ ...o, [n.key]: next }));
    if (next) onExpand?.(n);
  };

  const renderNode = (n: TreeNode<T>, depth: number) => {
    const isOpen = !!open[n.key];
    const active = n.key === activeKey;
    const loading = loadingKeys.includes(n.key);
    const expandable = n.isParent || !!n.children?.length;

    return (
      <li key={n.key} role="treeitem" aria-expanded={expandable ? isOpen : undefined} aria-selected={active}>
        <div
          className={`flex h-9 items-center rounded-xl text-sm transition-colors ${
            active ? "bg-primary/10 font-medium text-primary ring-1 ring-primary/20" : "text-muted hover:bg-content/5 hover:text-content"
          }`}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          {expandable ? (
            <button
              type="button"
              onClick={() => toggle(n)}
              aria-label={isOpen ? `Collapse ${n.label}` : `Expand ${n.label}`}
              className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-content/10"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronRight className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <button type="button" onClick={() => onSelect(n)} className="flex min-w-0 flex-1 items-center gap-2 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg h-full">
            {n.icon && <span className="grid w-4 shrink-0 place-items-center text-[15px]">{n.icon}</span>}
            <span className="truncate">{n.label}</span>
          </button>
        </div>

        {isOpen && (
          <ul role="group">
            {n.children?.map((c) => renderNode(c, depth + 1))}
            {!loading && n.children?.length === 0 && (
              <li className="h-8 text-xs text-muted flex items-center" style={{ paddingLeft: 4 + (depth + 1) * 14 + 30 }}>
                Empty
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  return <ul role="tree" className="space-y-0.5">{nodes.map((n) => renderNode(n, 0))}</ul>;
}