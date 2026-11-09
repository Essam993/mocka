export type Kind = "id" | "text" | "number" | "boolean" | "email" | "date" | "choice" | "list" | "file" | "record";

export type Cell = string | number | boolean | null | string[] | Record<string, unknown>;

/** a record as the server stores it: one value per column name */
export type DataValues = Record<string, Cell>;

export interface DataColumn {
  /** the name of the response variable */
  name: string;
  dataTypeId: number | null;
  /** shown under the column name, e.g. "Text" */
  typeLabel: string;
  kind: Kind;
  required: boolean;
  /** the default value of the response variable */
  defaultValue: string;
}

/** a record in the editor; `key` is a client id and is never sent */
export interface DataRow {
  key: string;
  values: DataValues;
}