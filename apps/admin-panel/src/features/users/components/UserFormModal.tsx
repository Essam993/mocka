import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Button, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Input, Modal, Select, getErrorMessage, useAppDispatch } from "@repo/shared";
import { KNOWN_CONTEXTS, KNOWN_USER_TYPES, humanize, type User, type UserInput } from "../../../types/userTypes";
import { useAppSelector } from "../../../store";
import { createUser, updateUser } from "../../../store/reducers/usersSlice";

type FormValues = Omit<UserInput, "userTypeId">;

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const emptyValues: FormValues = { firstName: "", lastName: "", userName: "", userType: "", context: "PLATFORM", contextValue: "" };
const toValues = (u?: User): FormValues =>
  u ? { firstName: u.firstName, lastName: u.lastName, userName: u.userName, userType: u.userType, context: u.context, contextValue: u.contextValue } : emptyValues;

interface Props {
  open: boolean;
  /** Pass a user to edit, omit to create */
  user?: User;
  onClose: () => void;
}

export function UserFormModal({ open, user, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { items, saving } = useAppSelector((s) => s.users);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: emptyValues, mode: "onTouched" });

  // fresh form every time the modal opens
  useEffect(() => {
    if (open) {
      reset(toValues(user));
      setServerError(null);
    }
  }, [open, user, reset]);

  // userType ↔ userTypeId mapping: known types + whatever the loaded data contains
  const typeMap = useMemo(() => {
    const m = new Map<string, number>(KNOWN_USER_TYPES.map((t) => [t.value, t.id]));
    items.forEach((u) => m.set(u.userType, u.userTypeId));
    return m;
  }, [items]);
  const typeOptions = useMemo(() => [...typeMap.keys()].map((v) => ({ value: v, label: humanize(v) })), [typeMap]);
  const contextOptions = useMemo(() => [...new Set([...KNOWN_CONTEXTS, ...items.map((u) => u.context)])].map((v) => ({ value: v, label: humanize(v) })), [items]);

  const submit = handleSubmit(async (v) => {
    setServerError(null);
    const input: UserInput = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      userName: v.userName.trim(),
      userType: v.userType,
      userTypeId: typeMap.get(v.userType)!,
      context: v.context,
      contextValue: v.contextValue.trim(),
    };
    try {
      if (user) await dispatch(updateUser({ ...input, id: user.id })).unwrap();
      else await dispatch(createUser(input)).unwrap();
      message.success(user ? "User updated" : "User created");
      onClose();
    } catch (e) {
      setServerError(getErrorMessage(e)); // keep the modal open so nothing typed is lost
    }
  });

  const nameRules = (label: string) => ({
    required: `Enter the ${label}`,
    minLength: { value: 2, message: "At least 2 characters" },
    maxLength: { value: 50, message: "At most 50 characters" },
    validate: (v: string) => NAME_RE.test(v.trim()) || "Use letters, spaces, apostrophes, dots or hyphens only",
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="md"
      align="center"
      icon={<UserOutlined />}
      title={user ? "Edit user" : "Add user"}
      description={user ? `${user.firstName} ${user.lastName}` : "Fill in the details to create a new user."}
      footer={
        <>
          <Button onClick={onClose} disabled={saving} size="middle">Cancel</Button>
          <Button type="primary" htmlType="submit" form="user-form" loading={saving} size="middle">{user ? "Save changes" : "Create user"}</Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert type="error" showIcon message={serverError} closable onClose={() => setServerError(null)} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller name="firstName" control={control} rules={nameRules("first name")} render={({ field }) => <Input {...field} label="First name" required autoComplete="off" error={errors.firstName?.message} />} />
          <Controller name="lastName" control={control} rules={nameRules("last name")} render={({ field }) => <Input {...field} label="Last name" required autoComplete="off" error={errors.lastName?.message} />} />
        </div>

        <Controller name="userName" control={control}
          rules={{
            required: "Enter the email",
            maxLength: { value: 100, message: "At most 100 characters" },
            pattern: { value: EMAIL_RE, message: "Enter a valid email, e.g. name@company.com" },
            validate: (v) => !items.some((u) => u.id !== user?.id && u.userName.toLowerCase() === v.trim().toLowerCase()) || "Another user already uses this email",
          }}
          render={({ field }) => <Input {...field} label="Email (username)" required type="email" autoComplete="off" error={errors.userName?.message} />} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller name="userType" control={control} rules={{ required: "Choose a user type" }}
            render={({ field }) => <Select {...field} label="User type" required options={typeOptions} placeholder="Select a type" error={errors.userType?.message} />} />
          <Controller name="context" control={control} rules={{ required: "Choose a context" }}
            render={({ field }) => <Select {...field} label="Context" required options={contextOptions} placeholder="Select a context" error={errors.context?.message} />} />
        </div>

        <Controller name="contextValue" control={control}
          rules={{ required: "Enter the context value", maxLength: { value: 50, message: "At most 50 characters" }, validate: (v) => v.trim().length > 0 || "Enter the context value" }}
          render={({ field }) => <Input {...field} label="Context value" required autoComplete="off" error={errors.contextValue?.message} />} />

      </form>
    </Modal>
  );
}