import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { ConfirmModal, DataTable, getErrorMessage, toast, type DataColumn } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../store";
import { deleteContentTypes, fetchContentTypes } from "../../../store/reducers/contentTypesSlice";
import { ContentTypesFormModal } from "./components/ContentTypesFormModal";
import { ContentTypes } from "../../../types/contentTypes";

export default function ContentTypesPage() {
  const dispatch = useAppDispatch();
  const { items, status, error, deletingIds } = useAppSelector((s) => s.contentTypes);

  const [modal, setModal] = useState<{ open: boolean; ContentTypes?: ContentTypes }>({ open: false });
  const [pending, setPending] = useState<ContentTypes | null>(null);

  useEffect(() => {
    dispatch(fetchContentTypes());
  }, [dispatch]);

  const reload = () => dispatch(fetchContentTypes({ force: true }));

  /** throws on failure: the confirm dialog reports it through onError */
  const confirmDelete = async () => {
    if (!pending) return;
    await dispatch(deleteContentTypes(pending.id)).unwrap();
    toast.success(`${pending.name} was deleted`);
    setPending(null);
  };

  const columns = useMemo<DataColumn<ContentTypes>[]>(
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
              <Button type="text" shape="circle" icon={<EditOutlined />} aria-label={`Edit ${c.name}`} onClick={() => setModal({ open: true, ContentTypes: c })} />
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
        <h2 className="text-2xl font-semibold tracking-tight text-content">Content Types</h2>
        <p className="mt-1 text-sm text-muted">The statuses an endpoint response can answer with.</p>
      </header>

      {status === "failed" && (
        <Alert type="error" showIcon message="Couldn't load the content types" description={error} action={<Button size="small" onClick={reload}>Try again</Button>} />
      )}

      <div className="rounded-2xl border border-line p-4 md:p-5">
        <DataTable<ContentTypes>
          data={items}
          columns={columns}
          rowKey={(c) => c.id}
          loading={status === "loading"}
          searchPlaceholder="Search content types…"
          exportName="http-status-codes"
          onRefresh={reload}
          emptyText="No content types yet"
          toolbar={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>
              Add content type
            </Button>
          }
        />
      </div>

      <ContentTypesFormModal open={modal.open} ContentTypes={modal.ContentTypes} onClose={() => setModal((m) => ({ ...m, open: false }))} />

      <ConfirmModal
        open={!!pending}
        title="Delete this content type?"
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
        onError={(e) => toast.error("Couldn't delete the content type", { description: getErrorMessage(e) })}
      />
    </div>
  );
}