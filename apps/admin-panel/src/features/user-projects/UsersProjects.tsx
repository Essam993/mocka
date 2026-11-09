import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Popconfirm, Tooltip, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { DataTable, getErrorMessage, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { UserProjectFormModal } from "./components/UserProjectFormModal";
import { UserProject } from "../../types/userProject";
import { deleteUserProject, fetchUserProjects } from "../../store/reducers/userProjectSlice";
import { useParams } from "react-router";

export default function UsersProjects() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const isValidId = Number.isFinite(userId);

  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds } = useAppSelector((s) => s.userProjects);
  const [modal, setModal] = useState<{ open: boolean; project?: UserProject }>({ open: false });

  // Refetches whenever the :id in the URL changes. Same id → reuses what's in Redux.
  useEffect(() => {
    if (!isValidId) return;
    dispatch(fetchUserProjects({ userId }));
  }, [dispatch, userId, isValidId]);

  const reload = () => {
    if (isValidId) dispatch(fetchUserProjects({ userId, force: true }));
  };

  const remove = async (u: UserProject) => {
    try {
      await dispatch(deleteUserProject(u.id)).unwrap();
      message.success(`${u.name} was deleted`);
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  const columns = useMemo<DataColumn<UserProject>[]>(
    () => [
      { key: "id", title: "ID", accessor: (u) => u.id, width: 90 },
      { key: "name", title: "Name", accessor: (u) => u.name },
      { key: "description", title: "Description", accessor: (u) => u.description },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (u) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Edit">
              <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${u.name}`} onClick={() => setModal({ open: true, project: u })} />
            </Tooltip>
            <Popconfirm title="Delete this project?" description={`${u.name} will be removed from the user's projects.`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(u)}>
              <Tooltip title="Delete">
                <Button type="text" shape="circle" danger icon={<DeleteOutlined />} aria-label={`Delete ${u.name}`} loading={deletingIds.includes(u.id)} />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingIds],
  );

  if (!isValidId) {
    return <Alert type="error" showIcon message="Invalid user id" />;
  }

  return (
    <div className="mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-content">Projects List</h2>
      </header>

      {status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="Couldn't load projects"
          description={error}
          action={<Button size="small" onClick={reload}>Try again</Button>}
        />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<UserProject>
          data={items}
          columns={columns}
          rowKey={(u) => u.id}
          loading={status === "loading"}
          searchPlaceholder="Search projects…"
          exportName="projects"
          onRefresh={reload}
          emptyText="No projects yet"
          toolbar={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>Add project</Button>}
        />
      </div>

      <UserProjectFormModal
        open={modal.open}
        project={modal.project}
        userId={userId}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}