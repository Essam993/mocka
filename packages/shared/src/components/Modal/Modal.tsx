import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseOutlined } from "@ant-design/icons";

/** Preset widths, or any number (px) / CSS length like "40rem" or "70%". */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full" | number | string;
/** Where the panel sits: a centered dialog, a top dialog, a side sheet (left/right) or a bottom sheet. */
export type ModalAlign = "center" | "top" | "left" | "right" | "bottom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Small icon chip shown before the title */
  icon?: ReactNode;
  size?: ModalSize; // default "md"
  align?: ModalAlign; // default "center"
  /** Sticky footer, usually the action buttons */
  footer?: ReactNode;
  children?: ReactNode;
  /** Show the × button (default true) */
  closable?: boolean;
  closeOnOverlay?: boolean; // default true
  closeOnEsc?: boolean; // default true
  /** While true (e.g. saving) the modal can't be closed by × / Esc / backdrop */
  busy?: boolean;
  /** Called after the close animation finished */
  afterClose?: () => void;
  className?: string;
  bodyClassName?: string;
}

const widths: Record<string, string> = { sm: "24rem", md: "32rem", lg: "42rem", xl: "56rem", full: "100%" };
const resolveWidth = (s: ModalSize) => (typeof s === "number" ? `${s}px` : (widths[s] ?? s));

// Full class names on purpose: Tailwind only generates classes it can see as complete strings.
const wrapper: Record<ModalAlign, string> = {
  center: "items-center justify-center p-4",
  top: "items-start justify-center p-4 pt-[8vh]",
  left: "items-stretch justify-start p-2 sm:p-3",
  right: "items-stretch justify-end p-2 sm:p-3",
  bottom: "items-end justify-center p-0 sm:p-4",
};
const shape: Record<ModalAlign, string> = {
  center: "max-h-full rounded-2xl",
  top: "max-h-full rounded-2xl",
  left: "rounded-2xl",
  right: "rounded-2xl",
  bottom: "max-h-full rounded-t-3xl sm:rounded-3xl",
};
const hiddenState: Record<ModalAlign, string> = {
  center: "scale-95 opacity-0",
  top: "-translate-y-6 opacity-0",
  left: "-translate-x-[110%]",
  right: "translate-x-[110%]",
  bottom: "translate-y-full",
};
const SHOWN = "translate-x-0 translate-y-0 scale-100 opacity-100";
const CLOSE_MS = 250;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Page scroll lock shared by stacked modals
let locks = 0;
let saved = { overflow: "", paddingRight: "" };
const lockScroll = () => {
  if (locks++ > 0) return;
  const b = document.body;
  saved = { overflow: b.style.overflow, paddingRight: b.style.paddingRight };
  const bar = window.innerWidth - document.documentElement.clientWidth;
  b.style.overflow = "hidden";
  if (bar > 0) b.style.paddingRight = `${bar}px`;
};
const unlockScroll = () => {
  if (--locks > 0) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
};

/**
 * Centralized modal: blurred backdrop, rounded panel, sticky header/footer, scrolling body,
 * animated per alignment, focus trap, Esc / backdrop close and page-scroll lock.
 *
 * <Modal open={open} onClose={close} title="Add user" size="lg" align="right" footer={<Button>Save</Button>}>…</Modal>
 */
export function Modal({
  open, onClose, title, description, icon, size = "md", align = "center", footer, children,
  closable = true, closeOnOverlay = true, closeOnEsc = true, busy = false, afterClose, className, bodyClassName,
}: ModalProps) {
  const [mounted, setMounted] = useState(open); // stays true during the close animation
  const [shown, setShown] = useState(false); // drives the enter/leave transition
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const downOnBackdrop = useRef(false);
  const titleId = useId();
  const descId = useId();

  // mount → animate in; close → animate out → unmount
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    if (!mounted) return;
    const t = setTimeout(() => {
      setMounted(false);
      afterClose?.();
    }, CLOSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open && !mounted) return;
    lockScroll();
    return unlockScroll;
  }, [open, mounted]);

  // focus the first field (or [data-autofocus]) on open, give focus back on close
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const target = bodyRef.current?.querySelector<HTMLElement>(`[data-autofocus],${FOCUSABLE}`) ?? panelRef.current;
    target?.focus({ preventScroll: true });
    return () => {
      before?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open && !mounted) return null;

  const close = () => !busy && onClose();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // let an open Select/dropdown consume Esc first
      if ((e.target as HTMLElement).closest('[aria-expanded="true"]')) return;
      if (closeOnEsc) {
        e.stopPropagation();
        close();
      }
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return e.preventDefault();
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) (e.preventDefault(), last.focus());
    else if (!e.shiftKey && active === last) (e.preventDefault(), first.focus());
  };

  const sheet = align === "left" || align === "right";
  const fullHeight = size === "full" && !sheet && align !== "bottom" ? "h-full" : "";
  const hasHeader = !!(title || description || icon || closable);

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex ${wrapper[align]}`}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => closeOnOverlay && downOnBackdrop.current && e.target === e.currentTarget && close()}
    >
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={{ width: `min(${resolveWidth(size)}, 100%)` }}
        className={`relative flex flex-col overflow-hidden border border-line bg-surface text-content shadow-soft outline-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/70 before:to-transparent motion-reduce:transition-none ${shape[align]} ${fullHeight} ${shown ? SHOWN : hiddenState[align]} ${className ?? ""}`}
      >
        {hasHeader && (
          <header className="flex shrink-0 items-start gap-3 border-b border-line/70 px-6 py-5">
            {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg text-primary">{icon}</span>}
            <div className="min-w-0 flex-1">
              {title && <h2 id={titleId} className="text-lg font-semibold leading-6 tracking-tight text-content">{title}</h2>}
              {description && <p id={descId} className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            {closable && (
              <button type="button" aria-label="Close" onClick={close} disabled={busy}
                className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-content/5 hover:text-content disabled:cursor-not-allowed disabled:opacity-40">
                <CloseOutlined />
              </button>
            )}
          </header>
        )}

        <div ref={bodyRef} className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${bodyClassName ?? ""}`}>
          {children}
        </div>

        {footer && <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line/70 bg-page/40 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}