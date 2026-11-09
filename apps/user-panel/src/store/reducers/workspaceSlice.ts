import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { workspaceApi } from "../services/workspaceApi";
import { Workspace, WorkspaceInput } from "../../types/workspace";

export interface WorkspacesState {
  items: Workspace[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: WorkspacesState = { items: [], status: "idle", error: null, saving: false, deletingIds: [] };

type Rejected = { rejectValue: string };

export const fetchWorkspaces = createAsyncThunk<Workspace[], { force?: boolean } | undefined, Rejected>(
  "workspaces/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await workspaceApi.list();
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { status } = (getState() as { workspaces: WorkspacesState }).workspaces;
      if (status === "loading") return false;
      return !!arg?.force || status === "idle" || status === "failed";
    },
  },
);

export const createWorkspace = createAsyncThunk<Workspace, WorkspaceInput, Rejected>("workspaces/create", async (input, { rejectWithValue }) => {
  try {
    const id = await workspaceApi.create(input);
    return { ...input, id };
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateWorkspace = createAsyncThunk<Workspace, Workspace, Rejected>("workspaces/update", async (workspace, { rejectWithValue }) => {
  try {
    await workspaceApi.update(workspace);
    return workspace;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteWorkspace = createAsyncThunk<number, number, Rejected>("workspaces/delete", async (id, { rejectWithValue }) => {
  try {
    await workspaceApi.remove(id);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const slice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchWorkspaces.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchWorkspaces.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchWorkspaces.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload ?? "Could not load workspaces";
      })
      .addCase(createWorkspace.pending, (s) => void (s.saving = true))
      .addCase(createWorkspace.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload);
      })
      .addCase(createWorkspace.rejected, (s) => void (s.saving = false))
      .addCase(updateWorkspace.pending, (s) => void (s.saving = true))
      .addCase(updateWorkspace.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((w) => (w.id === a.payload.id ? { ...w, ...a.payload } : w));
      })
      .addCase(updateWorkspace.rejected, (s) => void (s.saving = false))
      .addCase(deleteWorkspace.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteWorkspace.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((w) => w.id !== a.payload);
      })
      .addCase(deleteWorkspace.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const workspaceReducer = slice.reducer;