import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { useAppSelector } from "../store";
import { applyTheme, getAntdTheme } from "../theme/themeSlice";

/** Wrap your app once (inside <Provider store>). Syncs Redux theme → <html> classes/vars + Ant Design. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppSelector((s) => s.theme);
  useLayoutEffect(() => applyTheme(theme), [theme]);
  const antd = useMemo(() => getAntdTheme(theme), [theme]);
  return <ConfigProvider theme={antd}>{children}</ConfigProvider>;
}
