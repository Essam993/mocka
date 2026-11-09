import { useMemo } from "react";
import { Select } from "antd";
import { useAppSelector } from "../../../store";

export interface ValueRow {
  id?: number;
  variableId: number | null;
  dataTypeId: number | null;
}

export interface ValueIds {
  variableId?: number;
  dataTypeId?: number;
}

interface ValueFromProps {
  projectId: number;
  row: ValueRow;
  onChange: (ids: { variableId: number | null; dataTypeId: number | null }) => void;
  status?: "error" | "warning";
  placeholder?: string;
  ariaLabel?: string;
}

export const writeIds = (row: ValueRow): ValueIds => {
  if (row.variableId != null) {
    return row.id == null
      ? { variableId: row.variableId }
      : { variableId: row.variableId, ...(row.dataTypeId != null ? { dataTypeId: row.dataTypeId } : {}) };
  }
  return row.dataTypeId != null ? { dataTypeId: row.dataTypeId } : {};
};

export const useValueFrom = (projectId: number) => {
  const types = useAppSelector((state) => state.dataTypes.items);
  const projectVariables = useAppSelector((state) => state.projectVariables);
  const globals = useMemo(
    () => projectVariables.loadedProjectId === projectId ? projectVariables.items.filter(Boolean) : [],
    [projectVariables.items, projectVariables.loadedProjectId, projectId],
  );
  const globalById = useMemo(() => new Map(globals.map((variable) => [variable.id, variable])), [globals]);
  const getDataTypeId = (row: ValueRow): number | null =>
    row.dataTypeId ?? (row.variableId != null ? globalById.get(row.variableId)?.dataTypeId ?? null : null);
  return { types, globals, globalById, getDataTypeId };
};

const sourceTag = (label: "Caller" | "Global") => (
  <span
    className={`mr-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
      label === "Caller"
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
    }`}
  >
    {label}
  </span>
);

export function ValueSelect({ projectId, row, onChange, status, placeholder = "Select a value", ariaLabel = "Value from" }: ValueFromProps) {
  const { types, globals, globalById } = useValueFrom(projectId);
  const options = useMemo(() => {
    const callerOptions = types.map((type) => ({
      value: `caller:${type.id}`,
      label: <>{sourceTag("Caller")}{type.label}</>,
      search: type.label.toLowerCase(),
    }));
    const globalOptions = [
      ...(row.variableId != null && !globalById.has(row.variableId)
        ? [{ value: `global:${row.variableId}`, label: <>{sourceTag("Global")}Variable #{row.variableId}</>, search: `variable ${row.variableId}` }]
        : []),
      ...globals.map((variable) => ({
        value: `global:${variable.id}`,
        label: <>{sourceTag("Global")}{variable.name}</>,
        search: variable.name.toLowerCase(),
      })),
    ];
    return [
      { label: "Caller data types", options: callerOptions },
      { label: "Project Global variables", options: globalOptions },
    ];
  }, [types, globals, globalById, row.variableId]);

  const value = row.variableId != null
    ? `global:${row.variableId}`
    : row.dataTypeId != null
      ? `caller:${row.dataTypeId}`
      : undefined;

  return (
    <Select
      value={value}
      onChange={(selectedValue: string) => {
        const [source, rawId] = selectedValue.split(":");
        const id = Number(rawId);
        if (!Number.isInteger(id)) return;
        if (source === "global") {
          onChange({ variableId: id, dataTypeId: globalById.get(id)?.dataTypeId ?? null });
        } else if (source === "caller") {
          onChange({ variableId: null, dataTypeId: id });
        }
      }}
      options={options}
      placeholder={placeholder}
      aria-label={ariaLabel}
      status={status}
      showSearch
      filterOption={(input, option) => String(option?.search ?? "").includes(input.toLowerCase())}
      popupMatchSelectWidth={false}
      className="w-full"
    />
  );
}
