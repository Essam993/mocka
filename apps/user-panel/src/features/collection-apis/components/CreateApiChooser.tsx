import type { ReactNode } from "react";
import { Modal, Tag, theme } from "antd";
import { Layers, SlidersHorizontal } from "lucide-react";

interface ChoiceProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  badge?: string;
}

function Choice({ icon, title, description, onClick, badge }: ChoiceProps) {
  const { token } = theme.useToken();
  const disabled = !onClick;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-2xl border border-line p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5"
      }`}
      style={{ background: token.colorBgContainer }}
    >
      <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}>
        {icon}
      </span>
      <span className="space-y-1">
        <span className="flex items-center gap-2 text-sm font-medium text-content">
          {title}
          {badge && <Tag className="!m-0">{badge}</Tag>}
        </span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPickCustom: () => void;
}

export function CreateApiChooser({ open, onClose, onPickCustom }: Props) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Create API" width={640} centered>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <Choice
          icon={<Layers className="size-5" />}
          title="Full CRUD in one click"
          description="Generate list, get, create, update and delete for a resource."
          badge="Coming soon"
        />
        <Choice
          icon={<SlidersHorizontal className="size-5" />}
          title="Single custom API"
          description="Choose the method, match conditions and responses yourself."
          onClick={onPickCustom}
        />
      </div>
    </Modal>
  );
}
