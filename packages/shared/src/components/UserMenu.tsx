import { Avatar, Dropdown } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../auth/authSlice";

export function UserMenu() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  const initials = `${user.firstname[0] ?? ""}${user.lastname[0] ?? ""}`.toUpperCase();

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          { key: "me", disabled: true, label: <div><div className="font-medium">{user.firstname} {user.lastname}</div><div className="text-xs">{user.email}</div></div> },
          { type: "divider" },
          { key: "logout", icon: <LogoutOutlined />, label: "Sign out", danger: true, onClick: () => dispatch(logout()) },
        ],
      }}
    >
      <button type="button" className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-primary/10" aria-label="Account menu">
        <Avatar style={{ background: "rgb(var(--color-primary))" }}>{initials}</Avatar>
        <span className="hidden text-sm font-medium text-content sm:inline">{user.firstname}</span>
      </button>
    </Dropdown>
  );
}
