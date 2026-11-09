import { Controller, useForm } from "react-hook-form";
import { Button, message } from "antd";
import { Input, Tabs, TextArea, useAppSelector } from "@repo/shared";

interface Form {
  firstname: string;
  lastname: string;
  bio: string;
}

export default function Profile() {
  const user = useAppSelector((s) => s.auth.user)!;
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { firstname: user.firstname, lastname: user.lastname, bio: "" } });

  const details = (
    <form onSubmit={handleSubmit(() => message.success("Profile updated"))} className="flex max-w-lg flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller name="firstname" control={control} rules={{ required: "Enter your first name" }} render={({ field }) => <Input {...field} label="First name" error={errors.firstname?.message} />} />
        <Controller name="lastname" control={control} rules={{ required: "Enter your last name" }} render={({ field }) => <Input {...field} label="Last name" error={errors.lastname?.message} />} />
      </div>
      <Controller name="bio" control={control} render={({ field }) => <TextArea {...field} label="About you" />} />
      <Button type="primary" htmlType="submit" className="self-start">Save changes</Button>
    </form>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-content">Profile</h1>
      <div className="rounded-xl border border-line bg-surface p-5">
        <Tabs items={[
          { key: "details", label: "Details", content: details },
          { key: "grants", label: "Permissions", content: <ul className="list-inside list-disc text-content">{user.grants.map((g) => <li key={g.name}>{g.name}</li>)}</ul> },
        ]} />
      </div>
    </div>
  );
}
