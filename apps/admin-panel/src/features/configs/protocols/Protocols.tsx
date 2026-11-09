import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Tooltip } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import {
  ConfirmModal,
  DataTable,
  getErrorMessage,
  toast,
  type DataColumn,
} from "@repo/shared";

import { useAppDispatch, useAppSelector } from "../../../store";
import {
  deleteProtocol,
  fetchProtocols,
} from "../../../store/reducers/protocolsSlice";

import { ProtocolsFormModal } from "./components/ProtocolsFormModal";
import type { Protocols } from "../../../types/protocols";

export default function ProtocolsPage() {
  const dispatch = useAppDispatch();

  const { items, status, error, deletingIds } = useAppSelector(
    (state) => state.protocols
  );

  const [modal, setModal] = useState<{
    open: boolean;
    Protocols?: Protocols;
  }>({ open: false });

  const [pending, setPending] = useState<Protocols | null>(null);

  useEffect(() => {
    dispatch(fetchProtocols());
  }, [dispatch]);

  const reload = () => dispatch(fetchProtocols({ force: true }));

  /**
   * Throws on failure so ConfirmModal can handle it through onError.
   */
  const confirmDelete = async () => {
    if (!pending) return;

    await dispatch(deleteProtocol(pending.id)).unwrap();

    toast.success(`${pending.name} was deleted`);
    setPending(null);
  };

  const columns = useMemo<DataColumn<Protocols>[]>(
    () => [
      {
        key: "id",
        title: "ID",
        accessor: (protocol) => protocol.id,
        width: 90,
      },
      {
        key: "name",
        title: "Name",
        accessor: (protocol) => protocol.name,
      },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (protocol) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Edit">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined />}
                aria-label={`Edit ${protocol.name}`}
                onClick={() =>
                  setModal({ open: true, Protocols: protocol })
                }
              />
            </Tooltip>

            <Tooltip title="Delete">
              <Button
                type="text"
                shape="circle"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${protocol.name}`}
                loading={deletingIds.includes(protocol.id)}
                onClick={() => setPending(protocol)}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [deletingIds]
  );

  return (
    <div className="mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-content">
          API Protocols
        </h2>

        <p className="mt-1 text-sm text-muted">
          Manage your API protocols
        </p>
      </header>

      {status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="Couldn't load the protocols"
          description={error}
          action={
            <Button size="small" onClick={reload}>
              Try again
            </Button>
          }
        />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<Protocols>
          data={items}
          columns={columns}
          rowKey={(protocol) => protocol.id}
          loading={status === "loading"}
          searchPlaceholder="Search protocols..."
          exportName="protocols"
          onRefresh={reload}
          emptyText="No protocols yet"
          toolbar={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModal({ open: true })}
            >
              Add protocol
            </Button>
          }
        />
      </div>

      <ProtocolsFormModal
        open={modal.open}
        Protocols={modal.Protocols}
        onClose={() =>
          setModal((current) => ({ ...current, open: false }))
        }
      />

      <ConfirmModal
        open={!!pending}
        title="Delete this protocol?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">
              {pending?.name}
            </span>{" "}
            will be deleted.
          </>
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
        onError={(error) =>
          toast.error("Couldn't delete the protocol", {
            description: getErrorMessage(error),
          })
        }
      />
    </div>
  );
}