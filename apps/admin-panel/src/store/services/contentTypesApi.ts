import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type { ContentTypes, ContentTypesInput } from "../../types/contentTypes";

const BASE = "/api/backend/admin-panel"; // ★ change this one line if the admin panel uses another prefix

export const ContentTypeEndpoints = {
  list: `${BASE}/getContentTypes`, // ★ GET
  insert: `${BASE}/insertContentType`, // ★ POST   { name }
  update: `${BASE}/updateContentType`, // ★ PUT    { id, name }
  remove: `${BASE}/deleteContentType`, // ★ DELETE body { id }
};

interface ContentTypeDto {
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

export const ContentTypeApi = {
  async list(): Promise<ContentTypes[]> {
    const response = await api.get<ApiResponse<(ContentTypeDto | null)[] | null>>(ContentTypeEndpoints.list);
    const rows = read(response);
    return (Array.isArray(rows) ? rows : [])
      .filter((r): r is ContentTypeDto & { id: number } => r != null && r.id != null)
      .map((r) => ({ id: r.id, name: (r.name ?? "").trim() }));
  },

  /** Returns the new row: the input plus the id the server confirmed */
  async insert(input: ContentTypesInput): Promise<ContentTypes> {
    const response = await api.post<ApiResponse<IdData>>(ContentTypeEndpoints.insert, input);
    return { id: confirmedId(read(response), "new Content Type"), name: input.name };
  },

  async update(contentType: ContentTypes): Promise<ContentTypes> {
    const response = await api.put<ApiResponse<IdData>>(ContentTypeEndpoints.update, { id: contentType.id, name: contentType.name });
    confirmedId(read(response), "Content Type update");
    return contentType;
  },

  async remove(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<IdData>>(ContentTypeEndpoints.remove, { data: { id } });
    confirmedId(read(response), "Content Type delete");
  },
};