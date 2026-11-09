import type { ReactNode } from "react";
import { AppearanceButton } from "./AppearanceModal";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export interface Crumb {
  label: string;
  onClick?: () => void;
}
interface NavbarProps {
  /** Logo / app name (user panel). Optional when the sidebar already shows the brand. */
  brand?: ReactNode;
  /** Slot at the start (e.g. sidebar toggle buttons) */
  leading?: ReactNode;
  /** Page location; the last crumb is the current page */
  breadcrumbs?: Crumb[];
  /** Center content (e.g. top navigation links) */
  children?: ReactNode;
  /** Extra actions placed before the default theme/appearance/user buttons */
  actions?: ReactNode;
  /** Hide the avatar menu (e.g. when the sidebar already has the user card) */
  hideUserMenu?: boolean;
}

export function Navbar({ brand, leading, breadcrumbs, children, actions, hideUserMenu }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line/70  px-4 backdrop-blur-xl md:px-6">
      {leading}
      {brand && <div className="flex items-center gap-2 text-lg font-semibold text-content">{brand}</div>}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((c, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={c.label} className="flex min-w-0 items-center gap-2">
                  {i > 0 && <span aria-hidden className="text-muted">/</span>}
                  {last ? (
                    <h1 aria-current="page" className="truncate text-base font-semibold tracking-tight text-content">{c.label}</h1>
                  ) : (
                    <button type="button" onClick={c.onClick} className="truncate text-muted hover:text-content">{c.label}</button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-1 items-center gap-1 px-2">{children}</div>
      <div className="flex items-center gap-1">
        {actions}
        <AppearanceButton />
        <ThemeToggle />
        {!hideUserMenu && <UserMenu />}
      </div>
    </header>
  );
}