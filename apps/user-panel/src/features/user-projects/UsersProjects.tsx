import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Dropdown, Empty, Input, Modal as AntModal, Skeleton, theme, type MenuProps } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getErrorMessage, toast } from "@repo/shared";
import { FolderOpenDot, LibraryBig, MoreVertical, Users } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { UserProjectFormModal } from "./components/UserProjectFormModal";
import { UserProject } from "../../types/userProject";
import { deleteUserProject, fetchUserProjects } from "../../store/reducers/userProjectSlice";
import { setProject } from "../../store/reducers/scopeSlice";

const BASE = "/projects";

export default function UsersProjects() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const dispatch = useAppDispatch();
  const workspaceId = useAppSelector((s) => s.scope.workspaceId);
  const { items, status, error, deletingIds, loadedWorkspaceId } = useAppSelector((s) => s.userProjects);
  const [modal, setModal] = useState<{ open: boolean; project?: UserProject }>({ open: false });
  const [search, setSearch] = useState("");

  // never show another workspace's projects
const projects = loadedWorkspaceId === workspaceId ? items.filter(Boolean) : [];

  useEffect(() => {
    if (workspaceId != null) dispatch(fetchUserProjects({ workspaceId }));
  }, [dispatch, workspaceId]);

  const reload = () => {
    if (workspaceId != null) dispatch(fetchUserProjects({ workspaceId, force: true }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [projects, search]);

  const openProject = (p: UserProject) => {
    dispatch(setProject(p.id)); // the sidebar follows
    navigate(`${BASE}/${p.id}/collections`);
  };

  const remove = async (p: UserProject) => {
    try {
      await dispatch(deleteUserProject(p.id)).unwrap();
      toast.success(`${p.name} was deleted`);
    } catch (e) {
      toast.error("Couldn't delete the project", { description: getErrorMessage(e) });
    }
  };

  const confirmDelete = (p: UserProject) =>
    AntModal.confirm({
      title: "Delete this project?",
      content: `${p.name} will be removed from your projects.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => remove(p),
    });

  const menuFor = (p: UserProject): MenuProps => ({
    items: [
      { key: "open", label: "Open collections", icon: <LibraryBig className="size-3.5" /> },
      { key: "edit", label: "Edit", icon: <EditOutlined /> },
      { key: "collaborators", label: "Collaborators", icon: <Users className="size-3.5" /> },
      { type: "divider" },
      { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();
      if (key === "open") openProject(p);
      else if (key === "edit") setModal({ open: true, project: p });
      else if (key === "collaborators") {
        dispatch(setProject(p.id));
        navigate(`${BASE}/${p.id}/collaborators`);
      } else if (key === "delete") confirmDelete(p);
    },
  });

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-content">Projects</h2>
          <p className="text-sm text-muted">Double-click a project to open its collections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-56" />
          <Button icon={<ReloadOutlined />} onClick={reload} loading={status === "loading"} aria-label="Refresh" />
          <Button type="primary" icon={<PlusOutlined />} disabled={workspaceId == null} onClick={() => setModal({ open: true })}>
            Add project
          </Button>
        </div>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load projects" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
      )}

      {status === "loading" && projects.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line p-5">
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line py-12">
          <Empty description={search ? `No projects match “${search}”` : "No projects in this workspace yet"} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const deleting = deletingIds?.includes(p?.id);
            return (
              <div
                key={p?.id}
                role="button"
                tabIndex={0}
                aria-label={`${p?.name}. Double-click or press Enter to open collections`}
                onDoubleClick={() => openProject(p)}
                onKeyDown={(e) => e.key === "Enter" && openProject(p)}
                className={`group relative flex select-none flex-col gap-3 rounded-2xl border border-line p-4 hover:border-primary focus-visible:outline focus-visible:outline-2 md:p-5 ${
                  deleting ? "pointer-events-none opacity-50" : "cursor-pointer"
                }`}
                style={{ background: token.colorBgContainer }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}>
                    <FolderOpenDot className="size-5" />
                  </span>
                  <Dropdown menu={menuFor(p)} trigger={["click"]} placement="bottomRight">
                    <Button
                      type="text"
                      shape="circle"
                      aria-label={`Actions for ${p?.name}`}
                      icon={<MoreVertical className="size-4" />}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-medium text-content">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted">{p.description || "No description"}</p>
                </div>

                <div className="ml-auto mr-2 text-xs text-muted">#{p.id}</div>
              </div>
            );
          })}
        </div>
      )}

      <UserProjectFormModal open={modal.open} project={modal.project} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </div>
  );
}