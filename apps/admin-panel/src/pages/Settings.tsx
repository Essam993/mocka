import { Controller, useForm } from "react-hook-form";
import { Button, message } from "antd";
import { Input, Tabs, TextArea } from "@repo/shared";

interface Form {
  workspace: string;
  description: string;
}

function General() {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { workspace: "", description: "" } });
  return (
    <form onSubmit={handleSubmit(() => message.success("Settings saved"))} className="flex max-w-lg flex-col gap-4">
      <Controller name="workspace" control={control} rules={{ required: "Enter a workspace name" }}
        render={({ field }) => <Input {...field} label="Workspace name" error={errors.workspace?.message} />} />
      <Controller name="description" control={control}
        render={({ field }) => <TextArea {...field} label="Description" hint="Shown to your team members" />} />
      <Button type="primary" htmlType="submit" className="self-start">Save changes</Button>
    </form>
  );
}

export default function Settings() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-line bg-page/60 p-6">
        <Tabs items={[
          { key: "general", label: "General", content: <General /> },
          { key: "security", label: "Security", content: <p className="text-muted">Security options go here.</p> },
        ]} />
      </div>
    </div>
  );
}
