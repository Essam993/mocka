/** Every dropdown in the API panel comes back as { data: [{ id, name }] } */
export interface LookupItem {
  id: number;
  name: string;
}

export type LookupKey = "methods" | "conditions" | "statusCodes" | "headerNames" | "dynamicValues";

/** One row in the "APIs of a collection" list. ★ Adjust to what getAllCollectionApis really returns. */
export interface CollectionApi {
  id: number;
  method: string; // "GET"
  path: string; // "/test"
  condition?: string; // "Request path exactly matches"
  description?: string;
}

/* ★ Request body for createCollectionApi. Generated for now, expect it to change. */
export interface ApiConditionPayload {
  operatorId: number;
  value: string;
}

export interface ApiHeaderPayload {
  headerNameId: number;
  value: string;
}

export interface ApiResponsePayload {
  description: string;
  statusCodeId: number;
  delayMs: number;
  headers: ApiHeaderPayload[];
  body: string;
  dynamic: boolean;
  /** 100 when responseMode is "single" */
  weight: number;
}

export interface CreateCollectionApiPayload {
  collectionId: number;
  methodId: number;
  conditions: ApiConditionPayload[];
  responseMode: "single" | "weighted";
  responses: ApiResponsePayload[];
  description: string;
}

export interface ApiEndpoint {
  id: number;
  path: string;
  method: string;
  description: string;
}

/** An API of a collection, with its endpoints */
export interface CollectionApi {
  id: number;
  name: string;
  endpoints: ApiEndpoint[];
}