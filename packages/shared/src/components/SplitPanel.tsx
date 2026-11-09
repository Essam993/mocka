import { useEffect, useRef, type ReactNode } from "react";

interface SplitPanelProps {
  open: boolean;
  /** Content of the side panel (rendered inside a full-height sticky box) */
  panel: ReactNode;
  /** CSS width of the open panel */
  width?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Page content on the left, a collapsible panel on the right, in the same flow (no overlay).
 * Opening shrinks the content; closing gives the space back.
 */
export function SplitPanel({ open, panel, width = "28rem", className, children }: SplitPanelProps) {
  const asideRef = useRef<HTMLElement>(null);

  // closed content must not be reachable with Tab
  useEffect(() => {
    asideRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  return (
    <div
      className={`grid p-transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${className ?? ""}`}
      style={{ gridTemplateColumns: `minmax(0, 1fr) ${open ? `min(${width}, 100%)` : "0px"}` }}
    >
      <div className="min-w-0">{children}</div>
      {/* overflow-x-clip (not hidden) so the sticky child still sticks */}
      <aside ref={asideRef} aria-hidden={!open} className="min-w-0 overflow-x-clip">
        <div className="sticky top-20 h-[calc(100dvh-6rem)] max-w-[100vw] pl-4">
          {panel}
        </div>
      </aside>
    </div>
  );
}