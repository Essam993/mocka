import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { ApiEndpoint } from "../../types/collectionApi";
import { EndpointDto, fromEndpointDto, isEndpoint, unwrap } from "./endpointApi";

export const instantApiEndpoint = "/api/backend/user-panel/createResourceCrud"; // ★ POST, confirm the path

export const instantApi = {
  /** Creates the CRUD endpoints for `path` and returns them. Throws if the server returns none. */
  async create(input: { collectionId: number; workspaceId: number; path: string }): Promise<ApiEndpoint[]> {
    const path = input.path.replace(/^\/+/, "").trim(); // sent without the slash
    const { data } = await api.post<ApiResponse<(EndpointDto | null)[]>>(instantApiEndpoint, { ...input, path });
    const rows = (unwrap(data) ?? []).filter(isEndpoint).map(fromEndpointDto);
    if (rows.length === 0) throw new Error("The server did not return the new endpoints");
    return rows;
  },
};