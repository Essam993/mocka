
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Popconfirm, Tooltip, message } from "antd";
import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DataTable,
  getErrorMessage,
  type DataColumn,
} from "@repo/shared";
import { useNavigate } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store";
import { Workspace } from "../../types/workspace";
import {
  deleteWorkspace,
  fetchWorkspaces,
} from "../../store/reducers/workspaceSlice";
import { useParams } from "react-router"; 
import { WorkspaceFormModal } from "./components/WorkspaceFormModal";


export default function Workspaces() {
  const navigate = useNavigate(); // next to the other hooks
  const { id } = useParams<{ id: string }>();

  const mockaUserId = Number(id);
  const isValidId =
    Number.isInteger(mockaUserId) && mockaUserId > 0;

  const dispatch = useAppDispatch();

  const {
    items,
    status,
    error,
    deletingIds,
    currentMockaUserId,
  } = useAppSelector((state) => state.workspaces);

  const [modal, setModal] = useState<{
    open: boolean;
    workspace?: Workspace;
  }>({ open: false });

  // Fetch whenever the URL user ID changes
  useEffect(() => {
    if (!isValidId) return;

    dispatch(fetchWorkspaces({ mockaUserId }));
  }, [dispatch, mockaUserId, isValidId]);

  const reload = () => {
    if (!isValidId) return;

    dispatch(
      fetchWorkspaces({
        mockaUserId,
        force: true,
      })
    );
  };

  const remove = async (workspace: Workspace) => {
    try {
      await dispatch(deleteWorkspace(workspace.id)).unwrap();

      message.success(`${workspace.name} was deleted`);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns = useMemo<DataColumn<Workspace>[]>(
    () => [
      {
        key: "id",
        title: "ID",
        accessor: (workspace) => workspace.id,
        width: 90,
      },
      {
        key: "name",
        title: "Workspace Name",
        accessor: (workspace) => workspace.name,
      },
      {
        key: "alias",
        title: "Alias",
        accessor: (workspace) => workspace.alias,
      },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (workspace) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Explore projects">
              <Button
                type="text"
                shape="circle"
                icon={<ApartmentOutlined />}
                aria-label={`Explore ${workspace.name}`}
                onClick={() => navigate(`/users/${mockaUserId}/workspaces/${workspace.id}`)}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined />}
                aria-label={`Edit ${workspace.name}`}
                onClick={() =>
                  setModal({
                    open: true,
                    workspace,
                  })
                }
              />
            </Tooltip>

            <Popconfirm
              title="Delete this workspace?"
              description={`${workspace.name} will be removed.`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => remove(workspace)}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  shape="circle"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Delete ${workspace.name}`}
                  loading={deletingIds.includes(
                    workspace.id
                  )}
                />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [deletingIds]
  );

  if (!isValidId) {
    return (
      <Alert
        type="error"
        showIcon
        message="Invalid user ID"
      />
    );
  }

  // Avoid rendering another user's workspaces
  const visibleItems =
    currentMockaUserId === mockaUserId ? items : [];

  return (
    <div className="mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-content">
          Workspaces
        </h2>

        <p className="text-sm text-content-secondary mt-1">
          Manage workspaces belonging to this user.
        </p>
      </header>

      {status === "failed" &&
        currentMockaUserId === mockaUserId && (
          <Alert
            type="error"
            showIcon
            message="Couldn't load workspaces"
            description={error}
            action={
              <Button size="small" onClick={reload}>
                Try again
              </Button>
            }
          />
        )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<Workspace>
          data={visibleItems}
          columns={columns}
          rowKey={(workspace) => workspace.id}
          loading={
            status === "loading" ||
            currentMockaUserId !== mockaUserId
          }
          searchPlaceholder="Search workspaces..."
          exportName="workspaces"
          onRefresh={reload}
          emptyText="No workspaces yet"
          toolbar={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                setModal({ open: true })
              }
            >
              Add Workspace
            </Button>
          }
        />
      </div>

      <WorkspaceFormModal
        open={modal.open}
        mockaUserId={mockaUserId}
        workspace={modal.workspace}
        onClose={() => setModal({ open: false })}
      />
    </div>
  );
}
