import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type { DataValues } from "../../types/apiData";
import { API_PREFIX } from "./collectionApis";
import { unwrap } from "./endpointApi";

export const DATA_ENDPOINTS = {
  /** ★ GET ?apiId= → the saved records. Set to null while there is no read endpoint: the page then starts from generated data. */
  list: `${API_PREFIX}getApiData` as string | null,
  /** POST { apiId, data: [...records] } */
  generate: `${API_PREFIX}generateData`,
};

/** accepts an array, a JSON string, or an object holding one of them */
function toRecords(raw: unknown, depth = 0): DataValues[] {
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      return toRecords(JSON.parse(raw), depth + 1);
    } catch {
      throw new Error("The saved data is not valid JSON");
    }
  }
  if (Array.isArray(raw)) return raw.filter((r): r is DataValues => r != null && typeof r === "object" && !Array.isArray(r));
  if (raw && typeof raw === "object" && depth < 2) {
    const o = raw as Record<string, unknown>;
    return toRecords(o.data ?? o.records ?? o.json ?? [], depth + 1);
  }
  return [];
}

export const apiDataApi = {
  async list(apiId: number): Promise<DataValues[]> {
    if (!DATA_ENDPOINTS.list) return [];
    const { data } = await api.get<ApiResponse<unknown>>(DATA_ENDPOINTS.list, { params: { apiId } });
    return toRecords(unwrap(data));
  },

  /** The records are sent as JSON. A SUCCESS status is the only confirmation. */
  async save(apiId: number, rows: DataValues[]): Promise<void> {
    const { data } = await api.post<ApiResponse<unknown>>(DATA_ENDPOINTS.generate, { apiId, data: rows });
    unwrap(data);
  },
};