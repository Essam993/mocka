import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";

export const httpCodeEndpoints = {
  list: "/api/backend/user-panel/getErrorCodes", // ★ change the prefix here if it's different
};

interface IHttpCode {
  id: number;
  label: string;
}

export const httpCodesApi = {
  async list(): Promise<IHttpCode[]> {
    const { data } = await api.get<ApiResponse<(IHttpCode | null)[]>>(httpCodeEndpoints.list);
    if (data.status && data.status.toUpperCase() !== "SUCCESS") throw new Error(data.message || "Request failed");
    return (data.data ?? []).filter((t): t is IHttpCode => t != null && t.id != null);
  },
};