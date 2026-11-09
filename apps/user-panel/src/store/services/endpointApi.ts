import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { ApiEndpoint, CollectionApi } from "../../types/collectionApi";

export const endpointEndpoints = {
  list: "/api/backend/user-panel/getCollectionEndpoints", // ★ GET ?collectionId=
};

export interface EndpointDto {
  id?: number | null;
  path?: string | null;
  method?: string | null;
  description?: string | null;
}

interface ApiDto {
  id?: number | null;
  name?: string | null;
  endpoints?: (EndpointDto | null)[] | null;
}

export function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

export const isEndpoint = (e: EndpointDto | null | undefined): e is EndpointDto & { id: number } => e != null && e.id != null;

export const fromEndpointDto = (e: EndpointDto & { id: number }): ApiEndpoint => ({
  id: e.id,
  path: e.path ?? "",
  method: (e.method ?? "GET").toUpperCase(),
  description: e.description ?? "",
});

export const endpointApi = {
  async list(collectionId: number): Promise<CollectionApi[]> {
    const { data } = await api.get<ApiResponse<(ApiDto | null)[]>>(endpointEndpoints.list, { params: { collectionId } });
    return (unwrap(data) ?? [])
      .filter((a): a is ApiDto & { id: number } => a != null && a.id != null)
      .map((a) => {
        const endpoints = (a.endpoints ?? []).filter(isEndpoint).map(fromEndpointDto);
        return {
          id: a.id,
          name: a.name ?? `API ${a.id}`,
          method: endpoints[0]?.method ?? "GET",
          path: endpoints[0]?.path ?? "",
          endpoints,
        };
      });
  },
};