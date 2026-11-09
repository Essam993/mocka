import type { ReactNode } from "react";
import { Tabs as AntTabs, type TabsProps as AntTabsProps } from "antd";

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}
export interface TabsProps extends Omit<AntTabsProps, "items"> {
  items: TabItem[];
}

export function Tabs({ items, className, ...rest }: TabsProps) {
  return (
    <AntTabs
      className={className}
      items={items.map(({ content, ...t }) => ({ ...t, children: content }))}
      {...rest}
    />
  );
}
