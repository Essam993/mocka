import { fakerEN as faker } from "@faker-js/faker";
import type { Cell, DataColumn, DataRow, DataValues, Kind } from "../../types/apiData";

export const uid = () => Math.random().toString(36).slice(2);
export const toRow = (values: DataValues): DataRow => ({ key: uid(), values });

/* ---------------------------------- kinds ---------------------------------- */

/** "createdAt" → ["created", "at"] */
const words = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_\-.\s]+/g, " ").trim().toLowerCase().split(" ");

/** the kind a data type label stands for ("One of a list" is checked before "List") */
export function kindFromLabel(label: string): Kind | null {
  const l = label.trim().toLowerCase();
  if (!l) return null;
  if (l.includes("email")) return "email";
  if (l === "id" || l.endsWith(" id")) return "id";
  if (l.includes("one of")) return "choice";
  if (l.includes("list") || l.includes("array")) return "list";
  if (/number|integer|decimal|long|float|double/.test(l)) return "number";
  if (l.includes("bool")) return "boolean";
  if (/date|time/.test(l)) return "date";
  if (l.includes("file")) return "file";
  if (l.includes("record") || l.includes("object")) return "record";
  if (/text|string/.test(l)) return "text";
  return null;
}

/** used when the variable has no known data type */
export function kindFromName(name: string): Kind {
  const w = words(name);
  const first = w[0];
  const last = w[w.length - 1];
  if (w.includes("email") || w.includes("mail")) return "email";
  if (last === "id") return "id";
  if ((["is", "has", "can"].includes(first) && w.length > 1) || ["active", "enabled", "verified", "archived"].includes(last)) return "boolean";
  if (["at", "date", "time", "dob", "birthday"].includes(last)) return "date";
  if (["age", "year", "price", "amount", "total", "cost", "balance", "salary", "quantity", "qty", "count", "stock"].includes(last)) return "number";
  if (["role", "status", "type", "gender", "priority", "category"].includes(last)) return "choice";
  return "text";
}

export const kindOf = (label: string, name: string): Kind => kindFromLabel(label) ?? kindFromName(name);

/* -------------------------------- generation -------------------------------- */

const int = (min: number, max: number) => faker.number.int({ min, max });
const pick = <T,>(items: readonly T[]): T => faker.helpers.arrayElement(items as T[]);

/** the options of a "One of a list" column */
export function choicesFor(name: string): string[] {
  const last = words(name).slice(-1)[0];
  const known: Record<string, string[]> = {
    role: ["admin", "member", "viewer"],
    status: ["active", "inactive", "pending"],
    type: ["standard", "premium", "trial"],
    gender: ["female", "male", "other"],
    priority: ["low", "medium", "high"],
    category: ["general", "billing", "support"],
  };
  return known[last] ?? ["option 1", "option 2", "option 3"];
}

function textFor(name: string): string {
  const w = words(name);
  const has = (...k: string[]) => k.some((x) => w.includes(x));
  if (has("email", "mail")) return faker.internet.email().toLowerCase();
  if (has("first", "given") && has("name")) return faker.person.firstName();
  if (has("surname") || (has("last", "family") && has("name"))) return faker.person.lastName();
  if (has("user", "login", "handle") && has("name", "login", "handle")) return `${faker.person.firstName().toLowerCase()}${int(1, 99)}`;
  if (has("company", "organization", "organisation", "employer")) return faker.company.name();
  if (has("phone", "mobile", "tel", "telephone")) return faker.phone.number();
  if (has("city", "town")) return faker.location.city();
  if (has("country")) return faker.location.country();
  if (has("street", "address")) return faker.location.streetAddress();
  if (has("zip", "postal", "postcode")) return faker.location.zipCode();
  if (has("url", "website", "link", "site")) return faker.internet.url();
  if (has("avatar", "image", "photo", "picture", "logo", "thumbnail")) return faker.image.avatar();
  if (has("color", "colour")) return faker.color.human();
  if (has("currency")) return faker.finance.currencyCode();
  if (has("title", "subject", "headline")) return faker.lorem.words(3);
  if (has("description", "bio", "about", "summary", "comment", "note", "message", "body", "content")) return faker.lorem.sentence();
  if (has("name")) return faker.person.fullName();
  return faker.lorem.words(2);
}

function numberFor(name: string): number {
  const last = words(name).slice(-1)[0];
  if (last === "age") return int(18, 80);
  if (last === "year") return int(1990, new Date().getFullYear());
  if (["price", "amount", "total", "cost", "balance", "salary"].includes(last)) return int(100, 100000) / 100;
  if (["quantity", "qty", "count", "stock"].includes(last)) return int(1, 100);
  return int(1, 10000);
}

function dateFor(name: string): string {
  const w = words(name);
  const has = (...k: string[]) => k.some((x) => w.includes(x));
  if (has("birth", "dob", "birthday")) return faker.date.birthdate().toISOString();
  if (has("created", "joined", "registered")) return faker.date.past({ years: 1 }).toISOString();
  if (has("updated", "modified")) return faker.date.recent({ days: 30 }).toISOString();
  return faker.date.recent({ days: 365 }).toISOString();
}

/** one generated value (ids are numbered by generateRows) */
export function generateCell(c: DataColumn): Cell {
  switch (c.kind) {
    case "id": return int(1, 100000);
    case "email": return faker.internet.email().toLowerCase();
    case "number": return numberFor(c.name);
    case "boolean": return pick([true, false]);
    case "date": return dateFor(c.name);
    case "choice": return pick(choicesFor(c.name));
    case "list": return Array.from({ length: 3 }, () => faker.lorem.word());
    case "file": return faker.image.avatar();
    case "record": return {};
    default: return textFor(c.name);
  }
}

const maxNumber = (rows: { values: DataValues }[], name: string) =>
  rows.reduce((m, r) => {
    const n = Number(r.values[name]);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);

/** `count` generated records; id columns continue after the biggest existing id */
export function generateRows(columns: DataColumn[], count: number, existing: DataRow[] = []): DataRow[] {
  const next = new Map(columns.filter((c) => c.kind === "id").map((c) => [c.name, maxNumber(existing, c.name) + 1] as const));
  return Array.from({ length: count }, () => {
    const values: DataValues = {};
    for (const c of columns) {
      if (c.kind === "id") {
        const n = next.get(c.name)!;
        values[c.name] = n;
        next.set(c.name, n + 1);
      } else values[c.name] = generateCell(c);
    }
    return { key: uid(), values };
  });
}

/** the default of the response variable, converted to the column's kind (undefined = no default) */
function fromDefault(c: DataColumn): Cell | undefined {
  const d = c.defaultValue;
  if (d === "") return undefined;
  switch (c.kind) {
    case "number": return Number.isFinite(Number(d)) ? Number(d) : null;
    case "boolean": return d.toLowerCase() === "true";
    case "list": return d.split(",").map((s) => s.trim()).filter(Boolean);
    case "record": return {};
    default: return d;
  }
}

const emptyFor = (c: DataColumn): Cell =>
  c.kind === "number" ? null : c.kind === "boolean" ? false : c.kind === "list" ? [] : c.kind === "record" ? {} : c.kind === "date" ? new Date().toISOString() : "";

/** a new record by hand: the variable's default where it has one, empty otherwise */
export function blankRow(columns: DataColumn[], existing: DataRow[]): DataRow {
  const values: DataValues = {};
  for (const c of columns) values[c.name] = c.kind === "id" ? maxNumber(existing, c.name) + 1 : (fromDefault(c) ?? emptyFor(c));
  return { key: uid(), values };
}

/** saved records that lack a column (the response gained a field since) get generated values for it */
export function fillMissing(columns: DataColumn[], rows: DataRow[]): DataRow[] {
  return rows.map((r, i) => {
    const values = { ...r.values };
    for (const c of columns) {
      if (c.name in values) continue;
      values[c.name] = c.kind === "id" ? i + 1 : generateCell(c);
    }
    return { ...r, values };
  });
}

/* ------------------------------ values and checks ------------------------------ */

/** only the columns of the response, in order: what is compared and what is sent */
export const plain = (columns: DataColumn[], rows: { values: DataValues }[]): DataValues[] =>
  rows.map((r) => Object.fromEntries(columns.map((c) => [c.name, r.values[c.name] ?? null])));

export const cellText = (v: Cell | undefined): string =>
  v == null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCell(c: DataColumn, v: Cell | undefined): string | undefined {
  const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
  if (empty) return c.required && c.kind !== "boolean" && c.kind !== "record" ? "Required" : undefined;
  if (c.kind === "number" && !Number.isFinite(Number(v))) return "Enter a number";
  if (c.kind === "email" && !EMAIL.test(String(v))) return "Enter a valid email";
  if (c.kind === "date" && Number.isNaN(Date.parse(String(v)))) return "Enter a valid date";
  return undefined;
}

/* ----------------------------------- export ----------------------------------- */

const csv = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function download(format: "csv" | "json", name: string, columns: DataColumn[], rows: DataRow[]) {
  const data = plain(columns, rows);
  const text =
    format === "json"
      ? JSON.stringify(data, null, 2)
      : [columns.map((c) => csv(c.name)).join(","), ...data.map((r) => columns.map((c) => csv(cellText(r[c.name]))).join(","))].join("\r\n");
  const blob = new Blob([format === "csv" ? `\uFEFF${text}` : text], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}