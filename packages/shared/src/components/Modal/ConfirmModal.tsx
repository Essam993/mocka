
import { useState, type ReactNode } from "react";
import { Button } from "antd";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

export interface ConfirmModalProps {
  open: boolean;
  title: ReactNode;
  content?: ReactNode;
  description?: ReactNode;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onError?: (error: unknown) => void;
}

export function ConfirmModal({
  open,
  title,
  content,
  description,
  okText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  onError,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await onConfirm();
      onCancel();
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      icon={<AlertTriangle className={danger ? "text-rose-500" : "text-primary"} />}
      size="md"
      busy={busy}
      closeOnOverlay={!busy}
      closeOnEsc={!busy}
      closable={!busy}
      footer={
        <>
          <Button
            onClick={onCancel}
            disabled={busy}
            className="!rounded-xl"
          >
            {cancelText}
          </Button>

          <Button
            type="primary"
            danger={danger}
            loading={busy}
            onClick={handleConfirm}
            className="!rounded-xl !font-semibold"
          >
            {okText}
          </Button>
        </>
      }
    >
      {content && (
        <div className="text-sm leading-6 text-muted">
          {content}
        </div>
      )}
    </Modal>
  );
}

export default ConfirmModal;
