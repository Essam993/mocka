import plugin from "tailwindcss/plugin";

// Every color is a CSS variable that ThemeProvider updates at runtime,
// so `bg-primary`, `text-content`, `border-line` ... switch with light/dark/accent automatically.
const v = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import("tailwindcss").Config} */
export default {
  darkMode: "class",
  // Ant Design ships its own reset (antd/dist/reset.css), so Tailwind's full preflight stays off.
  // The plugin below adds back only the small part of preflight that Tailwind utilities depend on.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: v("primary"),
        secondary: v("secondary"),
        page: v("page"),
        surface: v("surface"),
        line: v("line"),
        content: v("text"),
        muted: v("muted"),
      },
      fontFamily: { sans: ['"Inter Variable"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 16px 40px -16px rgb(0 0 0 / 0.28)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both" },
    },
  },
  plugins: [
    plugin(({ addBase }) =>
      addBase({
        // Without this, `border` / `border-b` utilities draw nothing (no border-style) when preflight is off.
        "*, ::before, ::after": { borderWidth: "0", borderStyle: "solid", borderColor: "rgb(var(--color-line))" },
        // Plain <button>/<input> must not show the browser's gray default look.
        "button, input, textarea, select": { font: "inherit", color: "inherit", margin: "0", letterSpacing: "inherit" },
        button: { backgroundColor: "transparent", backgroundImage: "none", padding: "0", cursor: "pointer" },
        "h1, h2, h3, h4, h5, h6": { margin: "0", fontSize: "inherit", fontWeight: "inherit" },
        "p, dl, dd, figure, blockquote": { margin: "0" },
        "ul, ol, menu": { margin: "0", padding: "0", listStyle: "none" },
        a: { color: "inherit", textDecoration: "inherit" },
        kbd: { fontFamily: "inherit" },
      }),
    ),
  ],
};