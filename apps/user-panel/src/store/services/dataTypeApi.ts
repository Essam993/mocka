import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { DataType } from "../../types/projectVariable";

export const dataTypeEndpoints = {
  list: "/api/backend/user-panel/getAllDataTypes", // ★ change the prefix here if it's different
};

export const dataTypeApi = {
  async list(): Promise<DataType[]> {
    const { data } = await api.get<ApiResponse<(DataType | null)[]>>(dataTypeEndpoints.list);
    if (data.status && data.status.toUpperCase() !== "SUCCESS") throw new Error(data.message || "Request failed");
    return (data.data ?? []).filter((t): t is DataType => t != null && t.id != null);
  },
};