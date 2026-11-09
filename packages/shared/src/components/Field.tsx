import { useId, type ReactNode } from "react";

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

/** Label + error/hint wrapper shared by Input, PasswordInput and TextArea. */
export function Field({ label, error, hint, required, className, children, htmlFor }: FieldProps & { children: ReactNode; htmlFor: string }) {
  return (
    <div className={`flex w-full flex-col gap-1.5 ${className ?? ""}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-content">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
export { useId };
