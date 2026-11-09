import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Avatar, Drawer, Popover, Tooltip } from "antd";
import { CloseCircleFilled, DownOutlined, LogoutOutlined, MenuFoldOutlined, SearchOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../auth/authSlice";
import { IconLogo } from "./Icons/IconLogo";
import { useNavigate } from "react-router";

export interface SidebarItem {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children?: SidebarItem[];
  /** Custom content. `query` is the sidebar search text so the content can filter itself. */
  render?: (ctx: { select: (key: string) => void; query: string }) => ReactNode;
  /** With `render`: hide the item when the sidebar is collapsed (otherwise it shows as an icon row) */
  hideWhenCollapsed?: boolean;
}
export interface SidebarGroup {
  title?: string;
  /** Small control on the right of the group title, e.g. a "+" button */
  action?: ReactNode;
  items: SidebarItem[];
}
export interface SidebarProps {
  groups: SidebarGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  brand: { name: string; subName?: string; mark?: ReactNode };
  /** Rendered between the brand and the search box (e.g. a workspace picker) */
  header?: (ctx: { collapsed: boolean }) => ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Mobile drawer state (the sidebar is a drawer below the md breakpoint) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Extra content above the user card */
  footer?: ReactNode;
}

/* ---------- search helpers ---------- */
const has = (label: string, q: string) => label.toLowerCase().includes(q);

function filterGroups(groups: SidebarGroup[], q: string): SidebarGroup[] {
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.flatMap((it): SidebarItem[] => {
        if (it.render) return [it]; // custom items filter themselves using `query`
        if (!it.children) return has(it.label, q) ? [it] : [];
        if (has(it.label, q)) return [it]; // parent matches → keep all children
        const kids = it.children.filter((c) => has(c.label, q));
        return kids.length ? [{ ...it, children: kids }] : [];
      }),
    }))
    .filter((g) => g.items.length);
}
// custom items are not part of keyboard navigation
const leaves = (groups: SidebarGroup[]) => groups.flatMap((g) => g.items.filter((i) => !i.render).flatMap((i) => i.children ?? [i]));

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary/25 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/* ---------- one row ---------- */
interface RowProps {
  item: SidebarItem;
  active: boolean;
  cursor: boolean;
  collapsed: boolean;
  depth?: number;
  q: string;
  onClick: () => void;
  trailing?: ReactNode;
}
function Row({ item, active, cursor, collapsed, depth = 0, q, onClick, trailing }: RowProps) {
  const base = "relative rounded-lg";

  const state = active
    ? "bg-primary/30 text-white font-medium ring-1 ring-primary/20 " +
    "before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 " +
    "before:h-5 before:w-1 before:w-0.5 before:rounded-full before:bg-primary"
    : "text-muted hover:bg-content/5 hover:text-content"; 
    
    const btn = (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`relative flex w-full items-center rounded-xl text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 ${collapsed ? "h-11 justify-center" : `${depth ? "h-9" : "h-9"} gap-3 px-3`
          } ${state} ${cursor ? "bg-content/5 ring-1 ring-primary/50" : ""}`}
      >
        {item.icon && <span className={`grid w-5 shrink-0 place-items-center text-[17px] ${active ? "text-primary" : ""}`}>{item.icon}</span>}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">
              <Highlight text={item.label} q={q} />
            </span>
            {item.badge != null && <span className="rounded-full bg-primary/15 px-2 text-xs font-medium text-primary">{item.badge}</span>}
            {trailing}
          </>
        )}
      </button>
    );
  return collapsed ? <Tooltip placement="right" title={item.label}>{btn}</Tooltip> : btn;
}

/* ---------- content (used by desktop aside and mobile drawer) ---------- */
interface BodyProps extends SidebarProps {
  collapsed: boolean;
  enableShortcut: boolean;
  onAfterSelect?: () => void;
}
function SidebarBody({ groups, activeKey, onSelect, brand, header, collapsed, onToggleCollapse, footer, enableShortcut, onAfterSelect }: BodyProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const focusAfterExpand = useRef(false);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => filterGroups(groups, q), [groups, q]);
  const flat = useMemo(() => leaves(visible), [visible]);

  const select = (key: string) => {
    onSelect(key);
    setQuery("");
    onAfterSelect?.();
  };

  // "/" or Ctrl/Cmd+K focuses the search (expands the sidebar first if it's collapsed)
  const focusSearch = () => {
    if (collapsed) {
      focusAfterExpand.current = true;
      onToggleCollapse?.();
    } else inputRef.current?.focus();
  };
  useEffect(() => {
    if (!collapsed && focusAfterExpand.current) {
      focusAfterExpand.current = false;
      inputRef.current?.focus();
    }
  }, [collapsed]);
  useEffect(() => {
    if (!enableShortcut) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setCursor((c) => Math.min(c + 1, flat.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setCursor((c) => Math.max(c - 1, 0)));
    else if (e.key === "Enter" && flat[cursor]) select(flat[cursor].key);
    else if (e.key === "Escape") (query ? setQuery("") : inputRef.current?.blur());
  };

  const containsActive = (it: SidebarItem) => it.children?.some((c) => c.key === activeKey) ?? false;
  const isOpen = (it: SidebarItem) => !!q || (openKeys[it.key] ?? containsActive(it));
  const initials = user ? `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase() : "";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-primary/5 rounded-2xl border filter backdrop-blur m-3">
      {/* brand */}
      <div className={`flex h-20 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between pl-5 pr-3"}`}>
        <button type="button" onClick={() => navigate("/")} aria-label="Home"
          className={`flex hover:cursor-pointer items-center gap-2 ${collapsed ? "cursor-pointer" : "cursor-default"}`}>
          <IconLogo className={`size-5 ${collapsed ? "mx-auto" : ""}`} />
          {!collapsed && <div className="flex flex-col leading-tight text-left">
            <span className="truncate text-xl font-semibold text-content">{brand.name}</span>
            <span className="truncate text-xs font-normal text-muted">{brand.subName}</span>
          </div>}
        </button>
        {!collapsed && onToggleCollapse && (
          <Tooltip title="Collapse sidebar">
            <button type="button" onClick={onToggleCollapse} aria-label="Collapse sidebar" className="hidden h-8 w-8 place-items-center rounded-md text-muted hover:bg-content/5 hover:text-content md:grid">
              <MenuFoldOutlined />
            </button>
          </Tooltip>
        )}
      </div>

      {/* workspace picker slot */}
      {header && <div className="shrink-0 px-3 pb-1">{header({ collapsed })}</div>}

      {/* search */}
      <div className="shrink-0 p-3">
        {collapsed ? (
          <Tooltip placement="right" title="Search (/)">
            <button type="button" onClick={focusSearch} aria-label="Search menu" className="grid h-11 w-full place-items-center rounded-lg text-muted hover:bg-content/5 hover:text-content">
              <SearchOutlined className="text-[17px]" />
            </button>
          </Tooltip>
        ) : (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <SearchOutlined className="text-muted" />
            <input
              ref={inputRef}
              role="searchbox"
              aria-label="Search menu"
              value={query}
              onChange={(e) => (setQuery(e.target.value), setCursor(0))}
              onKeyDown={onSearchKey}
              placeholder="Search menu"
              className="min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-muted"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => (setQuery(""), inputRef.current?.focus())} className="text-muted hover:text-content">
                <CloseCircleFilled />
              </button>
            ) : (
              <kbd className="rounded border border-line px-1.5 text-[11px] leading-5 text-muted">/</kbd>
            )}
          </div>
        )}
      </div>

      {/* navigation */}
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {visible.map((g, gi) => (
          <div key={g.title ?? gi}>
            {g.title && !collapsed && (
              <div className="flex items-center justify-between px-3 pb-1 pt-4 text-xs font-medium text-muted font-mono uppercase tracking-[0.2em] mt-2">
                <span>{g.title}</span>
                {g.action}
              </div>
            )}
            {collapsed && gi > 0 && <div className="mx-3 my-3 h-px bg-line" />}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                if (it.render) {
                  if (!collapsed) return <div key={it.key}>{it.render({ select, query: q })}</div>;
                  if (it.hideWhenCollapsed) return null;
                  // collapsed: falls through and renders as a normal icon row
                }
                if (!it.children) {
                  return <Row key={it.key} item={it} active={it.key === activeKey} cursor={!!q && flat[cursor]?.key === it.key} collapsed={collapsed} q={q} onClick={() => select(it.key)} />;
                }
                const open = isOpen(it);
                const parent = (
                  <Row item={it} active={containsActive(it) && collapsed} cursor={false} collapsed={collapsed} q={q}
                    onClick={() => !collapsed && setOpenKeys((o) => ({ ...o, [it.key]: !open }))}
                    trailing={<DownOutlined className={`text-[10px] text-muted transition-transform ${open ? "rotate-180" : ""}`} />} />
                );
                return (
                  <div key={it.key}>
                    {collapsed ? (
                      <Popover placement="rightTop" arrow={false} styles={{ body: { padding: 6 } }}
                        content={
                          <div className="flex min-w-40 flex-col gap-0.5">
                            <div className="px-3 py-1 text-xs font-medium text-muted">{it.label}</div>
                            {it.children.map((c) => (
                              <button key={c.key} type="button" onClick={() => select(c.key)}
                                className={`h-9 rounded-md px-3 text-left text-sm ${c.key === activeKey ? "bg-primary/10 font-medium text-primary" : "text-content hover:bg-content/5"}`}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                        }>
                        <div>{parent}</div>
                      </Popover>
                    ) : (
                      parent
                    )}
                    {open && !collapsed && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-line pl-2">
                        {it.children.map((c) => (
                          <Row key={c.key} item={c} depth={1} active={c.key === activeKey} cursor={!!q && flat[cursor]?.key === c.key} collapsed={false} q={q} onClick={() => select(c.key)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {q && flat.length === 0 && !collapsed && (
          <div className="px-3 py-10 text-center text-sm text-muted">
            Nothing matches “{query.trim()}”
            <button type="button" onClick={() => setQuery("")} className="mt-2 block w-full text-primary hover:underline">Clear search</button>
          </div>
        )}
      </nav>

      {/* footer + user */}
      <div className="shrink-0 p-3">
        {footer && !collapsed && <div className="mb-2 px-2 text-xs text-muted">{footer}</div>}
        {user &&
          (collapsed ? (
            <Popover trigger="click" placement="rightBottom" arrow={false}
              content={
                <button type="button" onClick={() => dispatch(logout())} className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-red-500 hover:bg-red-500/10">
                  <LogoutOutlined /> Sign out
                </button>
              }>
              <button type="button" aria-label="Account" className="grid h-11 w-full place-items-center rounded-xl hover:bg-surface">
                <Avatar style={{ background: "rgb(var(--color-primary))" }}>{initials}</Avatar>
              </button>
            </Popover>
          ) : (
            <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface hover:shadow-sm">
              <Avatar style={{ background: "rgb(var(--color-primary))" }}>{initials}</Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-medium text-content">{user.firstname} {user.lastname}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
              <Tooltip title="Sign out">
                <button type="button" aria-label="Sign out" onClick={() => dispatch(logout())} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-500">
                  <LogoutOutlined />
                </button>
              </Tooltip>
            </div>
          ))}
      </div>
    </div>
  );
}

/** Desktop: sticky collapsible sidebar. Below md: slide-in drawer (control it with mobileOpen). */
export function Sidebar(props: SidebarProps) {
  const { collapsed = false, mobileOpen = false, onMobileClose } = props;
  return (
    <>
      <aside className={`hidden h-dvh shrink-0 overflow-hidden bg-page transition-[width] duration-200 md:flex ${collapsed ? "w-[76px]" : "w-72"}`}>
        <SidebarBody {...props} collapsed={collapsed} enableShortcut />
      </aside>
      <Drawer placement="left" width={288} open={mobileOpen} onClose={onMobileClose} closable={false} styles={{ body: { padding: 0 } }}>
        <SidebarBody {...props} collapsed={false} enableShortcut={mobileOpen} onAfterSelect={onMobileClose} />
      </Drawer>
    </>
  );
}