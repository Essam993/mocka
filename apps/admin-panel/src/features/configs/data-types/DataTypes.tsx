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
  deleteDataTypes,
  fetchDataTypes,
} from "../../../store/reducers/dataTypesSlice";

import { DataTypesFormModal } from "./components/DataTypesFormModal";

import type { dataTypes } from "../../../types/dataTypes";

export default function DataTypesPage() {
  const dispatch = useAppDispatch();

  const { items, status, error, deletingIds } = useAppSelector(
    (state) => state.dataTypes
  );

  const [modal, setModal] = useState<{
    open: boolean;
    dataTypes?: dataTypes;
  }>({
    open: false,
  });

  const [pending, setPending] = useState<dataTypes | null>(null);

  /**
   * Initial fetch.
   */
  useEffect(() => {
    dispatch(fetchDataTypes());
  }, [dispatch]);

  /**
   * Force reload.
   */
  const reload = () => dispatch(fetchDataTypes({ force: true }));

  /**
   * Confirm deletion.
   */
  const confirmDelete = async () => {
    if (!pending) return;

    await dispatch(deleteDataTypes(pending.id)).unwrap();

    toast.success(`${pending.name} was deleted`);

    setPending(null);
  };

  /**
   * Table columns.
   */
  const columns = useMemo<DataColumn<dataTypes>[]>(
    () => [
      {
        key: "id",
        title: "ID",
        accessor: (dataType) => dataType.id,
        width: 80,
      },
      {
        key: "name",
        title: "Name",
        accessor: (dataType) => dataType.name,
      },
      {
        key: "label",
        title: "Label",
        accessor: (dataType) => dataType.label,
      },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (dataType) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Edit">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined />}
                aria-label={`Edit ${dataType.name}`}
                onClick={() =>
                  setModal({
                    open: true,
                    dataTypes: dataType,
                  })
                }
              />
            </Tooltip>

            <Tooltip title="Delete">
              <Button
                type="text"
                shape="circle"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${dataType.name}`}
                loading={deletingIds.includes(dataType.id)}
                onClick={() => setPending(dataType)}
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
          Data Types
        </h2>

        <p className="mt-1 text-sm text-muted">
          Manage technical data types and their descriptive labels.
        </p>
      </header>

      {status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="Couldn't load the data types"
          description={error}
          action={
            <Button size="small" onClick={reload}>
              Try again
            </Button>
          }
        />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<dataTypes>
          data={items}
          columns={columns}
          rowKey={(dataType) => dataType.id}
          loading={status === "loading"}
          searchPlaceholder="Search data types..."
          exportName="data-types"
          onRefresh={reload}
          emptyText="No data types yet"
          toolbar={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModal({ open: true })}
            >
              Add data type
            </Button>
          }
        />
      </div>

      {/* Create / Update */}
      <DataTypesFormModal
        open={modal.open}
        dataTypes={modal.dataTypes}
        onClose={() =>
          setModal((current) => ({
            ...current,
            open: false,
          }))
        }
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!pending}
        title="Delete this data type?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">
              {pending?.name}
            </span>

            {" — "}

            <span className="text-muted">
              {pending?.label}
            </span>

            {" will be deleted."}
          </>
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
        onError={(error) =>
          toast.error("Couldn't delete the data type", {
            description: getErrorMessage(error),
          })
        }
      />
    </div>
  );
}