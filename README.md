# Panels monorepo (pnpm workspaces)

```
apps/
  user-panel    → http://localhost:5173  (top-navbar layout)
  admin-panel   → http://localhost:5174  (sidebar + navbar layout)
packages/
  shared        → theme, redux (auth + theme), api client, common components
```

## Run
```bash
pnpm install
# put dev.tangerine-digital.com.pem and dev.tangerine-digital.com-key.pem in ./certs (shared by both apps)
# add to your hosts file:  127.0.0.1 dev.tangerine-digital.com
cp apps/admin-panel/.env.example apps/admin-panel/.env   # set REACT_APP_KEY (same for user-panel)
pnpm dev:admin     # https://dev.tangerine-digital.com:400   (user panel: :401)
```

## Where to change things
| I want to change…                     | File |
|---------------------------------------|------|
| Primary / secondary brand colors      | `packages/shared/src/theme/brand.ts` |
| Background themes & accent choices    | `packages/shared/src/theme/presets.ts` |
| Ant Design theme tokens               | `packages/shared/src/theme/themeSlice.ts` → `getAntdTheme` |
| Login / user-details endpoints        | `packages/shared/src/api/client.ts` → `endpoints` |
| HTTPS host, proxy paths, prod base    | `packages/shared/src/vite/createViteConfig.js` (ports/base per app in `apps/*/vite.config.ts`) |
| Admin layout / User layout            | `apps/*/src/layouts/` |
| Shared Input, TextArea, Navbar, Sidebar, Tabs | `packages/shared/src/components/` |

## Using colors
Tailwind classes follow the theme automatically: `bg-primary`, `text-secondary`, `bg-page`, `bg-surface`, `border-line`, `text-content`, `text-muted`, plus opacity like `bg-primary/15`. Light/dark is driven by Redux (`theme` slice) and applied to `<html>` by `ThemeProvider`.

## Auth flow
`login` thunk → POST login (`{accessToken}`) → stores token → GET getUserDetails → `auth.user`. `RequireAuth` guards routes (optionally `grant="..."`), reloads user details on refresh, and a 401 logs out.
