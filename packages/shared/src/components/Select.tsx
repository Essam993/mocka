import { forwardRef } from "react";
import { Select as AntSelect, type SelectProps as AntSelectProps } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { Field, useId, type FieldProps } from "./Field";

export type SelectProps = AntSelectProps & FieldProps;

/** antd Select with the same label / error / hint wrapper as Input. Works with react-hook-form Controller. */
export const Select = forwardRef<RefSelectProps, SelectProps>(({ label, error, hint, required, className, id, ...rest }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <AntSelect ref={ref} id={inputId} size="large" status={error ? "error" : undefined} style={{ width: "100%" }} {...rest} />
    </Field>
  );
});
Select.displayName = "Select";