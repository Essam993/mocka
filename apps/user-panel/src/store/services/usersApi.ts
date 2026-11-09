import { api } from "@repo/shared";
import type { User, UserInput } from "../../types/userTypes";
import { ApiResponse } from "../../types/types";

/**
 * ★ Change these paths/methods to match your backend.
 * They all use the shared `api` client, so every request automatically carries
 * the `App-Key` header (and `Authorization: Bearer <token>`).
 */
export const usersEndpoints = {
  list: "/api/backend/admin-panel/getAllUsers", // GET
  create: "/api/backend/admin-panel/createUser", // POST   body: all fields except id
  update: "/api/backend/admin-panel/updateUser", // PUT    body: all fields including id
  remove: "/api/backend/admin-panel/deleteUser", // DELETE body: { id }
};

/** Your backend answers { data, message, status: "SUCCESS" } — anything else is an error. */
function unwrap<T>(body: ApiResponse<T>): T {
  if (body.status && body.status.toUpperCase() !== "SUCCESS") throw new Error(body.message || "Request failed");
  return body.data;
}

export const usersApi = {
  async list(): Promise<User[]> {
    const { data } = await api.get<ApiResponse<User[]>>(usersEndpoints.list);
    return unwrap(data) ?? [];
  },
  /** Returns the new id */
  async create(input: UserInput): Promise<number> {
    const { data } = await api.post<ApiResponse<{ id: number }[]>>(usersEndpoints.create, input);
    const id = unwrap(data)?.[0]?.id;
    if (id == null) throw new Error("The server did not return the new user id");
    return id;
  },
  async update(user: User): Promise<void> {
    const { data } = await api.put<ApiResponse<{ id: number }[]>>(usersEndpoints.update, user);
    unwrap(data);
  },
  async remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiResponse<{ id: number }[]>>(usersEndpoints.remove, { data: { id } });
    unwrap(data);
  },
};
