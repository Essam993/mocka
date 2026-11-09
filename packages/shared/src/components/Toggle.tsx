import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  /** Small helper text under the label */
  description?: ReactNode;
  error?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, description, error, className, id, disabled, ...rest },
  ref,
) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
          error ? "border-red-500" : "border-line"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary"}`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-content">{label}</span>
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </span>

        <span className="relative inline-flex shrink-0">
          <input ref={ref} id={inputId} type="checkbox" role="switch" disabled={disabled} className="peer sr-only" {...rest} />
          {/* track */}
          <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40" />
          {/* thumb */}
          <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});