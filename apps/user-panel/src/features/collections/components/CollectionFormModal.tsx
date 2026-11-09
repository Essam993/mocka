import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, message } from "antd";
import { Input, Modal, Toggle, getErrorMessage, useAppDispatch } from "@repo/shared";
import { useAppSelector } from "../../../store";
import { ProjectCollection } from "../../../types/projectCollection";
import { ProjectCollectionInput } from "../../../types/projectCollection";
import { createProjectCollection, updateProjectCollection } from "../../../store/reducers/projectCollectionSlice";
import { useParams } from "react-router";
import { LibraryBig } from "lucide-react";

type FormValues = Omit<ProjectCollectionInput, "id">;



const emptyValues: FormValues = { name: "", required: false, projectId: 0 };
const toValues = (u?: ProjectCollection): FormValues =>
  u ? { name: u.name, required: u.required, projectId: u.projectId } : emptyValues;

interface Props {
  open: boolean;
  /** Pass a collection to edit, omit to create */
  collection?: ProjectCollection;
  /** Needed when the modal is used outside /projects/:projectId/... */
  projectId?: number;
  onClose: () => void;
}

export function CollectionFormModal({ open, collection, projectId: projectIdProp, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { projectId: fromUrl } = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? Number(fromUrl);
  const { items, saving } = useAppSelector((s) => s.projectCollections);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: emptyValues, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (open) {
      reset(toValues(collection));
      setServerError(null);
    }
  }, [open, collection, reset]);


  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const input: ProjectCollectionInput = {
      name: v.name.trim(),
      required: v.required,
      projectId: Number(projectId),
    };
    try {
      if (collection) await dispatch(updateProjectCollection({ ...input, id: collection.id })).unwrap();
      else await dispatch(createProjectCollection(input)).unwrap();
      message.success(collection ? "Collection updated" : "Collection created");
      onClose();
    } catch (e) {
      setServerError(getErrorMessage(e)); // keep the modal open so nothing typed is lost
    }
  });

  const nameRules = (label: string) => ({
    required: `Enter the ${label}`,
    minLength: { value: 2, message: "At least 2 characters" },
    maxLength: { value: 50, message: "At most 50 characters" },

  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      align="center"
      icon={<LibraryBig className="size-5" />}
      title={collection ? "Update Collection" : "Add Collection"}
      description={collection ? `${collection.name}` : "Fill in the details to create a new user collection."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="user-form" loading={saving} size="middle">{collection ? "Save changes" : "Create collection"}</Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <div className="grid space-y-4 sm:grid-cols-1">
          <Controller name="name" control={control} rules={nameRules("name")} render={({ field }) => <Input {...field} label="Name" required autoComplete="off" error={errors.name?.message} />} />
          <Controller
            name="required"
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
              <Toggle
                {...field}
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                label="Auth required"
                description="Requests to this collection must be authenticated."
                error={errors.required?.message}
                className="sm:col-span-2"
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
}