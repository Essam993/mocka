
import { api } from "@repo/shared";
import { ApiResponse } from "../../types/types";
import { Workspace, WorkspaceInput } from "../../types/workspace";

export const workspaceEndpoints = {
    list: "/api/backend/admin-panel/getUserWorkspaces",
    create: "/api/backend/admin-panel/insertUserWorkspace",
    update: "/api/backend/admin-panel/updateUserWorkspace",
    remove: "/api/backend/admin-panel/deleteUserWorkspace",
};

function unwrap<T>(body: ApiResponse<T>): T {
    if (
        body.status &&
        body.status.toUpperCase() !== "SUCCESS"
    ) {
        throw new Error(body.message || "Request failed");
    }

    return body.data;
}

function requireId(
    body: ApiResponse<{ id: number }[]>,
    action: string
): number {
    const id = unwrap(body)?.[0]?.id;

    if (id == null) {
        throw new Error(
            `The server did not confirm the ${action} (no ID returned)`
        );
    }

    return id;
}

export const workspaceApi = {
    async list(mockaUserId: number): Promise<Workspace[]> {
        const { data } = await api.get<
            ApiResponse<(Workspace | null)[]>
        >(workspaceEndpoints.list, {
            params: { mockaUserId },
        });

        return (unwrap(data) ?? []).filter(
            (workspace): workspace is Workspace =>
                workspace != null && workspace.id != null
        );
    },

    async create(input: WorkspaceInput): Promise<number> {
        const { data } = await api.post<
            ApiResponse<{ id: number }[]>
        >(workspaceEndpoints.create, input);

        return requireId(data, "workspace creation");
    },

    async update(
        workspace: Workspace
    ): Promise<number> {
        const { data } = await api.put<
            ApiResponse<{ id: number }[]>
        >(workspaceEndpoints.update, workspace);

        return requireId(data, "workspace update");
    },

    async remove(id: number): Promise<number> {
        const { data } = await api.delete<
            ApiResponse<{ id: number }[]>
        >(workspaceEndpoints.remove, {
            data: { id },
        });

        return requireId(data, "workspace deletion");
    },
};
