import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "antd";
import { LoginOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { BarChart3, Braces, FolderKanban, Globe, LibraryBig, Settings, Users } from "lucide-react";

import {
  IconLogo,
  Navbar,
  Sidebar,
  useAppSelector as useSharedSelector,
  usePersistentState,
  type SidebarGroup,
} from "@repo/shared";

import { ScopePicker } from "../components/ScopePicker";
import SidebarCollectionTree from "../components/SidebarCollectionTree";
import { useWorkspaceScope } from "../hooks/useWorkspaceScope";
import { useAppSelector } from "../store";

interface Crumb {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbContext {
  workspace?: string;
  project?: string;
  collection?: string;
  /** the API (e.g. "testingNewApis") of the Data / Schema / Behavior pages */
  api?: string;
  /** the selected endpoint of the APIs page, e.g. "GET /users" */
  endpoint?: string;
  projectId?: number | string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function createBreadcrumbs(pathname: string, navigate: (path: string) => void, context: BreadcrumbContext): Crumb[] {
  const workspace: Crumb[] = context.workspace ? [{ label: context.workspace, onClick: () => navigate("/projects") }] : [];

  const project: Crumb[] = context.project
    ? [{ label: context.project, onClick: () => navigate(`/projects/${context.projectId}/collections`) }]
    : [];

  const staticPages: Record<string, string> = {
    "/settings": "Workspace Settings",
    "/analytics": "Analytics",
    "/global-variables": "Global Variables",
    "/schemas": "Schemas",
    "/project-settings": "Project Settings",
  };

  if (pathname === "/") return [...workspace, ...project];

  if (pathname === "/projects") return [...workspace, { label: "Projects" }];

  if (pathname === "/profile") return [{ label: "Profile" }];

  if (staticPages[pathname]) {
    const isProjectPage = ["/global-variables", "/schemas", "/project-settings"].includes(pathname);
    return [...workspace, ...(isProjectPage ? project : []), { label: staticPages[pathname] }];
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "projects" || !segments[1]) return [{ label: "Dashboard" }];

  const [, projectId, section, collectionId, subsection, apiId, option] = segments;
  const projectPath = `/projects/${projectId}`;
  const collectionsPath = `${projectPath}/collections`;

  const projectBreadcrumb: Crumb[] = context.project
    ? [{ label: context.project, onClick: section ? () => navigate(projectPath) : undefined }]
    : [];

  const breadcrumbs = [...workspace, ...projectBreadcrumb];

  if (!section) return breadcrumbs;

  if (section === "collaborators") return [...breadcrumbs, { label: "Collaborators" }];

  if (section !== "collections") return breadcrumbs;

  breadcrumbs.push({
    label: "Collections",
    onClick: collectionId ? () => navigate(collectionsPath) : undefined,
  });

  const apisPath = `${collectionsPath}/${collectionId}/apis`;

  if (collectionId && context.collection) {
    breadcrumbs.push({
      label: context.collection,
      onClick: subsection ? () => navigate(apisPath) : undefined,
    });
  }

  if (subsection === "apis") {
    const onOption = Boolean(apiId && option); // Data / Schema / Behavior of one API
    // "APIs" links back to the list only while something deeper is open, so it never points at the page you're on
    breadcrumbs.push({ label: "APIs", onClick: onOption || context.endpoint ? () => navigate(apisPath) : undefined });
    if (onOption) {
      breadcrumbs.push({ label: context.api ? `/${context.api}` : `API #${apiId}` }, { label: cap(option!) });
    } else if (context.endpoint) {
      breadcrumbs.push({ label: context.endpoint });
    }
  } else if (subsection) {
    breadcrumbs.push({ label: cap(subsection) });
  }

  return breadcrumbs;
}

export default function UserLayout() {
  const token = useSharedSelector((state) => state.auth.accessToken);
  const isAuthed = Boolean(token);

  const [collapsed, setCollapsed] = usePersistentState("sidebarCollapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const scope = useWorkspaceScope(isAuthed);

  const { workspaces, workspace, projects, project, collections, collection, apis } = scope;

  // the endpoints of the open collection, for the last crumb
  const apiGroups = useAppSelector((state) => state.collectionApis.items);

  const urlProjectId = /^\/projects\/(\d+)/.exec(pathname)?.[1];
  const urlCollectionId = /^\/projects\/\d+\/collections\/(\d+)/.exec(pathname)?.[1];

  // opening /projects/7/... makes project 7 the selected project
  useEffect(() => {
    if (!urlProjectId) return;

    const projectId = Number(urlProjectId);

    if (projectId !== project?.id && projects.some((item) => item.id === projectId)) {
      scope.selectProject(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectId, projects]);

  // opening /projects/7/collections/3/... makes collection 3 the selected collection
  useEffect(() => {
    if (!urlCollectionId) return;

    const collectionId = Number(urlCollectionId);

    if (collectionId !== collection?.id && collections.some((item) => item?.id === collectionId)) {
      scope.selectCollection(collectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCollectionId, collections]);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const routeProjectId = segments[0] === "projects" ? segments[1] : undefined;
    const routeCollectionId = segments[0] === "projects" && segments[2] === "collections" ? segments[3] : undefined;
    const routeApiId = segments[4] === "apis" ? segments[5] : undefined;

    const selectedProject = projects.find((item) => String(item.id) === routeProjectId) ?? project;
    const selectedCollection = collections.find((item) => String(item.id) === routeCollectionId);

    // ?endpoint=94 on the APIs page
    const endpointId = Number(new URLSearchParams(search).get("endpoint"));
    const selectedEndpoint =
      segments[4] === "apis" && endpointId ? apiGroups.flatMap((group) => group.endpoints).find((item) => item.id === endpointId) : undefined;
    const selectedApi = routeApiId ? apiGroups.find((group) => String(group.id) === routeApiId) : undefined;

    return createBreadcrumbs(pathname, navigate, {
      workspace: workspace?.name,
      project: selectedProject?.name,
      projectId: selectedProject?.id,
      collection: selectedCollection?.name,
      api: selectedApi?.name,
      endpoint: selectedEndpoint ? `${selectedEndpoint.method} ${selectedEndpoint.path}` : undefined,
    });
  }, [pathname, search, navigate, workspace?.name, project, projects, collections, apiGroups]);

  const selectWorkspace = (id: number) => {
    scope.selectWorkspace(id);
    if (pathname.startsWith("/projects")) navigate("/projects");
  };

  const selectProject = (id: number) => {
    scope.selectProject(id);
    if (pathname.startsWith("/projects/")) {
      navigate(`/projects/${id}/collections`);
    }
  };

  const newCollection = () => {
    if (!project) return;

    setMobileOpen(false);
    navigate(`/projects/${project.id}/collections`, { state: { openCreate: true } });
  };

  const base = project ? `/projects/${project.id}` : "/projects";

  const groups: SidebarGroup[] = [
    {
      title: "Workspace",
      items: [
        {
          key: "/projects",
          label: "All projects",
          icon: <FolderKanban className="size-4" />,
          badge: projects.length || undefined,
        },
        { key: "/analytics", label: "Analytics", icon: <BarChart3 className="size-4" /> },
        { key: "/settings", label: "Workspace Settings", icon: <Settings className="size-4" /> },
      ],
    },
    {
      title: "Project",
      items: [
        {
          key: "project-picker",
          label: "Project",
          hideWhenCollapsed: true,
          render: () => (
            <ScopePicker
              variant="project"
              options={projects.map((item) => ({
                id: item.id,
                label: item.name,
                sub: item.description || undefined,
              }))}
              value={project?.id}
              onChange={selectProject}
              loading={scope.loadingProjects}
              emptyText="No projects"
            />
          ),
        },
        ...(project
          ? [
              { key: "/global-variables", label: "Global variables", icon: <Globe className="size-4" /> },
              { key: "/schemas", label: "Schemas", icon: <Braces className="size-4" /> },
              { key: `${base}/collaborators`, label: "Collaborators", icon: <Users className="size-4" /> },
              { key: "/project-settings", label: "Project settings", icon: <Settings className="size-4" /> },
            ]
          : []),
      ],
    },
    {
      title: "Collections",
      items: [
        {
          key: `${base}/collections`, // the icon row when the sidebar is collapsed
          label: "Collections",
          icon: <LibraryBig className="size-4" />,
          render: ({ select, query }) => (
            <SidebarCollectionTree
              projectId={project?.id}
              collections={collections.filter(Boolean)}
              selectedId={collection?.id}
              loadingCollections={scope.loadingCollections}
              apis={apis}
              loadingApis={scope.loadingApis}
              query={query}
              pathname={pathname}
              search={search}
              onSelectCollection={scope.selectCollection}
              onNavigate={select}
              onNew={newCollection}
            />
          ),
        },
      ],
    },
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-page">
      {isAuthed && (
        <Sidebar
          groups={groups}
          activeKey={pathname}
          onSelect={navigate}
          brand={{ name: "mocka" }}
          header={({ collapsed: sidebarCollapsed }) => (
            <ScopePicker
              variant="workspace"
              collapsed={sidebarCollapsed}
              options={workspaces.map((item) => ({
                id: item.id,
                label: item.name,
                alias: item.alias,
                sub: item.type ? `${item.type} workspace` : "Workspace",
              }))}
              value={workspace?.id}
              onChange={selectWorkspace}
              loading={scope.loadingWorkspaces}
              emptyText="No workspace"
            />
          )}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          footer="User panel v0.1"
        />
      )}

      {/* the content column scrolls (the shell above is overflow-hidden); the navbar sticks to its top */}
      <div
        className={`flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto md:m-2 md:h-[calc(100dvh-1rem)] ${isAuthed ? "md:ml-0" : ""}`}
      >
        <Navbar
          hideUserMenu
          brand={
            !isAuthed ? (
              <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2" aria-label="Home">
                <IconLogo className="h-6 w-6" />
                <span>Mocka</span>
              </button>
            ) : undefined
          }
          breadcrumbs={isAuthed ? breadcrumbs : undefined}
          leading={
            isAuthed && collapsed ? (
              <>
                <Button
                  className="md:hidden"
                  type="text"
                  shape="circle"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                />
                <Button
                  className="!hidden md:!inline-flex"
                  type="text"
                  shape="circle"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label="Toggle sidebar"
                />
              </>
            ) : undefined
          }
          actions={
            !isAuthed ? (
              <div className="mr-1 flex items-center gap-2">
                <Button type="text" onClick={() => navigate("/signup")}>
                  Sign up
                </Button>
                <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate("/login")}>
                  Login
                </Button>
              </div>
            ) : undefined
          }
        />

        {/* keyed by pathname only, so switching the selected endpoint (?endpoint=) doesn't replay the animation */}
        <main key={pathname} className="flex-1 motion-safe:animate-fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}