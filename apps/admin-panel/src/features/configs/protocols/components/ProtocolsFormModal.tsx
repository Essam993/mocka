import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { ApiOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, toast } from "@repo/shared";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { createProtocol, updateProtocol } from "../../../../store/reducers/protocolsSlice";
import { type Protocols } from "../../../../types/protocols";

interface FormValues {
  name: string;
}

interface Props {
  open: boolean;
  /** Pass a Protocol to edit, omit to create */
  Protocols?: Protocols;
  onClose: () => void;
}

export function ProtocolsFormModal({ open, Protocols, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items, saving } = useAppSelector((s) => s.protocols);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: "" }, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    reset({ name: Protocols?.name ?? "" });
    setServerError(null);
  }, [open, Protocols, reset]);

  /** "201 Created": the 3-digit status, a space, then the text. The status number must be unique. */
  const validate = (raw: string) => {
    const v = raw.trim();
    if (!v) return "Enter the name";
    const other = items.find((c) => c.id !== Protocols?.id && c.name.toLowerCase() === v.toLowerCase());
    return other ? `Protocol ${v} already exists ("${other.name}")` : true;
  };

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const name = v.name.trim();
    try {
      if (Protocols) await dispatch(updateProtocol({ id: Protocols.id, name })).unwrap();
      else await dispatch(createProtocol({ name })).unwrap();
      toast.success(Protocols ? "Protocol updated" : "Protocol added");
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
      title={Protocols ? "Update Protocol" : "Add Protocol"}
      description={Protocols ? Protocols.name : "Shown in API requests"}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="protocol-form" loading={saving} size="middle">
            {Protocols ? "Save changes" : "Add Protocol"}
          </Button>
        </>
      }
    >
      <form id="protocol-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
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