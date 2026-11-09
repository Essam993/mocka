import { forwardRef } from "react";
import { Input as AntInput } from "antd";
import type { TextAreaProps as AntTextAreaProps } from "antd/es/input";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { Field, useId, type FieldProps } from "./Field";

export type TextAreaProps = AntTextAreaProps & FieldProps;

export const TextArea = forwardRef<TextAreaRef, TextAreaProps>(({ label, error, hint, required, className, id, rows = 4, ...rest }, ref) => {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <AntInput.TextArea ref={ref} id={inputId} rows={rows} status={error ? "error" : undefined} {...rest} />
    </Field>
  );
});
TextArea.displayName = "TextArea";
