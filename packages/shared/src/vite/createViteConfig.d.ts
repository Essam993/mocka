import type { UserConfigFnObject } from "vite";

export interface Options {
  /** Dev server port */
  port: number;
  /** `base` used for production builds (can be a full URL) */
  productionBase: string;
  /** Dev host that matches your HTTPS certificate */
  host?: string;
  /** Backend the dev server proxies to */
  apiTarget?: string;
  /** Paths forwarded to the backend in dev */
  proxyPaths?: string[];
  /** Certificate name without extension: <name>.pem + <name>-key.pem */
  certName?: string;
}
export function createViteConfig(opts: Options): UserConfigFnObject;
