import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type { HttpMethod, HttpMethodInput } from "../../types/httpMethods";

const BASE = "/api/backend/admin-panel"; // ★ change this one line if the admin panel uses another prefix

export const httpMethodEndpoints = {
  list: `${BASE}/getMethods`, // ★ GET
  insert: `${BASE}/insertMethods`, // ★ POST   { name }
  update: `${BASE}/updateMethods`, // ★ PUT    { id, name }
  remove: `${BASE}/deleteMethods`, // ★ DELETE body { id }
};

interface HttpMethodDto {
  id?: number | null;
  name?: string | null;
}

type IdData = { id?: number | null }[] | { id?: number | null } | null | undefined;

/** Every call reads its payload from `response.data.data`, after checking `response.data.status`. */
function read<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

/** Throws unless data is [{ id }] (or { id }), so the store is never patched on a doubtful response */
function confirmedId(data: IdData, what: string): number {
  const one = Array.isArray(data) ? data[0] : data;
  if (one?.id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);
  return one.id;
}

export const httpMethodApi = {
  async list(): Promise<HttpMethod[]> {
    const response = await api.get<ApiResponse<(HttpMethodDto | null)[] | null>>(httpMethodEndpoints.list);
    const rows = read(response);
    return (Array.isArray(rows) ? rows : [])
      .filter((r): r is HttpMethodDto & { id: number } => r != null && r.id != null)
      .map((r) => ({ id: r.id, name: (r.name ?? "").trim() }));
  },

  /** Returns the new row: the input plus the id the server confirmed */
  async insert(input: HttpMethodInput): Promise<HttpMethod> {
    const response = await api.post<ApiResponse<IdData>>(httpMethodEndpoints.insert, input);
    return { id: confirmedId(read(response), "new Method"), name: input.name };
  },

  async update(method: HttpMethod): Promise<HttpMethod> {
    const response = await api.put<ApiResponse<IdData>>(httpMethodEndpoints.update, { id: method.id, name: method.name });
    confirmedId(read(response), "Method update");
    return method;
  },

  async remove(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<IdData>>(httpMethodEndpoints.remove, { data: { id } });
    confirmedId(read(response), "Method delete");
  },
};