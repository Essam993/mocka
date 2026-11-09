import { Checkbox } from "antd";
import { Cell, DataColumn } from "../../../types/apiData";
import { choicesFor } from "../data";

const base =
  "w-full min-w-0 rounded-lg border bg-transparent px-2 py-1.5 text-sm text-content outline-none transition-colors placeholder:text-muted hover:border-line focus:border-primary";

interface Props {
  column: DataColumn;
  value: Cell | undefined;
  error?: string;
  onChange: (v: Cell) => void;
}

/** One editable cell. The input depends on the column's kind. */
export function DataCell({ column, value, error, onChange }: Props) {
  const cls = `${base} ${error ? "border-red-500" : "border-transparent"}`;
  const label = column.name;

  switch (column.kind) {
    case "id":
      return <span className="block truncate px-2 py-1.5 font-mono text-sm text-content">{String(value ?? "")}</span>;

    case "record":
      return <span className="block truncate px-2 py-1.5 font-mono text-xs text-muted">{JSON.stringify(value ?? {})}</span>;

    case "boolean":
      return (
        <div className="flex h-8 items-center px-2">
          <Checkbox checked={value === true || value === "true"} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
        </div>
      );

    case "number":
      return (
        <input
          type="number"
          step="any"
          className={cls}
          title={error}
          aria-label={label}
          aria-invalid={!!error}
          value={value == null || value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );

    case "date":
      // kept in UTC so what is shown is what is stored
      return (
        <input
          type="datetime-local"
          className={cls}
          title={error ?? "UTC"}
          aria-label={label}
          aria-invalid={!!error}
          value={typeof value === "string" ? value.slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}:00.000Z` : null)}
        />
      );

    case "choice": {
      const current = cellValue(value);
      const options = [...new Set([...choicesFor(column.name), ...(current ? [current] : [])])];
      return (
        <select className={cls} title={error} aria-label={label} aria-invalid={!!error} value={current} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    case "list": {
      // comma separated; committed when the cell loses focus so typing a comma isn't swallowed
      const joined = Array.isArray(value) ? value.join(", ") : cellValue(value);
      return (
        <input
          key={joined}
          className={cls}
          title={error ?? "Comma separated"}
          aria-label={label}
          aria-invalid={!!error}
          defaultValue={joined}
          onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      );
    }

    default:
      return (
        <input
          type={column.kind === "email" ? "email" : "text"}
          className={cls}
          title={error}
          aria-label={label}
          aria-invalid={!!error}
          value={cellValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

const cellValue = (v: Cell | undefined) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));