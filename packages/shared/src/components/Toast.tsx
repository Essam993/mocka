import { useEffect, type ReactNode } from "react";
import { notification } from "antd";
import type { NotificationInstance } from "antd/es/notification/interface";
import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { getErrorMessage } from "../api/client"; // ★ adjust to where getErrorMessage lives in shared

type Kind = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  description?: ReactNode;
  /** seconds, 0 = stays until closed */
  duration?: number;
  /** reuse a key to update an existing toast in place */
  key?: string;
  /** e.g. an Undo button */
  action?: ReactNode;
}

const ICONS: Record<Kind, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <XCircle className="size-5 text-rose-500" />,
  warning: <TriangleAlert className="size-5 text-amber-500" />,
  info: <Info className="size-5 text-sky-500" />,
  loading: <Loader2 className="size-5 animate-spin text-primary" />,
};

const DURATION: Record<Kind, number> = { success: 3, info: 3, warning: 4, error: 6, loading: 0 };

let instance: NotificationInstance | null = null;

function open(kind: Kind, title: ReactNode, opts: ToastOptions = {}) {
  const key = opts.key ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const config = {
    key,
    message: <span className="text-sm font-semibold text-content">{title}</span>,
    description: opts.description && <span className="text-sm text-muted">{opts.description}</span>,
    icon: ICONS[kind],
    duration: opts.duration ?? DURATION[kind],
    btn: opts.action,
    className: "!rounded-2xl !border !border-line !bg-surface !p-4 !shadow-lg",
    role: kind === "error" ? ("alert" as const) : ("status" as const),
  };
  // falls back to the static API if the provider isn't mounted yet (not themed, but never lost)
  (instance ?? notification).open(config);
  return key;
}

export const toast = {
  success: (title: ReactNode, opts?: ToastOptions) => open("success", title, opts),
  error: (title: ReactNode, opts?: ToastOptions) => open("error", title, opts),
  warning: (title: ReactNode, opts?: ToastOptions) => open("warning", title, opts),
  info: (title: ReactNode, opts?: ToastOptions) => open("info", title, opts),
  loading: (title: ReactNode, opts?: ToastOptions) => open("loading", title, opts),
  dismiss: (key?: string) => (instance ?? notification).destroy(key),

  /** One toast that goes loading → success / error. Re-throws so callers can still handle the error. */
  async promise<T>(
    p: Promise<T>,
    msgs: { loading: ReactNode; success: ReactNode | ((r: T) => ReactNode); error?: ReactNode | ((e: unknown) => ReactNode) },
  ): Promise<T> {
    const key = open("loading", msgs.loading);
    try {
      const result = await p;
      open("success", typeof msgs.success === "function" ? msgs.success(result) : msgs.success, { key });
      return result;
    } catch (e) {
      const title = msgs.error ? (typeof msgs.error === "function" ? msgs.error(e) : msgs.error) : getErrorMessage(e);
      open("error", title, { key });
      throw e;
    }
  },
};

/** Mount once per app, inside <ConfigProvider> so toasts follow the theme. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [api, holder] = notification.useNotification({
    placement: "bottomRight",
    maxCount: 4,
    stack: { threshold: 3 },
    showProgress: true,
    pauseOnHover: true,
  });

  instance = api; // available during the first render for child effects

  useEffect(() => {
    instance = api; // re-set after StrictMode's mount → unmount → mount
    return () => {
      if (instance === api) instance = null;
    };
  }, [api]);

  return (
    <>
      {holder}
      {children}
    </>
  );
}