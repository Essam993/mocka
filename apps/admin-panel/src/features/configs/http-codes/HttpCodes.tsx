import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ConfirmModal, DataTable, getErrorMessage, toast, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { deleteHttpCode, fetchHttpCodes } from "../../../store/reducers/httpCodesSlice";
import { CATEGORY_COLOR, categoryOf, codeNumber, type HttpCode } from "../../../types/httpCodes";
import { HttpCodeFormModal } from "./components/HttpCodeFormModal";

export default function HttpCodes() {
  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds } = useAppSelector((s) => s.httpCodes);

  const [modal, setModal] = useState<{ open: boolean; httpCode?: HttpCode }>({ open: false });
  const [pending, setPending] = useState<HttpCode | null>(null);

  useEffect(() => {
    dispatch(fetchHttpCodes());
  }, [dispatch]);

  const reload = () => dispatch(fetchHttpCodes({ force: true }));

  /** throws on failure: the confirm dialog reports it through onError */
  const confirmDelete = async () => {
    if (!pending) return;
    await dispatch(deleteHttpCode(pending.id)).unwrap();
    toast.success(`${pending.name} was deleted`);
    setPending(null);
  };

  const columns = useMemo<DataColumn<HttpCode>[]>(
    () => [
      { key: "id", title: "ID", accessor: (c) => c.id, width: 90 },
      { key: "code", title: "Code", accessor: (c) => codeNumber(c.name) ?? "", width: 110 },
      { key: "name", title: "Name", accessor: (c) => c.name },
      {
        key: "category",
        title: "Category",
        accessor: (c) => categoryOf(c.name) ?? "",
        render: (c) => {
          const cat = categoryOf(c.name);
          return cat ? <Tag color={CATEGORY_COLOR[cat]}>{cat}</Tag> : null;
        },
      },
      {
        key: "actions",
        title: "",
        width: 110,
        align: "right",
        fixed: "right",
        render: (c) => (
          <div className="flex justify-end gap-1">
            <Tooltip title="Edit">
              <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${c.name}`} onClick={() => setModal({ open: true, httpCode: c })} />
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
        <h2 className="text-2xl font-semibold tracking-tight text-content">HTTP status codes</h2>
        <p className="mt-1 text-sm text-muted">The statuses an endpoint response can answer with.</p>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load the status codes" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<HttpCode>
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

      <HttpCodeFormModal open={modal.open} httpCode={modal.httpCode} onClose={() => setModal((m) => ({ ...m, open: false }))} />

      <ConfirmModal
        open={!!pending}
        title="Delete this status code?"
        description="This action cannot be undone."
        content={
          <>
            <span className="font-semibold text-content">{pending?.name}</span> will be permanently deleted. Endpoint responses that use it lose their status.
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