import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { createContentTypes, updateContentTypes } from "../../../../store/reducers/contentTypesSlice";
import { type ContentTypes } from "../../../../types/contentTypes";

interface FormValues {
  name: string;
}

interface Props {
  open: boolean;
  /** Pass a Content Type to edit, omit to create */
  ContentTypes?: ContentTypes;
  onClose: () => void;
}

export function ContentTypesFormModal({ open, ContentTypes, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items, saving } = useAppSelector((s) => s.contentTypes);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: "" }, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    reset({ name: ContentTypes?.name ?? "" });
    setServerError(null);
  }, [open, ContentTypes, reset]);

  /** "201 Created": the 3-digit status, a space, then the text. The status number must be unique. */
  const validate = (raw: string) => {
    const v = raw.trim();
    if (!v) return "Enter the name";
    const other = items.find((c) => c.id !== ContentTypes?.id && c.name.toLowerCase() === v.toLowerCase());
    return other ? `Content Type ${v} already exists ("${other.name}")` : true;
  };

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const name = v.name.trim();
    try {
      if (ContentTypes) await dispatch(updateContentTypes({ id: ContentTypes.id, name })).unwrap();
      else await dispatch(createContentTypes({ name })).unwrap();
      toast.success(ContentTypes ? "Content Type updated" : "Content Type added");
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
      title={ContentTypes ? "Update Content Type" : "Add Content Type"}
      description={ContentTypes ? ContentTypes.name : "Shown in the status dropdown of every endpoint response."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="http-content-type-form" loading={saving} size="middle">
            {ContentTypes ? "Save changes" : "Add Content Type"}
          </Button>
        </>
      }
    >
      <form id="http-content-type-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <Controller
          name="name"
          control={control}
          rules={{ validate }}
          render={({ field }) => <Input {...field} label="Name" required autoComplete="off" placeholder="please enter the name" error={errors.name?.message} />}
        />
      </form>
    </Modal>
  );
}