import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

/** Looks in the app folder first, then in <repo>/certs so both apps can share one certificate. */
function readCert(file) {
  const candidates = [path.resolve(process.cwd(), file), path.resolve(process.cwd(), "../../certs", file)];
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found) throw new Error(`Certificate "${file}" not found. Put it in the app folder or in <repo>/certs/`);
  return fs.readFileSync(found);
}

/**
 * @param {import("./createViteConfig").Options} opts
 * Shared Vite config for every panel: HTTPS dev server, backend proxy, env handling, production base.
 * (Plain .js on purpose: Node loads vite.config.ts imports directly and cannot run .ts files.)
 */
export function createViteConfig(opts) {
  const {
    port,
    productionBase,
    host = "dev.tangerine-digital.com",
    apiTarget = "https://dev.mocka.tangerine-digital.com",
    proxyPaths = ["/admin-portal", "/api/backend/admin-panel", "/api/backend/user-panel"],
    certName = host,
  } = opts;

  return defineConfig(({ mode }) => {
    // Only expose VITE_* and REACT_APP_* variables to the browser bundle (never your whole environment).
    const env = loadEnv(mode, process.cwd(), ["VITE_", "REACT_APP_"]);

    return {
      define: { "process.env": env },
      base: mode === "production" ? productionBase : "/",
      server: {
        host,
        port,
        https: { key: readCert(`${certName}-key.pem`), cert: readCert(`${certName}.pem`) },
        proxy: Object.fromEntries(proxyPaths.map((p) => [p, { target: apiTarget, changeOrigin: true, secure: true }])),
      },
      plugins: [react()],
      resolve: { dedupe: ["react", "react-dom", "react-redux", "antd"] },
    };
  });
}
