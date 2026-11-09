export const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const methodRank = (m: string) => {
  const i = METHOD_ORDER.indexOf(m);
  return i < 0 ? METHOD_ORDER.length : i;
};

const STYLE: Record<string, string> = {
  GET: "text-sky-600 bg-sky-500/10 dark:text-sky-400",
  POST: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  PUT: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  PATCH: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
  DELETE: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
};

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  return (
    <span className={`inline-flex min-w-[3.5rem] justify-center rounded-md px-2 py-1 font-mono text-xs font-semibold ${STYLE[method] ?? "bg-content/10 text-muted"} ${className ?? ""}`}>
      {method}
    </span>
  );
}