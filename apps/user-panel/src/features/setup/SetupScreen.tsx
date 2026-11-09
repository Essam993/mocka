import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { theme } from "antd";
import { Check, Loader2 } from "lucide-react";
import { IconLogo, brand } from "@repo/shared";
import { useAppDispatch } from "../../store";
import { fetchCollectionApis } from "../../store/reducers/collectionApiSlice";

export interface SetupState {
  projectId: number;
  collectionId: number;
  projectName: string;
  collectionName: string;
  endpointCount: number;
}

const STEP_MS = 900;
const PROGRESS = [20, 60, 100];
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function SetupScreen() {
  const { state } = useLocation() as { state: SetupState | null };
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token } = theme.useToken();
  const [done, setDone] = useState(0); // 0, 1 or 2 finished steps

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    const { projectId, collectionId } = state;

    // the first step is really refreshing the list the APIs page shows
    const load = dispatch(fetchCollectionApis({ collectionId, force: true }));

    (async () => {
      await wait(STEP_MS);
      if (cancelled) return;
      setDone(1);
      await wait(STEP_MS);
      if (cancelled) return;
      setDone(2);
      await load; // resolves even if the request failed; the APIs page then shows its own error and retry
      await wait(400);
      if (!cancelled) navigate(`/projects/${projectId}/collections/${collectionId}/apis`, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // opened directly or after a refresh: nothing to set up
  if (!state) return <Navigate to="/" replace />;

  const n = state.endpointCount;
  const steps = [`Publishing ${n} endpoint${n === 1 ? "" : "s"}`, `Live in ${state.projectName}`];

  return (
    <div className="grid min-h-dvh place-items-center bg-page px-6">
      <div className="w-full max-w-lg" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <IconLogo className="h-8 w-auto" />
          <span className="text-3xl font-semibold tracking-tight text-content">mocka</span>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-content">Setting up your API</h1>
        <p className="mt-2 text-muted">A few seconds. You'll land in your {state.collectionName} collection.</p>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-content/10">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${PROGRESS[done]}%`, background: `linear-gradient(90deg, ${brand.primary}, ${token.colorInfo})` }}
          />
        </div>

        <ul className="mt-8 space-y-4">
          {steps.map((label, i) => {
            const status = i < done ? "done" : i === done ? "active" : "pending";
            return (
              <li key={label} className="flex items-center gap-4">
                {status === "done" ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-4" />
                  </span>
                ) : status === "active" ? (
                  <Loader2 className="size-6 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
                ) : (
                  <span className="size-6 shrink-0 rounded-full border border-line" />
                )}
                <span className={status === "pending" ? "text-muted/60" : "text-content"}>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}