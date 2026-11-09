export type Kind = "workspace" | "project" | "collection" | "api" | "endpoint";
export type Values = Record<string, string | boolean>;

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "toggle" | "select";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: { regex: RegExp; message: string };
  options?: { value: string; label: string }[];
  description?: string;
}

export interface EntityDef {
  noun: string;
  fields: FieldDef[];
  defaults: Values;
}

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const ENTITIES: Record<Kind, EntityDef> = {
  workspace: {
    noun: "workspace",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, min: 2, max: 50 },
      {
        name: "alias",
        label: "Alias",
        type: "text",
        required: true,
        min: 2,
        max: 30,
        pattern: { regex: /^[a-z0-9][a-z0-9_-]*$/, message: "Lowercase letters, digits, - and _ only" },
      },
    ],
    defaults: { name: "", alias: "" },
  },
  project: {
    noun: "project",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, min: 2, max: 50 },
      { name: "description", label: "Description", type: "text", max: 100 },
    ],
    defaults: { name: "", description: "" },
  },
  collection: {
    noun: "collection",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, min: 2, max: 50 },
      { name: "required", label: "Auth required", type: "toggle", description: "Requests to this collection must be authenticated." },
    ],
    defaults: { name: "", required: false },
  },
  api: {
    noun: "API",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        min: 2,
        max: 50,
        pattern: { regex: /^[A-Za-z0-9_-]+$/, message: "Letters, digits, - and _ only" },
      },
      { name: "description", label: "Description", type: "text", max: 100 },
    ],
    defaults: { name: "", description: "" },
  },
  endpoint: {
    noun: "endpoint",
    fields: [
      { name: "method", label: "Method", type: "select", required: true, options: METHODS.map((m) => ({ value: m, label: m })) },
      {
        name: "path",
        label: "Path",
        type: "text",
        required: true,
        min: 2,
        max: 150,
        pattern: { regex: /^\/[A-Za-z0-9_\-/:.{}]*$/, message: "Start with / and use letters, digits and - _ / : . { }" },
      },
      { name: "description", label: "Description", type: "text", max: 100 },
    ],
    defaults: { method: "GET", path: "/", description: "" },
  },
};