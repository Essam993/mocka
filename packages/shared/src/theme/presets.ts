import { brand } from "./brand";

export type ThemeMode = "light" | "dark";

export interface BackgroundPreset {
  id: string;
  label: string;
  mode: ThemeMode;
  page: string; // app background
  surface: string; // cards, navbar, sidebar
  line: string; // borders
  text: string;
  muted: string;
}

/** Add / remove / tweak backgrounds here. They show up in the Appearance modal automatically. */
export const backgroundPresets: BackgroundPreset[] = [
  { id: "midnight", label: "Midnight", mode: "dark", page: "#0b0c10", surface: "#14161c", line: "#232632", text: "#e6e8ee", muted: "#8b90a0" },
  { id: "slate", label: "Slate", mode: "dark", page: "#1b1f27", surface: "#232831", line: "#323946", text: "#e4e7ec", muted: "#8d95a5" },
  { id: "charcoal", label: "Charcoal", mode: "dark", page: "#1a1a1a", surface: "#242424", line: "#333333", text: "#eaeaea", muted: "#9a9a9a" },
  { id: "light", label: "Light", mode: "light", page: "#f4f5f7", surface: "#ffffff", line: "#e4e6eb", text: "#1f2430", muted: "#6b7280" },
  { id: "cream", label: "Cream", mode: "light", page: "#f3ecdb", surface: "#fbf7ee", line: "#e2d8bf", text: "#3b3426", muted: "#8a7f66" },
];

export const defaultBackground = { dark: "midnight", light: "light" } as const;

/** Accent colors the user can pick from. The first entry is the brand primary. */
export const accentOptions: string[] = [
  brand.secondary, // orange (default)
  brand.primary, // red
  "#00a6f4",
  "#fb2c36",
  "#38225f",
  "#0aa073",
  "#5b7cf0", // blue (the previous default)
];

export const getBackground = (id: string) =>
  backgroundPresets.find((p) => p.id === id) ?? backgroundPresets[0];
