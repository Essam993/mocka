import axios from "axios";

/** ★ Change your endpoints here (or pass overrides to configureApi). */
export const endpoints = {
  login: "admin-portal/backend/auth/rest/api/login", // POST { username, password } → { accessToken }
  userDetails: "/api/backend/admin-panel/getUserDetails", // GET → { grants, firstname, userId, email, username, lastname }
};

interface ApiConfig {
  baseURL?: string;
  /** Sent on every request as the `App-Key` header */
  appKey?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  endpoints?: Partial<typeof endpoints>;
}

let cfg: ApiConfig = {};
export const api = axios.create();

api.interceptors.request.use((req) => {
  if (cfg.appKey) req.headers["App-Key"] = cfg.appKey;
  const token = cfg.getToken?.();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) cfg.onUnauthorized?.();
    return Promise.reject(err);
  },
);

export function configureApi(config: ApiConfig) {
  cfg = config;
  api.defaults.baseURL = config.baseURL;
  Object.assign(endpoints, config.endpoints);
}

/** "Basic base64(username:password)" — unicode-safe */
export const basicAuth = (username: string, password: string) => {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
};

export const getErrorMessage = (e: unknown): string => {
  if (typeof e === "string") return e;
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? "Something went wrong. Please try again.";
};
