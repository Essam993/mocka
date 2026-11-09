import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Popconfirm, Tag, Tooltip, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ApartmentOutlined } from "@ant-design/icons";
import { DataTable, getErrorMessage, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../store";
import { UserFormModal } from "./components/UserFormModal";
import { humanize, type User } from "../../types/userTypes";
import { deleteUser, fetchUsers } from "../../store/reducers/usersSlice";
import { useNavigate } from "react-router";

export default function UsersPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds } = useAppSelector((s) => s.users);
  const me = useAppSelector((s) => s.auth.user);
  const [modal, setModal] = useState<{ open: boolean; user?: User }>({ open: false });

  // Loads once. Coming back to this page later reuses the data already in Redux.
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const remove = async (u: User) => {
    try {
      await dispatch(deleteUser(u.id)).unwrap();
      message.success(`${u.firstName} ${u.lastName} was deleted`);
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  const columns = useMemo<DataColumn<User>[]>(
    () => [
      { key: "id", title: "ID", accessor: (u) => u.id, width: 90 },
      { key: "firstName", title: "First name", accessor: (u) => u.firstName },
      { key: "lastName", title: "Last name", accessor: (u) => u.lastName },
      { key: "userName", title: "Email", accessor: (u) => u.userName },
      { key: "userType", title: "User type", accessor: (u) => u.userType, render: (u) => <Tag color="processing">{humanize(u.userType)}</Tag> },
      { key: "context", title: "Context", accessor: (u) => u.context, render: (u) => <Tag>{humanize(u.context)}</Tag> },
      { key: "contextValue", title: "Context value", accessor: (u) => u.contextValue, defaultHidden: true },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (u) => (
          <div className="flex justify-end gap-1">
            {
              u.context === "MOCK_API_USER" && (
                <Tooltip title="View User Tree">
                  <Button type="text" shape="circle" icon={<ApartmentOutlined className="size-4" />} aria-label={`View Tree for ${u.firstName}`} onClick={() => navigate(`/users/${u.id}/workspaces`)} />
                </Tooltip>
              )
            }
            <Tooltip title="Edit">
              <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${u.firstName}`} onClick={() => setModal({ open: true, user: u })} />
            </Tooltip>
            <Popconfirm title="Delete this user?" description={`${u.firstName} ${u.lastName} will lose access.`} okText="Delete" okButtonProps={{ danger: true }}
              disabled={u.id === me?.userId} onConfirm={() => remove(u)}>
              <Tooltip title={u.id === me?.userId ? "You can't delete your own account" : "Delete"}>
                <Button type="text" shape="circle" danger icon={<DeleteOutlined />} aria-label={`Delete ${u.firstName}`} disabled={u.id === me?.userId} loading={deletingIds.includes(u.id)} />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.userId, deletingIds],
  );

  return (
    <div className="mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-content">Users List</h2>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load users" description={error} action={<Button size="small" onClick={() => dispatch(fetchUsers({ force: true }))}>Try again</Button>} />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<User>
          data={items}
          columns={columns}
          rowKey={(u) => u.id}
          loading={status === "loading"}
          searchPlaceholder="Search users…"
          exportName="users"
          onRefresh={() => dispatch(fetchUsers({ force: true }))}
          emptyText="No users yet"
          toolbar={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>Add user</Button>}
        />
      </div>

      <UserFormModal open={modal.open} user={modal.user} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </div>
  );
}
