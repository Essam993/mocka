import type { ReactNode } from "react";

export type CellValue = string | number | boolean | null | undefined;

export interface DataColumn<T> {
  key: string;
  title: string;
  /**
   * Plain value of the cell. It drives search, sorting, filtering and export.
   * Leave it out for action columns: they are never searched, sorted, filtered or exported.
   */
  accessor?: (row: T) => CellValue;
  /** Custom cell. Defaults to showing the accessor value. */
  render?: (row: T) => ReactNode;
  sortable?: boolean; // default true
  searchable?: boolean; // default true
  filterable?: boolean; // default true (value list built from the data)
  exportable?: boolean; // default true
  defaultHidden?: boolean;
  width?: number | string;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right";
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  searchPlaceholder?: string;
  /** File name prefix for exports, e.g. "users" → users-2026-10-05.csv */
  exportName?: string;
  /** Extra toolbar content on the right (e.g. an "Add" button) */
  toolbar?: ReactNode;
  /** Shows a refresh button when provided */
  onRefresh?: () => void;
  pageSize?: number;
  emptyText?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Key, as returned by rowKey, of the highlighted row */
  selectedKey?: React.Key | null;
}