import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { createHttpCode, updateHttpCode } from "../../../../store/reducers/httpCodesSlice";
import { codeNumber, type HttpCode } from "../../../../types/httpCodes";

interface FormValues {
  name: string;
}

interface Props {
  open: boolean;
  /** Pass a status code to edit, omit to create */
  httpCode?: HttpCode;
  onClose: () => void;
}

export function HttpCodeFormModal({ open, httpCode, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items, saving } = useAppSelector((s) => s.httpCodes);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: "" }, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    reset({ name: httpCode?.name ?? "" });
    setServerError(null);
  }, [open, httpCode, reset]);

  /** "201 Created": the 3-digit status, a space, then the text. The status number must be unique. */
  const validate = (raw: string) => {
    const v = raw.trim();
    if (!v) return "Enter the name";
    if (v.length > 60) return "At most 60 characters";
    if (!/^[1-5]\d{2} \S/.test(v)) return 'Start with the 3-digit code, a space, then the text, e.g. "418 I\'m a teapot"';
    const n = codeNumber(v);
    const other = items.find((c) => c.id !== httpCode?.id && (codeNumber(c.name) === n || c.name.toLowerCase() === v.toLowerCase()));
    return other ? `Status ${n} already exists ("${other.name}")` : true;
  };

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const name = v.name.trim();
    try {
      if (httpCode) await dispatch(updateHttpCode({ id: httpCode.id, name })).unwrap();
      else await dispatch(createHttpCode({ name })).unwrap();
      toast.success(httpCode ? "Status code updated" : "Status code added");
      onClose();
    } catch (e) {
      setServerError(getErrorMessage(e)); // keep the modal open so nothing typed is lost
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      align="center"
      icon={<ApiOutlined />}
      title={httpCode ? "Update status code" : "Add status code"}
      description={httpCode ? httpCode.name : "Shown in the status dropdown of every endpoint response."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="http-code-form" loading={saving} size="middle">
            {httpCode ? "Save changes" : "Add status code"}
          </Button>
        </>
      }
    >
      <form id="http-code-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <Controller
          name="name"
          control={control}
          rules={{ validate }}
          render={({ field }) => <Input {...field} label="Name" required autoComplete="off" placeholder="201 Created" error={errors.name?.message} />}
        />
      </form>
    </Modal>
  );
}