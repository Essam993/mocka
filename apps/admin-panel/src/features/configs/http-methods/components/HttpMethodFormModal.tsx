import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { createHttpMethod, updateHttpMethod } from "../../../../store/reducers/httpMethodSlice";
import { type HttpMethod } from "../../../../types/httpMethods";

interface FormValues {
  name: string;
}

interface Props {
  open: boolean;
  /** Pass a HTTP method to edit, omit to create */
  httpMethod?: HttpMethod;
  onClose: () => void;
}

export function HttpMethodFormModal({ open, httpMethod, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items, saving } = useAppSelector((s) => s.httpMethods);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: "" }, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    reset({ name: httpMethod?.name ?? "" });
    setServerError(null);
  }, [open, httpMethod, reset]);

  /** "201 Created": the 3-digit status, a space, then the text. The status number must be unique. */
  const validate = (raw: string) => {
    const v = raw.trim();
    if (!v) return "Enter the name";
    const other = items.find((c) => c.id !== httpMethod?.id && c.name.toLowerCase() === v.toLowerCase());
    return other ? `Method ${v} already exists ("${other.name}")` : true;
  };

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const name = v.name.trim();
    try {
      if (httpMethod) await dispatch(updateHttpMethod({ id: httpMethod.id, name })).unwrap();
      else await dispatch(createHttpMethod({ name })).unwrap();
      toast.success(httpMethod ? "HTTP method updated" : "HTTP method added");
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
      title={httpMethod ? "Update HTTP method" : "Add HTTP method"}
      description={httpMethod ? httpMethod.name : "Specify the name of the HTTP method to add"}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="http-method-form" loading={saving} size="middle">
            {httpMethod ? "Save changes" : "Add HTTP method"}
          </Button>
        </>
      }
    >
      <form id="http-method-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <Controller
          name="name"
          control={control}
          rules={{ validate }}
          render={({ field }) => <Input {...field} label="Name" required autoComplete="off" placeholder="METHOD" error={errors.name?.message} />}
        />
      </form>
    </Modal>
  );
}