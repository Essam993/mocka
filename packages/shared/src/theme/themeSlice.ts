import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { theme as antdTheme, type ThemeConfig } from "antd";
import { brand } from "./brand";
import { defaultBackground, getBackground, type ThemeMode } from "./presets";
import { loadJSON } from "../store/storage";

export interface ThemeState {
  mode: ThemeMode;
  background: string;
  accent: string;
  lastDark: string;
  lastLight: string;
}

const defaults = (): ThemeState => ({
  mode: "dark",
  background: defaultBackground.dark,
  accent: brand.secondary,
  lastDark: defaultBackground.dark,
  lastLight: defaultBackground.light,
});

const slice = createSlice({
  name: "theme",
  // lazy initializer → runs when the store is created (after the storage prefix is set)
  initialState: (): ThemeState => ({ ...defaults(), ...loadJSON<Partial<ThemeState>>("theme", {}) }),
  reducers: {
    /** Navbar toggle: flips between your last used dark and light backgrounds. */
    toggleMode(state) {
      const next: ThemeMode = state.mode === "dark" ? "light" : "dark";
      state.mode = next;
      state.background = next === "dark" ? state.lastDark : state.lastLight;
    },
    setBackground(state, { payload }: PayloadAction<string>) {
      const preset = getBackground(payload);
      state.background = preset.id;
      state.mode = preset.mode;
      if (preset.mode === "dark") state.lastDark = preset.id;
      else state.lastLight = preset.id;
    },
    setAccent(state, { payload }: PayloadAction<string>) {
      state.accent = payload;
    },
    resetTheme: () => defaults(),
  },
});

export const { toggleMode, setBackground, setAccent, resetTheme } = slice.actions;
export const themeReducer = slice.reducer;

/** Hex "#rrggbb" → "r g b" (format Tailwind's <alpha-value> needs) */
const channels = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Pushes the theme to <html>: `dark` class + CSS variables used by Tailwind. */
export function applyTheme(state: ThemeState) {
  const p = getBackground(state.background);
  const root = document.documentElement;
  root.classList.toggle("dark", p.mode === "dark");
  root.style.colorScheme = p.mode;
  const vars: Record<string, string> = {
    primary: state.accent,
    secondary: brand.secondary,
    page: p.page,
    surface: p.surface,
    line: p.line,
    text: p.text,
    muted: p.muted,
  };
  Object.entries(vars).forEach(([k, val]) => root.style.setProperty(`--color-${k}`, channels(val)));
}

/** Same tokens for Ant Design so antd components match Tailwind ones. */
export function getAntdTheme(state: ThemeState): ThemeConfig {
  const p = getBackground(state.background);
  return {
    algorithm: p.mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: state.accent,
      colorInfo: state.accent,
      colorBgBase: p.page,
      colorBgContainer: p.surface,
      colorBgElevated: p.surface,
      colorBorder: p.line,
      colorBorderSecondary: p.line,
      colorTextBase: p.text,
      colorTextSecondary: p.muted,
      borderRadius: 8,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    },
    components: { Menu: { itemBg: "transparent", activeBarBorderWidth: 0 } },
  };
}
