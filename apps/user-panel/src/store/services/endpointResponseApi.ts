import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type { EndpointContext } from "../../types/endpointVariable";
import type { EndpointResponse, LookupOption, ResponseVariable, ResponseVariableWrite, ResponseWrite } from "../../types/endpointResponse";
import { API_PREFIX } from "./collectionApis";
import { unwrap } from "./endpointApi";

/** ★ rename these to match your backend */
/** ★ one API does insert, update and delete; the payload decides which */
export const RESPONSE_ENDPOINTS = {
  list: `${API_PREFIX}getEndpointResponses`, // GET ?endpointId=
  save: `${API_PREFIX}insertEndpointVariables`, // ★ POST: insert (no id), update (id + statusId 1), delete (statusId 0)
  httpCodes: `${API_PREFIX}getHttpCodes`,
  contentTypes: `${API_PREFIX}getContentTypes`,
} as const;

/* ------------------------------- server shapes ------------------------------- */

interface VariableDto {
  id?: number | null;
  variableId?: number | null;
  name?: string | null;
  defaultValue?: string | null;
  description?: string | null;
  required?: boolean | null;
}
interface ResponseDto {
  id?: number | null;
  httpCodeId?: number | null;
  contentTypeId?: number | null;
  name?: string | null;
  percentage?: number | null;
  delay?: number | null;
  /** a response without fields has no `variables` key at all */
  variables?: (VariableDto | null)[] | null;
}
type WithId<T> = T & { id: number };

/** keeps only rows that have an id; tolerates null rows, a null list or a non-array */
const withId = <T extends { id?: number | null }>(rows: readonly (T | null)[] | null | undefined): WithId<T>[] =>
  (Array.isArray(rows) ? rows : []).filter((r): r is WithId<T> => r != null && r.id != null);

const toVariable = (d: WithId<VariableDto>, dataTypeId: number | null): ResponseVariable => ({
  id: d.id,
  variableId: d.variableId ?? null,
  name: d.name ?? "",
  defaultValue: d.defaultValue ?? "",
  description: d.description ?? "",
  required: !!d.required,
  dataTypeId,
});

/** `sent` lets variables keep the data type the user picked, since the server doesn't send it back */
const toResponse = (d: WithId<ResponseDto>, sent?: ResponseWrite): EndpointResponse => ({
  id: d.id,
  httpCodeId: d.httpCodeId ?? null,
  contentTypeId: d.contentTypeId ?? null,
  name: d.name ?? "",
  percentage: d.percentage ?? 0,
  delay: d.delay ?? 0,
  variables: withId(d.variables).map((v) => toVariable(v, sent?.variables.find((s) => s.name === v.name)?.dataTypeId ?? null)),
});

/* ------------------------------ payload builders ------------------------------ */

const variableBody = (v: ResponseVariableWrite) => ({
  ...(v.id != null ? { id: v.id } : {}), // only on update and delete
  name: v.name,
  ...(v.id != null && v.variableId != null ? { variableId: v.variableId } : {}), // only on update and delete
  ...(v.dataTypeId != null ? { dataTypeId: v.dataTypeId } : {}),
  statusId: v.statusId,
  defaultValue: v.defaultValue === "" ? null : v.defaultValue,
  isRequired: v.required,
  description: v.description,
});

const responseBody = (r: ResponseWrite) => ({
  ...(r.id != null ? { id: r.id } : {}),
  httpCodeId: r.httpCodeId,
  contentTypeId: r.contentTypeId, // ★ assumed key
  percentage: r.percentage,
  name: r.name,
  delay: r.delay,
  ...(r.id != null ? { statusId: r.statusId ?? 1 } : {}),
  variables: r.variables.map(variableBody),
});

const payload = (ctx: EndpointContext, responses: ResponseWrite[]) => ({
  endpointId: ctx.endpointId,
  collectionId: ctx.collectionId,
  projectId: ctx.projectId,
  responses: responses.map(responseBody),
});

/** A saved response as the server has it, for deletes: everything is sent, only statusId is 0 */
export const savedWrite = (r: EndpointResponse, variables: ResponseVariable[], wholeResponse: boolean): ResponseWrite => ({
  id: r.id,
  httpCodeId: r.httpCodeId,
  contentTypeId: r.contentTypeId,
  name: r.name,
  percentage: r.percentage,
  delay: r.delay,
  ...(wholeResponse ? { statusId: 0 as const } : {}),
  variables: variables.map((v) => ({
    id: v.id,
    variableId: v.variableId,
    name: v.name,
    dataTypeId: v.dataTypeId,
    defaultValue: v.defaultValue,
    description: v.description,
    required: v.required,
    statusId: 0 as const,
  })),
});

/**
 * Pairs what came back with what was sent (same order). Updates match by id; inserts by name,
 * falling back to position. A response without an id throws, so the store is never patched on a doubtful reply.
 */
function match(sent: ResponseWrite[], returned: WithId<ResponseDto>[]): EndpointResponse[] {
  const used = new Set<number>();
  return sent.map((s, i) => {
    const hit =
      s.id != null
        ? returned.find((r) => r.id === s.id)
        : (returned.find((r) => !used.has(r.id) && r.name === s.name) ?? (returned.length === sent.length ? returned[i] : undefined));
    if (!hit || used.has(hit.id)) throw new Error(`The server did not confirm "${s.name}" (no id returned)`);
    used.add(hit.id);
    return toResponse(hit, s);
  });
}

const lookup = async (url: string): Promise<LookupOption[]> => {
  const { data } = await api.get<ApiResponse<({ id?: number | null; name?: string | null } | null)[] | null>>(url);
  return withId(unwrap(data)).map((d) => ({ id: d.id, name: (d.name ?? "").trim() || `#${d.id}` }));
};

/* ----------------------------------- calls ----------------------------------- */

export const endpointResponseApi = {
  async list(endpointId: number): Promise<EndpointResponse[]> {
    const { data } = await api.get<ApiResponse<(ResponseDto | null)[] | null>>(RESPONSE_ENDPOINTS.list, { params: { endpointId } });
    return withId(unwrap(data)).map((d) => toResponse(d));
  },

  async insert(ctx: EndpointContext, rows: ResponseWrite[]): Promise<EndpointResponse[]> {
    const { data } = await api.post<ApiResponse<(ResponseDto | null)[]>>(RESPONSE_ENDPOINTS.save, payload(ctx, rows));
    return match(rows, withId(unwrap(data)));
  },

  async update(ctx: EndpointContext, rows: ResponseWrite[]): Promise<EndpointResponse[]> {
    const { data } = await api.post<ApiResponse<(ResponseDto | null)[]>>(RESPONSE_ENDPOINTS.save, payload(ctx, rows)); // ★ was PUT
    return match(rows, withId(unwrap(data)));
  },

  /** Same API, statusId 0. Only a SUCCESS status is checked, because nothing useful comes back. */
  async remove(ctx: EndpointContext, response: ResponseWrite): Promise<void> {
    const { data } = await api.post<ApiResponse<unknown>>(RESPONSE_ENDPOINTS.save, payload(ctx, [response])); // ★ was DELETE
    unwrap(data);
  },

  httpCodes: () => lookup(RESPONSE_ENDPOINTS.httpCodes),
  contentTypes: () => lookup(RESPONSE_ENDPOINTS.contentTypes),
};