import { Button, Tooltip } from "antd";
import { useAppDispatch, useAppSelector } from "../store";
import { toggleMode } from "../theme/themeSlice";
import { MoonIcon, SunIcon } from "./icons";

/** Light/dark toggle button — drop it anywhere. */
export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);
  return (
    <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
      <Button type="text" shape="circle" aria-label="Toggle theme" className="text-primary" onClick={() => dispatch(toggleMode())} icon={mode === "dark" ? <SunIcon /> : <MoonIcon />} />
    </Tooltip>
  );
}
