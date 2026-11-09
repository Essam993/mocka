import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Alert, Button, Dropdown, Empty, Input, Modal as AntModal, Skeleton, theme, type MenuProps } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { AuthBadge, getErrorMessage, toast } from "@repo/shared";
import { LibraryBig, MoreVertical, Network } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { CollectionFormModal } from "./components/CollectionFormModal";
import { ProjectCollection } from "../../types/projectCollection";
import { deleteProjectCollection, fetchProjectCollection } from "../../store/reducers/projectCollectionSlice";

export default function ProjectCollections() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: pid } = useParams<{ projectId: string }>();
  const projectId = Number(pid);
  const isValidId = Number.isFinite(projectId);

  const { token } = theme.useToken();
  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds, loadedProjectId } = useAppSelector((s) => s.projectCollections);
  const [modal, setModal] = useState<{ open: boolean; collection?: ProjectCollection }>({ open: false });
  const [search, setSearch] = useState("");

  // never show another project's collections
  const collections = loadedProjectId === projectId ? items : [];

  useEffect(() => {
    if (isValidId) dispatch(fetchProjectCollection({ projectId }));
  }, [dispatch, projectId, isValidId]);

  // arriving from the sidebar "+" opens the create modal once
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setModal({ open: true });
      navigate(".", { replace: true, state: null }); // so a refresh doesn't reopen it
    }
  }, [location.state, navigate]);

  const reload = () => {
    if (isValidId) dispatch(fetchProjectCollection({ projectId, force: true }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? collections.filter((c) => c.name.toLowerCase().includes(q)) : collections;
  }, [collections, search]);

  const base = `/projects/${projectId}/collections`;
  const openApis = (c: ProjectCollection) => navigate(`${base}/${c.id}/apis`);

  const remove = async (c: ProjectCollection) => {
    try {
      await dispatch(deleteProjectCollection(c.id)).unwrap();
      toast.success(`${c.name} was deleted`);
    } catch (e) {
      toast.error("Couldn't delete the collection", { description: getErrorMessage(e) });
    }
  };

  const confirmDelete = (c: ProjectCollection) =>
    AntModal.confirm({
      title: "Delete this collection?",
      content: `${c.name} will be removed from this project.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => remove(c),
    });

  const menuFor = (c: ProjectCollection): MenuProps => ({
    items: [
      { key: "apis", label: "Open APIs", icon: <Network className="size-3.5" /> },
      { key: "edit", label: "Edit", icon: <EditOutlined /> },
      { type: "divider" },
      { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();
      if (key === "apis") openApis(c);
      else if (key === "edit") setModal({ open: true, collection: c });
      else if (key === "delete") confirmDelete(c);
    },
  });

  if (!isValidId) return <Alert type="error" showIcon message="Invalid project id" />;

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-content">Collections</h2>
          <p className="text-sm text-muted">Double-click a collection to open its APIs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search collections…" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-56" />
          <Button icon={<ReloadOutlined />} onClick={reload} loading={status === "loading"} aria-label="Refresh" />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>
            Add collection
          </Button>
        </div>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load collections" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
      )}

      {status === "loading" && collections.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line p-5">
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line py-12">
          <Empty description={search ? `No collections match “${search}”` : "No collections yet"} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const deleting = deletingIds.includes(c.id);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`${c.name}. Double-click or press Enter to open APIs`}
                onDoubleClick={() => openApis(c)}
                onKeyDown={(e) => e.key === "Enter" && openApis(c)}
                className={`group relative flex select-none flex-col gap-3 rounded-2xl border border-line p-4 hover:border-primary focus-visible:outline focus-visible:outline-2 md:p-5 ${
                  deleting ? "pointer-events-none opacity-50" : "cursor-pointer"
                }`}
                style={{ background: token.colorBgContainer }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}>
                    <LibraryBig className="size-5" />
                  </span>
                  <Dropdown menu={menuFor(c)} trigger={["click"]} placement="bottomRight">
                    <Button
                      type="text"
                      shape="circle"
                      aria-label={`Actions for ${c.name}`}
                      icon={<MoreVertical className="size-4" />}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>

                <div className="min-w-0 space-y-2">
                  <h3 className="truncate text-base font-medium text-content">{c.name}</h3>
                  <AuthBadge required={!!c.required} />
                </div>

                <div className="ml-auto mr-2 text-xs text-muted">#{c.id}</div>
              </div>
            );
          })}
        </div>
      )}

      <CollectionFormModal open={modal.open} collection={modal.collection} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </div>
  );
}