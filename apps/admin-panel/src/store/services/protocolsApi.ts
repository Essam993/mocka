import { api } from "@repo/shared";
import type { ApiResponse } from "../../types/types";
import type {
  Protocols,
  ProtocolsInput,
} from "../../types/protocols";

const BASE = "/api/backend/admin-panel";

export const ProtocolEndpoints = {
  list: `${BASE}/getAllProtocols`,
  insert: `${BASE}/insertProtocol`,
  update: `${BASE}/updateProtocol`,
  remove: `${BASE}/deleteProtocol`,
};

interface ProtocolDto {
  id?: number | null;
  name?: string | null;
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

export const ProtocolsApi = {
  async list(): Promise<Protocols[]> {
    const response = await api.get<
      ApiResponse<(ProtocolDto | null)[] | null>
    >(ProtocolEndpoints.list);

    const rows = read(response);

    return (Array.isArray(rows) ? rows : [])
      .filter(
        (protocol): protocol is ProtocolDto & { id: number } =>
          protocol != null && protocol.id != null
      )
      .map((protocol) => ({
        id: protocol.id,
        name: (protocol.name ?? "").trim(),
      }));
  },

  async insert(input: ProtocolsInput): Promise<Protocols> {
    const response = await api.post<ApiResponse<IdData>>(
      ProtocolEndpoints.insert,
      input
    );

    return {
      id: confirmedId(read(response), "new protocol"),
      name: input.name,
    };
  },

  async update(protocol: Protocols): Promise<Protocols> {
    const response = await api.put<ApiResponse<IdData>>(
      ProtocolEndpoints.update,
      {
        id: protocol.id,
        name: protocol.name,
      }
    );

    confirmedId(read(response), "protocol update");

    return protocol;
  },

  async remove(id: number): Promise<void> {
    const response = await api.delete<ApiResponse<IdData>>(
      ProtocolEndpoints.remove,
      {
        data: { id },
      }
    );

    confirmedId(read(response), "protocol delete");
  },
};