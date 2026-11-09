import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, ConfigProvider, Dropdown, Input, Pagination, Popover, Table, Tooltip, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { ClearOutlined, DownloadOutlined, FileTextOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, CodeOutlined } from "@ant-design/icons";
import { exportRows, type ExportFormat } from "./export";
import type { CellValue, DataColumn, DataTableProps } from "./types";

const str = (v: CellValue) => (v == null ? "" : String(v));

const compare = (a: CellValue, b: CellValue) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return str(a).localeCompare(str(b), undefined, { numeric: true, sensitivity: "base" });
};

type Sort = { key: string; order: "ascend" | "descend" } | null;

/** Table skin: mono uppercase header, soft row hover, accent edge on the selected row. */
const SKIN = [
  "overflow-hidden rounded-2xl border border-line",
  "[&_.ant-table-thead>tr>th]:!font-mono [&_.ant-table-thead>tr>th]:!text-[11px] [&_.ant-table-thead>tr>th]:!font-medium",
  "[&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-widest",
  "[&_.ant-table-thead>tr>th]:!border-b [&_.ant-table-thead>tr>th]:!border-line",
  "[&_.ant-table-tbody>tr>td]:!border-line",
  "[&_.ant-table-tbody>tr:hover>td]:!bg-content/5",
  "[&_.is-selected>td]:!bg-primary/10",
  "[&_.is-selected>td:first-child]:shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]",
].join(" ");

/**
 * Client-side table with global search, per-column value filters, sorting, column visibility,
 * pagination and CSV / JSON export of exactly what you see (all pages, after search/filter/sort).
 */
export function DataTable<T>({
  data, columns, rowKey, loading, searchPlaceholder = "Search…", exportName = "export", toolbar, onRefresh,
  pageSize: initialPageSize = 10, emptyText, onRowClick, selectedKey,
}: DataTableProps<T>) {
  const { token } = theme.useToken();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hidden, setHidden] = useState<string[]>(() => columns.filter((c) => c.defaultHidden).map((c) => c.key));

  useEffect(() => {
    const t = setTimeout(() => (setQuery(searchInput), setPage(1)), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const visible = useMemo(() => columns.filter((c) => !hidden.includes(c.key)), [columns, hidden]);

  // 1) search → 2) column filters → 3) sort
  const processed = useMemo(() => {
    let rows = data;
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      const searchable = columns.filter((c) => c.accessor && c.searchable !== false);
      rows = rows.filter((r) => {
        const hay = searchable.map((c) => str(c.accessor!(r)).toLowerCase()).join("\u0001");
        return terms.every((t) => hay.includes(t));
      });
    }
    for (const [key, vals] of Object.entries(filters)) {
      const col = columns.find((c) => c.key === key);
      if (col?.accessor && vals.length) rows = rows.filter((r) => vals.includes(str(col.accessor!(r))));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.accessor) {
        const dir = sort.order === "ascend" ? 1 : -1;
        rows = [...rows].sort((a, b) => dir * compare(col.accessor!(a), col.accessor!(b)));
      }
    }
    return rows;
  }, [data, columns, query, filters, sort]);

  const maxPage = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, maxPage); // e.g. after deleting the last row of the last page
  const pageRows = useMemo(() => processed.slice((current - 1) * pageSize, current * pageSize), [processed, current, pageSize]);

  const filterOptions = useMemo(() => {
    const out: Record<string, { text: string; value: string }[]> = {};
    for (const c of columns) {
      if (!c.accessor || c.filterable === false) continue;
      const uniq = [...new Set(data.map((r) => str(c.accessor!(r))).filter(Boolean))].sort((a, b) => compare(a, b));
      if (uniq.length > 1 && uniq.length <= 200) out[c.key] = uniq.map((v) => ({ text: v, value: v }));
    }
    return out;
  }, [data, columns]);

  const antColumns: ColumnsType<T> = visible.map((c) => ({
    key: c.key,
    title: c.title,
    width: c.width,
    align: c.align,
    fixed: c.fixed,
    render: (_: unknown, row: T) => (c.render ? c.render(row) : str(c.accessor?.(row)) || <span className="text-muted">—</span>),
    sorter: c.accessor && c.sortable !== false ? true : undefined,
    sortOrder: sort?.key === c.key ? sort.order : null,
    filters: filterOptions[c.key],
    filteredValue: filters[c.key] ?? null,
    filterSearch: true,
  }));

  const hasActive = !!query || !!sort || Object.keys(filters).length > 0;
  const hasSelected = selectedKey != null && data.some((r) => rowKey(r) === selectedKey);
  const reset = () => (setSearchInput(""), setQuery(""), setFilters({}), setSort(null), setPage(1));

  const doExport = (format: ExportFormat) =>
    exportRows(
      format,
      visible.filter((c) => c.accessor && c.exportable !== false).map((c) => ({ key: c.key, title: c.title, accessor: c.accessor! })),
      processed,
      exportName,
    );

  const columnPicker = (
    <div className="flex min-w-44 flex-col gap-2">
      {columns.map((c) => (
        <Checkbox key={c.key} checked={!hidden.includes(c.key)} disabled={!hidden.includes(c.key) && visible.length === 1}
          onChange={(e) => setHidden((h) => (e.target.checked ? h.filter((k) => k !== c.key) : [...h, c.key]))}>
          {c.title}
        </Checkbox>
      ))}
    </div>
  );

  const chip = "rounded-full border border-line px-3 py-1 text-sm text-muted";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={chip}>
          Rows <b className="ml-1 font-semibold text-primary">{processed.length}</b>
        </span>
        {hasSelected && (
          <span className={chip}>
            Selected <b className="ml-1 font-semibold text-primary">1</b>
          </span>
        )}
        <Input allowClear value={searchInput} onChange={(e) => setSearchInput(e.target.value)} prefix={<SearchOutlined className="text-muted" />}
          placeholder={searchPlaceholder} aria-label="Search table" className="!w-full sm:!w-72 !rounded-xl" />
        {hasActive && <Button type="link" icon={<ClearOutlined />} onClick={reset}>Reset</Button>}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onRefresh && <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} aria-label="Refresh" /></Tooltip>}
          <Popover trigger="click" placement="bottomRight" content={columnPicker} title="Columns">
            <Button icon={<SettingOutlined />}>Columns</Button>
          </Popover>
          <Dropdown disabled={processed.length === 0} menu={{
            items: [
              { key: "csv", icon: <FileTextOutlined />, label: "CSV (opens in Excel)" },
              { key: "json", icon: <CodeOutlined />, label: "JSON" },
            ],
            onClick: ({ key }) => doExport(key as ExportFormat),
          }}>
            <Button icon={<DownloadOutlined />} disabled={processed.length === 0}>Export</Button>
          </Dropdown>
          {toolbar}
        </div>
      </div>

      <ConfigProvider
        theme={{ components: { Table: { headerBg: token.colorBgContainer, headerSplitColor: "transparent", cellPaddingBlock: 12, cellPaddingInline: 16 } } }}
      >
        <div className={SKIN}>
          <Table<T>
            rowKey={rowKey}
            columns={antColumns}
            dataSource={pageRows}
            loading={loading}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: hasActive ? "No results match your search or filters" : emptyText ?? "No data" }}
            rowClassName={(row) => `${onRowClick ? "cursor-pointer" : ""} ${hasSelected && rowKey(row) === selectedKey ? "is-selected" : ""}`}
            onRow={(row) => ({
              onClick: (e) => {
                if (!onRowClick) return;
                // clicks on buttons / links / inputs inside the row (e.g. an actions column) are not row clicks
                if ((e.target as HTMLElement).closest("button,a,input,[role='button']")) return;
                onRowClick(row);
              },
              onKeyDown: (e) => {
                if (onRowClick && e.key === "Enter" && e.target === e.currentTarget) onRowClick(row);
              },
              tabIndex: onRowClick ? 0 : undefined,
            })}
            onChange={(_, f: Record<string, FilterValue | null>, s: SorterResult<T> | SorterResult<T>[]) => {
              const nextFilters: Record<string, string[]> = {};
              Object.entries(f).forEach(([k, v]) => v?.length && (nextFilters[k] = v.map(String)));
              const one = Array.isArray(s) ? s[0] : s;
              const nextSort: Sort = one?.order ? { key: String(one.columnKey ?? one.field), order: one.order } : null;
              const changed = JSON.stringify(nextFilters) !== JSON.stringify(filters) || JSON.stringify(nextSort) !== JSON.stringify(sort);
              setFilters(nextFilters);
              setSort(nextSort);
              if (changed) setPage(1);
            }}
          />

          {processed.length > initialPageSize && (
            <div className="flex justify-end border-t border-line px-4 py-3">
              <Pagination
                size="small"
                current={current}
                pageSize={pageSize}
                total={processed.length}
                showSizeChanger
                pageSizeOptions={[10, 20, 50, 100]}
                showTotal={(t, [a, b]) => `${a}–${b} of ${t}`}
                onChange={(p, ps) => {
                  setPage(ps !== pageSize ? 1 : p);
                  setPageSize(ps);
                }}
              />
            </div>
          )}
        </div>
      </ConfigProvider>
    </div>
  );
}