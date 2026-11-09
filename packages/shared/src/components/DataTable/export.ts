import type { CellValue } from "./types";

export type ExportFormat = "csv" | "json";

/** Spreadsheet apps run text starting with = + - @ as formulas — neutralise it. */
const safe = (v: CellValue) => {
  if (v == null) return "";
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return String(v);
};
const esc = (s: string) => (/[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const toCSV = (headers: string[], rows: CellValue[][]) =>
  [headers.map(esc).join(","), ...rows.map((r) => r.map((c) => esc(safe(c))).join(","))].join("\r\n");

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportColumn<T> {
  key: string;
  title: string;
  accessor: (row: T) => CellValue;
}

export function exportRows<T>(format: ExportFormat, cols: ExportColumn<T>[], rows: T[], name: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    // BOM so Excel opens UTF-8 correctly
    const csv = toCSV(cols.map((c) => c.title), rows.map((r) => cols.map((c) => c.accessor(r))));
    download(`${name}-${stamp}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
  } else {
    const json = rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, c.accessor(r) ?? null])));
    download(`${name}-${stamp}.json`, JSON.stringify(json, null, 2), "application/json");
  }
}
