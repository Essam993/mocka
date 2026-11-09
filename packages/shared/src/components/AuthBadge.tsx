import { Lock, LockOpen } from "lucide-react";
import { theme } from "antd";

export function AuthBadge({ required }: { required: boolean }) {
  const { token } = theme.useToken();
  const Icon = required ? Lock : LockOpen;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        required ? "" : "border-line text-muted"
      }`}
      style={
        required
          ? {
              background: token.colorPrimaryBg,
              color: token.colorPrimary,
              borderColor: token.colorPrimaryBorder,
            }
          : undefined
      }
    >
      <Icon className="size-3" />
      {required ? "Auth Required" : "Auth Optional"}
    </span>
  );
}