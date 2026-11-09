import type { Config } from "tailwindcss";
import sharedPreset from "@repo/shared/tailwind-preset";

export default {
  presets: [sharedPreset],
  // include shared package so its Tailwind classes are generated
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/shared/src/**/*.{ts,tsx}"],
} satisfies Config;
