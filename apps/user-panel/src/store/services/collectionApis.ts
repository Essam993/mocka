import { api } from "@repo/shared"; // ★ use whatever your axios instance is exported as
import type { CollectionApi, CreateCollectionApiPayload, LookupItem, LookupKey } from "../../types/collectionApi";

/** Every endpoint below is served under this prefix. */
export const API_PREFIX = "/api/backend/user-panel/";

/** All endpoint names in one place. */
export const ENDPOINTS = {
  list: `${API_PREFIX}getAllCollectionApis`, // GET  ?collectionId=
  create: `${API_PREFIX}createCollectionApi`, // POST body: CreateCollectionApiPayload
  remove: `${API_PREFIX}deleteCollectionApi`, // DELETE ?apiId=
  lookups: {
    methods: `${API_PREFIX}getHttpMethods`,
    conditions: `${API_PREFIX}getRequestConditions`,
    statusCodes: `${API_PREFIX}getHttpCodes`,
    dynamicValues: `${API_PREFIX}getDynamicValues`,
  },
} as const;

export const collectionApisApi = {
  list: (collectionId: number) =>
    api.get<{ data: CollectionApi[] }>(ENDPOINTS.list, { params: { collectionId } }).then((r) => r.data.data),

  create: (payload: CreateCollectionApiPayload) => api.post(ENDPOINTS.create, payload).then((r) => r.data),

  remove: (apiId: number) => api.delete(ENDPOINTS.remove, { params: { apiId } }),

  lookup: (key: LookupKey) =>
    api
      .get<{ data: LookupItem[] }>(ENDPOINTS.lookups[key as keyof typeof ENDPOINTS.lookups])
      .then((r) => r.data.data),
};