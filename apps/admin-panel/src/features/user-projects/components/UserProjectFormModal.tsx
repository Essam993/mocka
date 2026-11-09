import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Input, Modal, getErrorMessage, useAppDispatch } from "@repo/shared";
import { useAppSelector } from "../../../store";
import { UserProject, UserProjectInput } from "../../../types/userProject";
import { createUserProject, updateUserProject } from "../../../store/reducers/userProjectSlice";

type FormValues = Pick<UserProjectInput, "name" | "description">;

const emptyValues: FormValues = { name: "", description: "" };
const toValues = (u?: UserProject): FormValues =>
  u ? { name: u.name, description: u.description } : emptyValues;

interface Props {
  open: boolean;
  /** The user these projects belong to */
  userId: number;
  /** Pass a project to edit, omit to create */
  project?: UserProject;
  onClose: () => void;
}

export function UserProjectFormModal({ open, userId, project, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { saving } = useAppSelector((s) => s.userProjects);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyValues, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (open) {
      reset(toValues(project));
      setServerError(null);
    }
  }, [open, project, reset]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const input: UserProjectInput = {
      userId,
      name: v.name.trim(),
      description: v.description.trim(),
    };
    try {
      if (project) await dispatch(updateUserProject({ ...input, id: project.id })).unwrap();
      else await dispatch(createUserProject(input)).unwrap();
      message.success(project ? "User project updated" : "User project created");
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
      icon={<UserOutlined />}
      title={project ? "Edit user project" : "Add user project"}
      description={project ? project.name : "Fill in the details to create a new user project."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="user-project-form" loading={saving} size="middle">
            {project ? "Save changes" : "Create user project"}
          </Button>
        </>
      }
    >
      <form id="user-project-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="name"
            control={control}
            rules={nameRules("name")}
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