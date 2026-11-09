import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ConfirmModal, DataTable, getErrorMessage, toast, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { deleteHttpMethod, fetchHttpMethods } from "../../../store/reducers/httpMethodSlice";
import { HttpMethod } from "../../../types/httpMethods";
import { HttpMethodFormModal } from "./components/HttpMethodFormModal";

export default function HttpMethods() {
  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds } = useAppSelector((s) => s.httpMethods);

  const [modal, setModal] = useState<{ open: boolean; httpMethod?: HttpMethod }>({ open: false });
  const [pending, setPending] = useState<HttpMethod | null>(null);

  useEffect(() => {
    dispatch(fetchHttpMethods());
  }, [dispatch]);

  const reload = () => dispatch(fetchHttpMethods({ force: true }));

  /** throws on failure: the confirm dialog reports it through onError */
  const confirmDelete = async () => {
    if (!pending) return;
    await dispatch(deleteHttpMethod(pending.id)).unwrap();
    toast.success(`${pending.name} was deleted`);
    setPending(null);
  };

  const columns = useMemo<DataColumn<HttpMethod>[]>(
    () => [
      { key: "id", title: "ID", accessor: (c) => c.id, width: 90 },
      { key: "name", title: "Name", accessor: (c) => c.name },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (c) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Edit">
              <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${c.name}`} onClick={() => setModal({ open: true, httpMethod: c })} />
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                type="text"
                shape="circle"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${c.name}`}
                loading={deletingIds.includes(c.id)}
                onClick={() => setPending(c)}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [deletingIds],
  );

  return (
    <div className="mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-content">HTTP Methods</h2>
        <p className="mt-1 text-sm text-muted">Manage the list of HTTP methods</p>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load the status codes" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<HttpMethod>
          data={items}
          columns={columns}
          rowKey={(c) => c.id}
          loading={status === "loading"}
          searchPlaceholder="Search status codes…"
          exportName="http-status-codes"
          onRefresh={reload}
          emptyText="No status codes yet"
          toolbar={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>
              Add status code
            </Button>
          }
        />
      </div>

      <HttpMethodFormModal open={modal.open} httpMethod={modal.httpMethod} onClose={() => setModal((m) => ({ ...m, open: false }))} />

      <ConfirmModal
        open={!!pending}
        title="Delete this status code?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">{pending?.name}</span> will be deleted
          </>
        }
        okText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
        onError={(e) => toast.error("Couldn't delete the status code", { description: getErrorMessage(e) })}
      />
    </div>
  );
}