import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "antd";
import { BarChartOutlined, DashboardOutlined, FileSearchOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { Navbar, NotificationsButton, Sidebar, usePersistentState, type SidebarGroup } from "@repo/shared";
import { Code, Layers2, Split, Type } from "lucide-react";

/** ★ Edit your menu here. Parents with `children` become expandable; search covers every label. */
const groups: SidebarGroup[] = [
  {
    title: "Overview",
    items: [
      { key: "/", label: "Dashboard", icon: <DashboardOutlined /> },
      { key: "/reports", label: "Reports", icon: <BarChartOutlined /> },
    ],
  },
  {
    title: "Management",
    items: [
      { key: "users", label: "Users", icon: <TeamOutlined />, children: [{ key: "/users", label: "All users" }, { key: "/users/roles", label: "Roles & grants" }] },
      { key: "/audit-log", label: "Audit log", icon: <FileSearchOutlined /> },
    ],
  },
  { title: "Workspace", items: [{ key: "/settings", label: "Settings", icon: <SettingOutlined /> }] },
  {
    title: "Configs",
    items: [
      { key: "/http-codes", label: "Codes", icon: <Code className="size-4" /> },
      { key: "/http-methods", label: "Methods", icon: <Layers2 className="size-4" /> },
      { key: "/content-types", label: "Content types", icon: <Type className="size-4" /> },
      { key: "/protocols", label: "Protocols", icon: <Split className="size-4" /> },
      { key: "/data-types", label: "Data types", icon: <Type className="size-4" /> },
    ]
  },
];

function crumbsFor(path: string, go: (to: string) => void) {
  for (const g of groups)
    for (const it of g.items) {
      if (it.key === path) return [{ label: it.label }];
      const child = it.children?.find((c) => c.key === path);
      if (child) return [{ label: it.label, onClick: () => go(it.children![0].key) }, { label: child.label }];
    }
  return [{ label: "Dashboard" }];
}

// Replace with real data from your API
const sampleNotifications = [
  { id: 1, title: "New user registered", description: "sara@mocka.com joined the workspace", time: "5 min ago", unread: true },
  { id: 2, title: "Role updated", description: "“Support” grants were changed", time: "2 hours ago" },
];

/**
 * Admin layout — "floating panel" style: the sidebar sits on the page background and the content
 * lives in a rounded card (navbar sticks to the top of that card).
 */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = usePersistentState("sidebarCollapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh overflow-hidden bg-page">
      <Sidebar
        groups={groups}
        activeKey={pathname}
        onSelect={navigate}
        brand={{ name: "Admin Portal" }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        footer="Admin panel v0.1"
      />
      <div className="min-w-0 flex-1 md:m-2 md:ml-0">
        <div
          className="flex h-dvh flex-col overflow-y-auto bg-surface md:h-[calc(100dvh-1rem)] md:rounded-2xl md:border md:border-line md:shadow-soft"
          style={{ backgroundImage: "radial-gradient(60% 220px at 50% 0%, rgb(var(--color-primary) / 0.07), transparent)", backgroundRepeat: "no-repeat" }}
        >
          <Navbar
            hideUserMenu
            breadcrumbs={crumbsFor(pathname, navigate)}
            leading={
              <>
                <Button className="md:hidden" type="text" shape="circle" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} aria-label="Open menu" />
                <Button className="!hidden md:!inline-flex" type="text" shape="circle" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar" />
              </>
            }
            actions={<NotificationsButton items={sampleNotifications} />}
          />
          <main key={pathname} className="flex-1 p-6 md:p-8 motion-safe:animate-fade-up">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}