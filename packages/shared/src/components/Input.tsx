import { forwardRef } from "react";
import { Input as AntInput, type InputProps as AntInputProps, type InputRef } from "antd";
import { Field, useId, type FieldProps } from "./Field";

export type InputProps = AntInputProps & FieldProps;

export const Input = forwardRef<InputRef, InputProps>(({ label, error, hint, required, className, id, ...rest }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <AntInput ref={ref} id={inputId} size="large" status={error ? "error" : undefined} {...rest} />
    </Field>
  );
});
Input.displayName = "Input";

export const PasswordInput = forwardRef<InputRef, InputProps>(({ label, error, hint, required, className, id, ...rest }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <AntInput.Password ref={ref} id={inputId} size="large" status={error ? "error" : undefined} {...rest} />
    </Field>
  );
});
PasswordInput.displayName = "PasswordInput";
