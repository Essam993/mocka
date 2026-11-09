import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type {
  dataTypes,
  dataTypesInput,
  dataTypesUpdate,
} from "../../types/dataTypes";

const BASE = "/api/backend/admin-panel";

export const DataTypesEndpoints = {
  list: `${BASE}/getDataTypes`,
  insert: `${BASE}/insertDataType`,
  update: `${BASE}/updateDataType`,
  remove: `${BASE}/deleteDataType`,
};

interface DataTypesDto {
  id?: number | null;
  name?: string | null;
  label?: string | null;
}

type IdData =
  | { id?: number | null }[]
  | { id?: number | null }
  | null
  | undefined;

/**
 * Reads response.data.data after checking response.data.status.
 */
function read<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;

  if (body.status && body.status.toUpperCase() !== "SUCCESS") {
    throw new Error(body.message || "Request failed");
  }

  return body.data;
}

/**
 * Ensures the backend confirms the operation.
 */
function confirmedId(data: IdData, operation: string): number {
  const result = Array.isArray(data) ? data[0] : data;

  if (result?.id == null) {
    throw new Error(
      `The server did not confirm the ${operation} (no id returned)`
    );
  }

  return result.id;
}

/**
 * Normalizes input before sending it to the backend.
 */
function normalizeInput(input: dataTypesInput): dataTypesInput {
  return {
    name: input.name.trim().toLowerCase(),
    label: input.label.trim(),
  };
}

export const dataTypesApi = {
  /**
   * Get all data types.
   */
  async list(): Promise<dataTypes[]> {
    const response = await api.get<
      ApiResponse<(DataTypesDto | null)[] | null>
    >(DataTypesEndpoints.list);

    const rows = read(response);

    return (Array.isArray(rows) ? rows : [])
      .filter(
        (dataType): dataType is DataTypesDto & { id: number } =>
          dataType != null && dataType.id != null
      )
      .map((dataType) => ({
        id: dataType.id,
        name: (dataType.name ?? "").trim(),
        label: (dataType.label ?? "").trim(),
      }));
  },

  /**
   * Create a data type.
   * Payload: { name, label }
   */
  async insert(input: dataTypesInput): Promise<dataTypes> {
    const payload = normalizeInput(input);

    const response = await api.post<ApiResponse<IdData>>(
      DataTypesEndpoints.insert,
      payload
    );

    return {
      id: confirmedId(read(response), "new data type"),
      ...payload,
    };
  },

  /**
   * Update a data type.
   * Payload: { id, name, label }
   */
  async update(dataType: dataTypesUpdate): Promise<dataTypes> {
    const payload = {
      id: dataType.id,
      ...normalizeInput(dataType),
    };

    const response = await api.put<ApiResponse<IdData>>(
      DataTypesEndpoints.update,
      payload
    );

    confirmedId(read(response), "data type update");

    return payload;
  },

  /**
   * Delete a data type.
   * Payload: { id }
   */
  async remove(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<IdData>>(
      DataTypesEndpoints.remove,
      {
        data: { id },
      }
    );

    confirmedId(read(response), "data type delete");
  },
};