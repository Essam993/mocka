import { Dropdown, theme } from "antd";
import { Check, ChevronsUpDown, Folder } from "lucide-react";

export interface PickerOption {
  id: number;
  label: string;
  sub?: string;
  alias?: string;
}

interface Props {
  variant: "workspace" | "project" | "collection";
  options: PickerOption[];
  value?: number | null;
  onChange: (id: number) => void;
  loading?: boolean;
  collapsed?: boolean;
  emptyText: string;
}

export function ScopePicker({ variant, options, value, onChange, loading, collapsed, emptyText }: Props) {
  const { token } = theme.useToken();
  const selected = options.find((o) => o.id === value);
  const isWs = variant === "workspace";
  const title = loading && !selected ? "Loading…" : (selected?.label ?? emptyText);

  const lead = isWs ? (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-semibold text-white" style={{ background: token.colorPrimaryBg }}>
      {selected?.alias}
    </span>
  ) : (
    <span className="grid size-5 shrink-0 place-items-center" style={{ color: token.colorPrimary }}>
      <Folder className="size-4" />
    </span>
  );

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomLeft"
      disabled={options.length === 0}
      menu={{
        style: { minWidth: 240 },
        selectable: true,
        selectedKeys: value != null ? [String(value)] : [],
        onClick: ({ key }) => onChange(Number(key)),
        items: options.map((o) => ({
          key: String(o.id),
          icon: o.id === value ? <Check className="size-4" style={{ color: token.colorPrimary }} /> : <span className="inline-block size-4" />,
          label: (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{o.label}</div>
              {o.sub && <div className="truncate text-xs opacity-60">{o.sub}</div>}
            </div>
          ),
        })),
      }}
    >
      <button
        type="button"
        aria-label={`${isWs ? "Workspace" : "Project"}: ${title}`}
        className={`flex w-full items-center gap-3 text-left transition disabled:cursor-default ${
          collapsed
            ? "h-11 justify-center rounded-xl hover:bg-content/5"
            : isWs
              ? "h-14 rounded-xl border border-line bg-surface px-3 shadow-sm hover:border-primary/50"
              : "h-12 rounded-xl px-3 hover:bg-content/5"
        }`}
      >
        {lead}
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-content max-w-[150px]">{title}</span>
              {selected?.sub && <span className="block truncate text-xs text-muted">{selected.sub}</span>}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted" />
          </>
        )}
      </button>
    </Dropdown>
  );
}