import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { UserProject, UserProjectInput } from "../../types/userProject";

/**
 * ★ Change these paths/methods to match your backend.
 * They all use the shared `api` client, so every request automatically carries
 * the `App-Key` header (and `Authorization: Bearer <token>`).
 */
export const userProjectEndpoints = {
  list: "/api/backend/admin-panel/getUserProjects", // GET
  create: "/api/backend/admin-panel/insertUserProject", // POST   body: all fields except id
  update: "/api/backend/admin-panel/updateUserProject", // PUT    body: all fields including id
  remove: "/api/backend/admin-panel/deleteUserProject", // DELETE body: { id }
};

/** Your backend answers { data, message, status: "SUCCESS" } — anything else is an error. */
function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

export const userProjectApi = {
  async list(userId: number): Promise<UserProject[]> {
    const { data } = await api.get<ApiResponse<UserProject[]>>(
      userProjectEndpoints.list,
      { params: { userId } },
    );
    return unwrap(data) ?? [];
  },
  /** Returns the new id */
  async create(input: UserProjectInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(userProjectEndpoints.create, input);
    const id = unwrap(data)?.[0]?.id;
    if (id == null) throw new Error("The server did not return the new user project id");
    return id;
  },
  async update(userProject: UserProject): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(userProjectEndpoints.update, userProject);
    unwrap(data);
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(userProjectEndpoints.remove, { data: { id } });
    unwrap(data);
  },
};
