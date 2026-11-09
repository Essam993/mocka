import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { ProjectCollection, ProjectCollectionInput } from "../../types/projectCollection";

/** Shape the backend expects on create/update (snake_case) */
interface CollectionWriteDto {
  id?: number;
  name: string;
  auth_required?: boolean;
  project_id: number;
}

/** app -> backend (writes only) */
const toWriteDto = (c: ProjectCollectionInput | ProjectCollection): CollectionWriteDto => ({
  ...("id" in c && c.id != null ? { id: c.id } : {}),
  name: c.name,
  auth_required: c.required,
  project_id: c.projectId,
});

export const ProjectCollectionEndpoints = {
  list: "/api/backend/user-panel/getAllProjectCollections",
  create: "/api/backend/user-panel/insertProjectCollection",
  update: "/api/backend/user-panel/updateProjectCollection",
  remove: "/api/backend/user-panel/deleteProjectCollection",
};

function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

/** Throws unless data contains an id, so the slice is never patched on a doubtful response */
function requireId(body: ApiResponse<{ id: number }[]>, what: string): number {
  const id = unwrap(body)?.[0]?.id;
  if (id == null) throw new Error(`The server did not confirm the ${what} (no id returned)`);
  return id;
}

export const projectCollectionsApi = {
  /** The list already comes back as { id, name, projectId, required }, so no mapping */
  async list(projectId: number): Promise<ProjectCollection[]> {
    const { data } = await api.get<ApiResponse<(ProjectCollection | null)[]>>(ProjectCollectionEndpoints.list, { params: { projectId } });
    return (unwrap(data) ?? []).filter((c): c is ProjectCollection => c != null && c.id != null);
  },
  async create(input: ProjectCollectionInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(ProjectCollectionEndpoints.create, toWriteDto(input));
    return requireId(data, "new collection");
  },
  async update(collection: ProjectCollection): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(ProjectCollectionEndpoints.update, toWriteDto(collection));
    requireId(data, "update");
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(ProjectCollectionEndpoints.remove, { data: { id } });
    requireId(data, "delete");
  },
};