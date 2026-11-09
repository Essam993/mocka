import type { ReactNode } from "react";
import { Badge, Button, Popover } from "antd";
import { BellOutlined } from "@ant-design/icons";

export interface NotificationItem {
  id: string | number;
  title: string;
  description?: string;
  time?: string;
  unread?: boolean;
}

export function NotificationsButton({ items, footer }: { items: NotificationItem[]; footer?: ReactNode }) {
  const unread = items.filter((i) => i.unread).length;
  const content = (
    <div className="w-80 max-w-[calc(100vw-4rem)]">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="font-medium text-content">Notifications</span>
        {unread > 0 && <span className="text-xs text-primary">{unread} new</span>}
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">You're all caught up</div>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-primary" : "bg-transparent"}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-content">{n.title}</div>
                {n.description && <div className="text-sm text-muted">{n.description}</div>}
                {n.time && <div className="mt-0.5 text-xs text-muted">{n.time}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </div>
  );
  return (
    <Popover content={content} trigger="click" placement="bottomRight" arrow={false}>
      <Badge count={unread} size="small" offset={[-6, 6]}>
        <Button type="text" shape="circle" aria-label="Notifications" icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
}
