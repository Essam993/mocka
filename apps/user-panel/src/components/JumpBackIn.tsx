import { useNavigate } from "react-router";
import { Skeleton, theme } from "antd";
import { ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { setProject } from "../store/reducers/scopeSlice";
import type { UserProject } from "../types/userProject";

const MAX_CARDS = 3;

/** "2026-10-16 16:32:30" → "2 h ago". Returns null when the date is missing or invalid. */
function timeAgo(value?: string | null): string | null {
  if (!value) return null;
  const t = new Date(value.replace(" ", "T")).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** The backend sends mdate / cdate on most rows, but the type may not declare them */
const changedAt = (p: UserProject) => {
  const row = p as UserProject & { mdate?: string | null; cdate?: string | null };
  return row.mdate ?? row.cdate ?? null;
};

export default function JumpBackIn() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token } = theme.useToken();

  const workspaceId = useAppSelector((s) => s.scope.workspaceId);
  const workspace = useAppSelector((s) => s.workspaces.items.find((w) => w?.id === s.scope.workspaceId));
  const { items, status, loadedWorkspaceId } = useAppSelector((s) => s.userProjects);

  // never show another workspace's projects
  const projects = workspaceId != null && loadedWorkspaceId === workspaceId ? items.filter(Boolean) : [];
  const loading = status === "loading" || workspaceId == null;

  // most recently changed first, when the dates are available
  const recent = [...projects]
    .sort((a, b) => (changedAt(b) ?? "").localeCompare(changedAt(a) ?? ""))
    .slice(0, MAX_CARDS);

  const open = (p: UserProject) => {
    dispatch(setProject(p.id)); // the sidebar follows
    navigate(`/projects/${p.id}/collections`);
  };

  return (
    <section aria-labelledby="jump-back-in" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="jump-back-in" className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
          Jump back in
        </h2>
        {workspace && (
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="flex max-w-[50%] items-center gap-1.5 text-sm font-medium transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            style={{ color: token.colorInfo }}
          >
            <span className="truncate">{workspace.name}</span>
            <ArrowRight className="size-4 shrink-0" />
          </button>
        )}
      </div>

      {loading && projects.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: MAX_CARDS }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line p-5">
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="w-full rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted transition hover:border-primary/60 hover:bg-primary/5"
        >
          No projects in {workspace?.name ?? "this workspace"} yet. <span style={{ color: token.colorInfo }}>Create the first one</span>
        </button>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {recent.map((p) => {
            const ago = timeAgo(changedAt(p));
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p)}
                className="flex flex-col gap-3 rounded-2xl border border-line p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{ background: `color-mix(in srgb, ${token.colorBgContainer} 70%, transparent)` }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-content/5 px-3 py-1 text-sm text-content">Project</span>
                  {ago && <span className="text-sm text-muted">{ago}</span>}
                </span>
                <span className="truncate text-lg font-semibold text-content">{p.name}</span>
                <span className="truncate text-sm text-muted">
                  {workspace?.name}
                  {p.description ? ` · ${p.description}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}