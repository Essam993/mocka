import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { UserProject, UserProjectInput } from "../../types/userProject";

export const userProjectEndpoints = {
  list: "/api/backend/user-panel/getUserProjects", // ★ use your real portal path
  create: "/api/backend/user-panel/insertUserProject",
  update: "/api/backend/user-panel/updateUserProject",
  remove: "/api/backend/user-panel/deleteUserProject",
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

export const userProjectApi = {
  /** The backend reads the user from the token, so no arguments */
  async list(workspaceId?: number): Promise<UserProject[]> {
    const { data } = await api.get<ApiResponse<(UserProject | null)[]>>(userProjectEndpoints.list, {
      params: workspaceId != null ? { workspaceId } : undefined,
    });
    // some backends return [null] when there are no rows
    return (unwrap(data) ?? []).filter((p): p is UserProject => p != null && p.id != null);
  },
  async create(input: UserProjectInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(userProjectEndpoints.create, input);
    return requireId(data, "new project");
  },
  async update(userProject: UserProject): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(userProjectEndpoints.update, userProject);
    requireId(data, "update");
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(userProjectEndpoints.remove, { data: { id } });
    requireId(data, "delete");
  },
};