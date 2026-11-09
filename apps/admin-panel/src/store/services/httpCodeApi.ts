import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type { HttpCode, HttpCodeInput } from "../../types/httpCodes";

const BASE = "/api/backend/admin-panel"; // ★ change this one line if the admin panel uses another prefix

export const httpCodeEndpoints = {
  list: `${BASE}/getHttpCodes`, // ★ GET
  insert: `${BASE}/insertHttpCode`, // ★ POST   { name }
  update: `${BASE}/updateHttpCode`, // ★ PUT    { id, name }
  remove: `${BASE}/deleteHttpCode`, // ★ DELETE body { id }
};

interface HttpCodeDto {
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

export const httpCodeApi = {
  async list(): Promise<HttpCode[]> {
    const response = await api.get<ApiResponse<(HttpCodeDto | null)[] | null>>(httpCodeEndpoints.list);
    const rows = read(response);
    return (Array.isArray(rows) ? rows : [])
      .filter((r): r is HttpCodeDto & { id: number } => r != null && r.id != null)
      .map((r) => ({ id: r.id, name: (r.name ?? "").trim() }));
  },

  /** Returns the new row: the input plus the id the server confirmed */
  async insert(input: HttpCodeInput): Promise<HttpCode> {
    const response = await api.post<ApiResponse<IdData>>(httpCodeEndpoints.insert, input);
    return { id: confirmedId(read(response), "new status code"), name: input.name };
  },

  async update(code: HttpCode): Promise<HttpCode> {
    const response = await api.put<ApiResponse<IdData>>(httpCodeEndpoints.update, { id: code.id, name: code.name });
    confirmedId(read(response), "status code update");
    return code;
  },

  async remove(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<IdData>>(httpCodeEndpoints.remove, { data: { id } });
    confirmedId(read(response), "status code delete");
  },
};