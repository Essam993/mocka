import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button } from "antd";
import { FolderOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, toast, useAppDispatch } from "@repo/shared";
import { useAppSelector } from "../../../store";
import { UserProject, UserProjectInput } from "../../../types/userProject";
import { createUserProject, updateUserProject } from "../../../store/reducers/userProjectSlice";

type FormValues = Pick<UserProjectInput, "name" | "description">;

const emptyValues: FormValues = { name: "", description: "" };
const toValues = (u?: UserProject): FormValues => (u ? { name: u.name, description: u.description ?? "" } : emptyValues);

interface Props {
  open: boolean;
  /** Pass a project to edit, omit to create */
  project?: UserProject;
  onClose: () => void;
}

export function UserProjectFormModal({ open, project, onClose }: Props) {
  const dispatch = useAppDispatch();
  const workspaceId = useAppSelector((s) => s.scope.workspaceId);
  const { saving } = useAppSelector((s) => s.userProjects);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: emptyValues, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (open) {
      reset(toValues(project));
      setServerError(null);
    }
  }, [open, project, reset]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const input = {
      name: v.name.trim(),
      description: v.description.trim(),
      workspaceId: project?.workspaceId ?? workspaceId ?? undefined,
    } as UserProjectInput;
    try {
      if (project) await dispatch(updateUserProject({ ...input, id: project.id } as UserProject)).unwrap();
      else await dispatch(createUserProject(input)).unwrap();
      toast.success(project ? "Project updated" : "Project created");
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
      icon={<FolderOutlined />}
      title={project ? "Edit project" : "Add project"}
      description={project ? project.name : "Fill in the details to create a new project in this workspace."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="project-form" loading={saving} size="middle">
            {project ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="name"
            control={control}
            rules={{
              required: "Enter the name",
              minLength: { value: 2, message: "At least 2 characters" },
              maxLength: { value: 50, message: "At most 50 characters" },
            }}
            render={({ field }) => <Input {...field} label="Name" required autoComplete="off" error={errors.name?.message} />}
          />
          <Controller
            name="description"
            control={control}
            rules={{ maxLength: { value: 100, message: "At most 100 characters" } }}
            render={({ field }) => <Input {...field} label="Description" autoComplete="off" error={errors.description?.message} />}
          />
        </div>
      </form>
    </Modal>
  );
}