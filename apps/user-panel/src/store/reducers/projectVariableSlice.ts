import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@repo/shared";
import { projectVariableApi } from "../services/projectVariableApi";
import { ProjectVariable, ProjectVariableInput } from "../../types/projectVariable";

export interface ProjectVariablesState {
  items: ProjectVariable[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  /** which project the current `items` belong to */
  loadedProjectId: number | null;
  saving: boolean;
  deletingIds: number[];
}

const initialState: ProjectVariablesState = {
  items: [],
  status: "idle",
  error: null,
  loadedProjectId: null,
  saving: false,
  deletingIds: [],
};

type Rejected = { rejectValue: string };

/** A different projectId always fetches. The same one is skipped unless { force: true }. */
export const fetchProjectVariables = createAsyncThunk<ProjectVariable[], { projectId: number; force?: boolean }, Rejected>(
  "projectVariables/fetch",
  async ({ projectId }, { rejectWithValue }) => {
    try {
      return await projectVariableApi.list(projectId);
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
  {
    condition: ({ projectId, force }, { getState }) => {
      const { status, loadedProjectId } = (getState() as { projectVariables: ProjectVariablesState }).projectVariables;
      if (loadedProjectId !== projectId) return true;
      if (status === "loading") return false;
      return !!force || status === "idle" || status === "failed";
    },
  },
);

export const createProjectVariable = createAsyncThunk<ProjectVariable, ProjectVariableInput, Rejected>(
  "projectVariables/create",
  async (input, { rejectWithValue }) => {
    try {
      const id = await projectVariableApi.create(input); // throws without an id, so `items` is never patched
      return { ...input, id };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const updateProjectVariable = createAsyncThunk<ProjectVariable, ProjectVariable, Rejected>(
  "projectVariables/update",
  async (variable, { rejectWithValue }) => {
    try {
      await projectVariableApi.update(variable);
      return variable;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const deleteProjectVariable = createAsyncThunk<number, number, Rejected>(
  "projectVariables/delete",
  async (id, { rejectWithValue }) => {
    try {
      await projectVariableApi.remove(id);
      return id;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

const slice = createSlice({
  name: "projectVariables",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProjectVariables.pending, (s, a) => {
      s.status = "loading";
      s.error = null;
      if (s.loadedProjectId !== a.meta.arg.projectId) s.items = []; // don't flash another project's variables
      s.loadedProjectId = a.meta.arg.projectId;
    })
      .addCase(fetchProjectVariables.fulfilled, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return; // stale response
        s.status = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchProjectVariables.rejected, (s, a) => {
        if (a.meta.arg.projectId !== s.loadedProjectId) return;
        s.status = "failed";
        s.error = a.payload ?? "Could not load variables";
      })
      .addCase(createProjectVariable.pending, (s) => void (s.saving = true))
      .addCase(createProjectVariable.fulfilled, (s, a) => {
        s.saving = false;
        s.items.unshift(a.payload);
      })
      .addCase(createProjectVariable.rejected, (s) => void (s.saving = false))
      .addCase(updateProjectVariable.pending, (s) => void (s.saving = true))
      .addCase(updateProjectVariable.fulfilled, (s, a) => {
        s.saving = false;
        s.items = s.items.map((v) => (v.id === a.payload.id ? a.payload : v));
      })
      .addCase(updateProjectVariable.rejected, (s) => void (s.saving = false))
      .addCase(deleteProjectVariable.pending, (s, a) => void s.deletingIds.push(a.meta.arg))
      .addCase(deleteProjectVariable.fulfilled, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.payload);
        s.items = s.items.filter((v) => v.id !== a.payload);
      })
      .addCase(deleteProjectVariable.rejected, (s, a) => {
        s.deletingIds = s.deletingIds.filter((id) => id !== a.meta.arg);
      });
  },
});

export const projectVariablesReducer = slice.reducer;