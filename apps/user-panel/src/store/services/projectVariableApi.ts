import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { ProjectVariable, ProjectVariableInput } from "../../types/projectVariable";

export const projectVariableEndpoints = {
  list: "/api/backend/user-panel/getAllVariables", // ★ GET ?projectId=
  create: "/api/backend/user-panel/insertVariable", // ★ POST
  update: "/api/backend/user-panel/updateVariable", // ★ PUT
  remove: "/api/backend/user-panel/deleteVariable", // ★ DELETE body: { id }
};

/** What the list endpoint returns */
interface VariableDto {
  id: number;
  name: string;
  dataTypeId: number;
  description?: string | null;
  recordDefId?: number | null;
  projectId: number;
}

/** What insert / update expect (note the different record key) */
interface VariableWriteDto {
  id?: number;
  name: string;
  dataTypeId: number;
  projectId: number;
  description: string;
  projectVariableRecordDefId: number | null;
}

const fromDto = (d: VariableDto): ProjectVariable => ({
  id: d.id,
  name: d.name,
  dataTypeId: d.dataTypeId,
  description: d.description ?? "",
  recordDefId: d.recordDefId ?? null,
  projectId: d.projectId,
});

const toWriteDto = (v: ProjectVariableInput | ProjectVariable): VariableWriteDto => ({
  ...("id" in v && v.id != null ? { id: v.id } : {}),
  name: v.name,
  dataTypeId: v.dataTypeId,
  projectId: v.projectId,
  description: v.description,
  projectVariableRecordDefId: v.recordDefId ?? null,
});

function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

/** Throws unless data contains an id, so the store is never patched on a doubtful response */
function requireId(body: ApiResponse<{ id: number }[]>, what: string): number {
  const id = unwrap(body)?.[0]?.id;
  if (id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);
  return id;
}

export const projectVariableApi = {
  async list(projectId: number): Promise<ProjectVariable[]> {
    const { data } = await api.get<ApiResponse<(VariableDto | null)[]>>(projectVariableEndpoints.list, { params: { projectId } });
    return (unwrap(data) ?? []).filter((d): d is VariableDto => d != null && d.id != null).map(fromDto);
  },
  async create(input: ProjectVariableInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(projectVariableEndpoints.create, toWriteDto(input));
    return requireId(data, "new variable");
  },
  async update(variable: ProjectVariable): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(projectVariableEndpoints.update, toWriteDto(variable));
    requireId(data, "update");
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(projectVariableEndpoints.remove, { data: { id } });
    requireId(data, "delete");
  },
};