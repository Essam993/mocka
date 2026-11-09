
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { workspaceApi } from "../services/workspaceApi";
import { Workspace, WorkspaceInput } from "../../types/workspace";

interface FetchWorkspacesPayload {
    mockaUserId: number;
    force?: boolean;
}

interface WorkspaceState {
    items: Workspace[];
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
    saving: boolean;
    deletingIds: number[];
    currentMockaUserId: number | null;
    activeFetchRequestId: string | null;
}

interface UpdateWorkspacePayload extends Workspace {
    id: number;
}

const initialState: WorkspaceState = {
    items: [],
    status: "idle",
    error: null,
    saving: false,
    deletingIds: [],
    currentMockaUserId: null,
    activeFetchRequestId: null,
};

// ==============================
// FETCH WORKSPACES
// ==============================

export const fetchWorkspaces = createAsyncThunk<
    Workspace[],
    FetchWorkspacesPayload,
    { rejectValue: string }
>(
    "workspaces/fetch",
    async ({ mockaUserId }, { rejectWithValue }) => {
        try {
            return await workspaceApi.list(mockaUserId);
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to fetch workspaces"
            );
        }
    }
);

// ==============================
// CREATE WORKSPACE
// ==============================

export const createWorkspace = createAsyncThunk<
    Workspace,
    WorkspaceInput,
    { rejectValue: string }
>(
    "workspaces/create",
    async (input, { rejectWithValue }) => {
        try {
            const id = await workspaceApi.create(input);

            return {
                ...input,
                id,
            };
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to create workspace"
            );
        }
    }
);

// ==============================
// UPDATE WORKSPACE
// ==============================

export const updateWorkspace = createAsyncThunk<
    Workspace,
    UpdateWorkspacePayload,
    { rejectValue: string }
>(
    "workspaces/update",
    async (workspace, { rejectWithValue }) => {
        try {
            await workspaceApi.update(workspace);
            return workspace;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to update workspace"
            );
        }
    }
);

// ==============================
// DELETE WORKSPACE
// ==============================

export const deleteWorkspace = createAsyncThunk<
    number,
    number,
    { rejectValue: string }
>(
    "workspaces/delete",
    async (id, { rejectWithValue }) => {
        try {
            return await workspaceApi.remove(id);
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error
                    ? error.message
                    : "Failed to delete workspace"
            );
        }
    }
);

// ==============================
// SLICE
// ==============================

const workspaceSlice = createSlice({
    name: "workspaces",
    initialState,

    reducers: {
        clearWorkspaces(state) {
            state.items = [];
            state.status = "idle";
            state.error = null;
            state.currentMockaUserId = null;
            state.activeFetchRequestId = null;
        },
    },

    extraReducers: (builder) => {
        builder

            // FETCH
            .addCase(fetchWorkspaces.pending, (state, action) => {
                const { mockaUserId } = action.meta.arg;

                if (state.currentMockaUserId !== mockaUserId) {
                    state.items = [];
                }

                state.currentMockaUserId = mockaUserId;
                state.activeFetchRequestId = action.meta.requestId;
                state.status = "loading";
                state.error = null;
            })

            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                if (
                    state.activeFetchRequestId !== action.meta.requestId ||
                    state.currentMockaUserId !== action.meta.arg.mockaUserId
                ) {
                    return;
                }

                state.items = action.payload;
                state.status = "succeeded";
                state.error = null;
                state.activeFetchRequestId = null;
            })

            .addCase(fetchWorkspaces.rejected, (state, action) => {
                if (
                    state.activeFetchRequestId !== action.meta.requestId ||
                    state.currentMockaUserId !== action.meta.arg.mockaUserId
                ) {
                    return;
                }

                state.status = "failed";
                state.error =
                    action.payload ||
                    action.error.message ||
                    "Failed to fetch workspaces";

                state.activeFetchRequestId = null;
            })

            // CREATE
            .addCase(createWorkspace.pending, (state) => {
                state.saving = true;
            })

            .addCase(createWorkspace.fulfilled, (state, action) => {
                state.saving = false;

                if (
                    state.currentMockaUserId === action.payload.userId
                ) {
                    state.items.unshift(action.payload);
                }
            })

            .addCase(createWorkspace.rejected, (state) => {
                state.saving = false;
            })

            // UPDATE
            .addCase(updateWorkspace.pending, (state) => {
                state.saving = true;
            })

            .addCase(updateWorkspace.fulfilled, (state, action) => {
                state.saving = false;

                const index = state.items.findIndex(
                    (workspace) => workspace.id === action.payload.id
                );

                if (
                    index !== -1 &&
                    state.currentMockaUserId === action.payload.userId
                ) {
                    state.items[index] = action.payload;
                }
            })

            .addCase(updateWorkspace.rejected, (state) => {
                state.saving = false;
            })

            // DELETE
            .addCase(deleteWorkspace.pending, (state, action) => {
                if (!state.deletingIds.includes(action.meta.arg)) {
                    state.deletingIds.push(action.meta.arg);
                }
            })

            .addCase(deleteWorkspace.fulfilled, (state, action) => {
                state.deletingIds = state.deletingIds.filter(
                    (id) => id !== action.payload
                );

                state.items = state.items.filter(
                    (workspace) => workspace.id !== action.payload
                );
            })

            .addCase(deleteWorkspace.rejected, (state, action) => {
                state.deletingIds = state.deletingIds.filter(
                    (id) => id !== action.meta.arg
                );
            });
    },
});

// ==============================
// EXPORTS
// ==============================

// Named actions
export const { clearWorkspaces } = workspaceSlice.actions;

// Named reducer
export const workspaceReducer = workspaceSlice.reducer;

// Default reducer
export default workspaceReducer;
