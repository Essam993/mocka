export interface HttpCode {
  id: number;
  /** starts with the status number, e.g. "201 Created" */
  name: string;
}

export interface HttpCodeInput {
  name: string;
}

/** the leading number of the name: "201 Created" → 201 */
export const codeNumber = (name: string): number | null => {
  const n = parseInt(name, 10);
  return Number.isFinite(n) ? n : null;
};

export type CodeCategory = "Informational" | "Success" | "Redirect" | "Client error" | "Server error";

export const categoryOf = (name: string): CodeCategory | null => {
  const n = codeNumber(name);
  if (n == null) return null;
  if (n < 200) return "Informational";
  if (n < 300) return "Success";
  if (n < 400) return "Redirect";
  if (n < 500) return "Client error";
  return "Server error";
};

export const CATEGORY_COLOR: Record<CodeCategory, string> = {
  Informational: "default",
  Success: "green",
  Redirect: "blue",
  "Client error": "orange",
  "Server error": "red",
};