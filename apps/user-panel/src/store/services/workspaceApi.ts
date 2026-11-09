import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { Workspace, WorkspaceInput } from "../../types/workspace";

export const workspaceEndpoints = {
  list: "/api/backend/user-panel/getUserWorkspaces",
  create: "/api/backend/user-panel/insertUserWorkspace", // ★ confirm
  update: "/api/backend/user-panel/updateUserWorkspace", // ★ confirm (PUT)
  remove: "/api/backend/user-panel/deleteUserWorkspace", // ★ confirm (DELETE)
};

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

export const workspaceApi = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get<ApiResponse<(Workspace | null)[]>>(workspaceEndpoints.list);
    return (unwrap(data) ?? []).filter((w): w is Workspace => w != null && w.id != null);
  },
  async create(input: WorkspaceInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(
      workspaceEndpoints.create,
      input,
    );

    return requireId(data, "new workspace");
  },
  async update(workspace: Workspace): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(workspaceEndpoints.update, workspace); // ★ payload
    requireId(data, "update");
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(workspaceEndpoints.remove, { data: { id } });
    requireId(data, "delete");
  },
};